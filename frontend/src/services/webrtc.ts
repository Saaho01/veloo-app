import { QualityProfile } from "../types";
import { StatSample } from "./networkMonitor";
import { ByteCounters } from "./dataUsage";

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Production: add your TURN server here, e.g.
  // { urls: "turn:turn.yourdomain.com:3478", username: "...", credential: "..." },
];

export type ConnectionPhase =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed"
  | "closed";

interface WebRTCManagerCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionPhaseChange: (phase: ConnectionPhase) => void;
  onLocalIceCandidate: (candidate: RTCIceCandidate) => void;
  onNeedRenegotiation: () => void;
  onStats?: (sample: StatSample, bytes: ByteCounters) => void;
}

/**
 * Wraps a single RTCPeerConnection and exposes the operations the call UI
 * and adaptation logic need, without any signaling-transport knowledge.
 * One instance = one active call (1:1). For group calls, CallManager owns
 * one WebRTCManager per remote participant (mesh topology, suitable for
 * small groups; swap for an SFU for larger rooms).
 */
export class WebRTCManager {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private senders: { video?: RTCRtpSender; audio?: RTCRtpSender } = {};
  private statsTimer: number | null = null;
  private cb: WebRTCManagerCallbacks;
  private lastStatsBytes = { sent: 0, received: 0, ts: 0 };
  private iceRestartAttempts = 0;
  private audioOnly = false;

  constructor(callbacks: WebRTCManagerCallbacks) {
    this.cb = callbacks;
    this.pc = this.createPeerConnection();
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });

    pc.onicecandidate = (event) => {
      if (event.candidate) this.cb.onLocalIceCandidate(event.candidate);
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.cb.onRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connecting":
          this.cb.onConnectionPhaseChange("connecting");
          break;
        case "connected":
          this.iceRestartAttempts = 0;
          this.cb.onConnectionPhaseChange("connected");
          break;
        case "disconnected":
          this.cb.onConnectionPhaseChange("reconnecting");
          this.scheduleIceRestart();
          break;
        case "failed":
          this.cb.onConnectionPhaseChange("failed");
          this.scheduleIceRestart();
          break;
        case "closed":
          this.cb.onConnectionPhaseChange("closed");
          break;
      }
    };

    pc.onnegotiationneeded = () => this.cb.onNeedRenegotiation();

    return pc;
  }

  private scheduleIceRestart() {
    if (this.iceRestartAttempts >= 5) return;
    const delay = Math.min(1000 * 2 ** this.iceRestartAttempts, 8000);
    this.iceRestartAttempts += 1;
    window.setTimeout(async () => {
      if (["failed", "disconnected"].includes(this.pc.connectionState)) {
        try {
          const offer = await this.pc.createOffer({ iceRestart: true });
          await this.pc.setLocalDescription(offer);
          this.cb.onNeedRenegotiation();
        } catch (err) {
          console.warn("[webrtc] ICE restart failed", err);
        }
      }
    }, delay);
  }

  async attachLocalStream(stream: MediaStream, audioOnly: boolean) {
    this.localStream = stream;
    this.audioOnly = audioOnly;
    for (const track of stream.getTracks()) {
      const sender = this.pc.addTrack(track, stream);
      if (track.kind === "video") this.senders.video = sender;
      if (track.kind === "audio") this.senders.audio = sender;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(desc);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("[webrtc] failed to add ICE candidate", err);
    }
  }

  get signalingState() {
    return this.pc.signalingState;
  }

  /**
   * Applies a quality profile to the outgoing video track using
   * RTCRtpSender.setParameters — the actual mechanism behind Data Saver and
   * automatic network adaptation (not just a UI toggle).
   */
  async applyQualityProfile(profile: QualityProfile) {
    const sender = this.senders.video;
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    const track = sender.track;
    const settings = track?.getSettings();
    const sourceWidth = settings?.width || profile.maxWidth;
    const scale = Math.max(1, sourceWidth / profile.maxWidth);

    params.encodings[0].maxBitrate = profile.maxBitrateKbps * 1000;
    params.encodings[0].maxFramerate = profile.maxFrameRate;
    params.encodings[0].scaleResolutionDownBy = scale;
    try {
      await sender.setParameters(params);
    } catch (err) {
      console.warn("[webrtc] setParameters failed", err);
    }
  }

  /** Disables the video track entirely, prioritizing audio on very poor links. */
  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  setAudioEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  currentVideoDeviceId(): string | undefined {
    return this.localStream?.getVideoTracks()[0]?.getSettings().deviceId;
  }

  async switchCamera(deviceId: string) {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    });
    const newTrack = newStream.getVideoTracks()[0];
    if (this.senders.video) await this.senders.video.replaceTrack(newTrack);
    const oldTrack = this.localStream?.getVideoTracks()[0];
    if (oldTrack) {
      this.localStream?.removeTrack(oldTrack);
      oldTrack.stop();
    }
    this.localStream?.addTrack(newTrack);
    return newTrack;
  }

  /** Polls getStats() on an interval and reports network + byte-usage samples. */
  startStatsLoop(intervalMs = 2000) {
    this.stopStatsLoop();
    this.statsTimer = window.setInterval(() => this.pollStatsOnce(), intervalMs);
  }

  stopStatsLoop() {
    if (this.statsTimer) window.clearInterval(this.statsTimer);
    this.statsTimer = null;
  }

  private async pollStatsOnce() {
    if (!this.cb.onStats) return;
    try {
      const report = await this.pc.getStats();
      let rttMs: number | null = null;
      let packetsLost = 0;
      let packetsReceived = 0;
      let jitterMs: number | null = null;
      let availableOutgoingBitrateKbps: number | null = null;
      let bytesSent = 0;
      let bytesReceived = 0;

      report.forEach((stat: any) => {
        if (stat.type === "candidate-pair" && stat.state === "succeeded" && stat.nominated) {
          if (typeof stat.currentRoundTripTime === "number") rttMs = stat.currentRoundTripTime * 1000;
          if (typeof stat.availableOutgoingBitrate === "number") {
            availableOutgoingBitrateKbps = stat.availableOutgoingBitrate / 1000;
          }
        }
        if (stat.type === "inbound-rtp" && !stat.isRemote) {
          packetsLost += stat.packetsLost || 0;
          packetsReceived += stat.packetsReceived || 0;
          if (typeof stat.jitter === "number") jitterMs = stat.jitter * 1000;
          bytesReceived += stat.bytesReceived || 0;
        }
        if (stat.type === "outbound-rtp" && !stat.isRemote) {
          bytesSent += stat.bytesSent || 0;
        }
      });

      const totalPackets = packetsLost + packetsReceived;
      const packetLossPct = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

      const sample: StatSample = { timestamp: Date.now(), rttMs, packetLossPct, availableOutgoingBitrateKbps, jitterMs };
      const bytes: ByteCounters = { bytesSent, bytesReceived, timestamp: Date.now() };
      this.cb.onStats(sample, bytes);
    } catch (err) {
      // getStats can throw transiently right after connection teardown; ignore.
    }
  }

  close() {
    this.stopStatsLoop();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc.getSenders().forEach((s) => s.track?.stop());
    this.pc.close();
  }
}

// ---------------------------------------------------------------------------
// Local media acquisition with clear, user-friendly permission handling
// ---------------------------------------------------------------------------
export type MediaError =
  | "permission-denied"
  | "no-camera"
  | "no-microphone"
  | "device-in-use"
  | "unknown";

export interface MediaResult {
  stream: MediaStream | null;
  error: MediaError | null;
  audioOnly: boolean;
}

export async function acquireLocalMedia(wantVideo: boolean): Promise<MediaResult> {
  const devices = await safeEnumerateDevices();
  const hasCamera = devices.some((d) => d.kind === "videoinput");
  const hasMic = devices.some((d) => d.kind === "audioinput");

  if (!hasMic) return { stream: null, error: "no-microphone", audioOnly: false };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: wantVideo && hasCamera ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    return { stream, error: null, audioOnly: !(wantVideo && hasCamera) };
  } catch (err: any) {
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
      return { stream: null, error: "permission-denied", audioOnly: false };
    }
    if (err?.name === "NotFoundError") {
      return { stream: null, error: wantVideo ? "no-camera" : "no-microphone", audioOnly: false };
    }
    if (err?.name === "NotReadableError") {
      return { stream: null, error: "device-in-use", audioOnly: false };
    }
    // Retry audio-only as a graceful fallback if video was requested.
    if (wantVideo) return acquireLocalMedia(false);
    return { stream: null, error: "unknown", audioOnly: false };
  }
}

async function safeEnumerateDevices(): Promise<MediaDeviceInfo[]> {
  try {
    return await navigator.mediaDevices.enumerateDevices();
  } catch {
    return [];
  }
}

export function mediaErrorMessage(error: MediaError): string {
  switch (error) {
    case "permission-denied":
      return "Camera and microphone access was denied. Enable permissions in your browser or device settings to make calls.";
    case "no-camera":
      return "No camera was found on this device. You can still make audio calls.";
    case "no-microphone":
      return "No microphone was found on this device. A microphone is required to make calls.";
    case "device-in-use":
      return "Your camera or microphone is being used by another app. Close it and try again.";
    default:
      return "Couldn't access your camera or microphone. Please check your device settings.";
  }
}
