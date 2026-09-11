import { signalingClient } from "./signaling";
import { WebRTCManager, acquireLocalMedia, MediaError } from "./webrtc";
import { NetworkAdaptationController, QUALITY_PROFILES, DATA_SAVER_PROFILES } from "./networkMonitor";
import { DataUsageTracker } from "./dataUsage";
import { CallMode, CallScreenState, NetworkTier, User } from "../types";

export interface CallManagerEvents {
  onStateChange: (state: CallScreenState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
  onNetworkTierChange: (tier: NetworkTier) => void;
  onDataUsageTick: (totalBytes: number, bytesPerSecond: number) => void;
  onMediaError: (error: MediaError) => void;
  onIncomingCall: (payload: { roomId: string; fromUserId: string; fromName: string; mode: CallMode }) => void;
  onRemoteEnded: () => void;
}

/**
 * Owns the lifecycle of a single active call: acquiring media, signaling
 * handshake, wiring the RTCPeerConnection, and continuously adapting
 * quality based on live network stats. UI components subscribe to events
 * rather than touching WebRTC/signaling primitives directly.
 */
export class CallManager {
  private webrtc: WebRTCManager | null = null;
  private events: CallManagerEvents;
  private roomId: string | null = null;
  private peerId: string | null = null;
  private mode: CallMode = "video";
  private dataSaver = false;
  private adaptation = new NetworkAdaptationController();
  private usage = new DataUsageTracker();
  private currentUser: User | null = null;
  private isCaller = false;

  constructor(events: CallManagerEvents) {
    this.events = events;
  }

  init(user: User) {
    this.currentUser = user;
    signalingClient.connect(user.id, user.displayName);
    signalingClient.on("call:incoming", (payload) => this.events.onIncomingCall(payload));
    signalingClient.on("call:accepted", () => this.beginNegotiationAsCaller());
    signalingClient.on("call:rejected", () => this.events.onStateChange("ended"));
    signalingClient.on("call:ended", () => this.teardown("ended"));
    signalingClient.on("call:peer-left", () => this.teardown("ended"));
    signalingClient.on("rtc:offer", (p) => this.handleRemoteOffer(p));
    signalingClient.on("rtc:answer", (p) => this.handleRemoteAnswer(p));
    signalingClient.on("rtc:ice-candidate", (p) => this.webrtc?.addIceCandidate(p.candidate));
    signalingClient.on("rtc:renegotiate", () => this.handleRenegotiate());
  }

  setDataSaver(enabled: boolean) {
    this.dataSaver = enabled;
    this.reapplyCurrentProfile();
  }

  get isDataSaverOn() {
    return this.dataSaver;
  }

  private profileFor(tier: NetworkTier) {
    return this.dataSaver ? DATA_SAVER_PROFILES[tier] : QUALITY_PROFILES[tier];
  }

  private reapplyCurrentProfile() {
    if (!this.webrtc) return;
    this.webrtc.applyQualityProfile(this.profileFor(this.adaptation.currentTier));
  }

  /** Caller flow: dial a peer by user id. */
  async startCall(peer: User, mode: CallMode) {
    this.isCaller = true;
    this.peerId = peer.id;
    this.mode = mode;
    this.roomId = `room_${this.currentUser?.id}_${peer.id}_${Date.now()}`;
    this.events.onStateChange("dialing");

    const media = await acquireLocalMedia(mode === "video");
    if (!media.stream) {
      this.events.onMediaError(media.error || "unknown");
      this.events.onStateChange("ended");
      return;
    }
    this.events.onLocalStream(media.stream);
    if (media.audioOnly) this.mode = "audio";

    this.webrtc = this.buildManager();
    await this.webrtc.attachLocalStream(media.stream, this.mode === "audio");

    signalingClient.emit("call:invite", { roomId: this.roomId, toUserId: peer.id, mode: this.mode });
  }

  /** Callee flow: accept an incoming invite. */
  async acceptCall(roomId: string, fromUserId: string, mode: CallMode) {
    this.isCaller = false;
    this.roomId = roomId;
    this.peerId = fromUserId;
    this.mode = mode;
    this.events.onStateChange("connecting");

    const media = await acquireLocalMedia(mode === "video");
    if (!media.stream) {
      this.events.onMediaError(media.error || "unknown");
      this.rejectCall(roomId, fromUserId);
      return;
    }
    this.events.onLocalStream(media.stream);
    if (media.audioOnly) this.mode = "audio";

    this.webrtc = this.buildManager();
    await this.webrtc.attachLocalStream(media.stream, this.mode === "audio");

    signalingClient.emit("call:accept", { roomId });
  }

  rejectCall(roomId: string, toUserId: string) {
    signalingClient.emit("call:reject", { roomId, toUserId });
  }

  endCall() {
    if (this.roomId) signalingClient.emit("call:end", { roomId: this.roomId });
    this.teardown("ended");
  }

  toggleMute(muted: boolean) {
    this.webrtc?.setAudioEnabled(!muted);
  }

  toggleCamera(enabled: boolean) {
    this.webrtc?.setVideoEnabled(enabled);
  }

  switchToAudioOnly() {
    this.mode = "audio";
    this.webrtc?.setVideoEnabled(false);
  }

  /** Cycles to the next available camera (e.g. front/back on mobile). */
  async switchCamera() {
    if (!this.webrtc) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      if (cameras.length < 2) return;
      const currentId = this.webrtc.currentVideoDeviceId();
      const currentIdx = cameras.findIndex((c) => c.deviceId === currentId);
      const next = cameras[(currentIdx + 1) % cameras.length];
      await this.webrtc.switchCamera(next.deviceId);
    } catch (err) {
      console.warn("[callManager] switchCamera failed", err);
    }
  }

  private buildManager(): WebRTCManager {
    const manager = new WebRTCManager({
      onRemoteStream: (stream) => this.events.onRemoteStream(stream),
      onConnectionPhaseChange: (phase) => {
        if (phase === "connected") this.events.onStateChange("connected");
        if (phase === "reconnecting") this.events.onStateChange("reconnecting");
        if (phase === "failed") this.events.onStateChange("reconnecting");
        if (phase === "closed") this.events.onStateChange("ended");
      },
      onLocalIceCandidate: (candidate) => {
        if (this.roomId) signalingClient.emit("rtc:ice-candidate", { roomId: this.roomId, candidate });
      },
      onNeedRenegotiation: () => this.renegotiate(),
      onStats: (sample, bytes) => {
        const { tier, changed } = this.adaptation.feed(sample);
        this.usage.push(bytes);
        this.events.onDataUsageTick(this.usage.totalBytes, this.usage.bytesPerSecond);
        if (changed) {
          this.events.onNetworkTierChange(tier);
          this.reapplyCurrentProfile();
        }
      },
    });
    manager.startStatsLoop();
    return manager;
  }

  private async beginNegotiationAsCaller() {
    if (!this.webrtc || !this.roomId) return;
    this.events.onStateChange("connecting");
    const offer = await this.webrtc.createOffer();
    signalingClient.emit("rtc:offer", { roomId: this.roomId, sdp: offer });
  }

  private async handleRemoteOffer(payload: { sdp: RTCSessionDescriptionInit }) {
    if (!this.webrtc || !this.roomId) return;
    await this.webrtc.setRemoteDescription(payload.sdp);
    const answer = await this.webrtc.createAnswer();
    signalingClient.emit("rtc:answer", { roomId: this.roomId, sdp: answer });
  }

  private async handleRemoteAnswer(payload: { sdp: RTCSessionDescriptionInit }) {
    if (!this.webrtc) return;
    await this.webrtc.setRemoteDescription(payload.sdp);
  }

  private async renegotiate() {
    if (!this.webrtc || !this.roomId || !this.isCaller) return;
    if (this.webrtc.signalingState !== "stable") return;
    const offer = await this.webrtc.createOffer();
    signalingClient.emit("rtc:offer", { roomId: this.roomId, sdp: offer });
  }

  private handleRenegotiate() {
    // Peer signaled it needs a fresh offer (e.g. after an ICE restart);
    // nothing to do here as the offer itself arrives via rtc:offer.
  }

  private teardown(finalState: CallScreenState) {
    this.webrtc?.close();
    this.webrtc = null;
    this.roomId = null;
    this.peerId = null;
    this.usage.reset();
    this.adaptation.reset();
    this.events.onStateChange(finalState);
  }

  destroy() {
    this.teardown("idle");
    signalingClient.disconnect();
  }
}
