import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { CallManager } from "../services/callManager";
import { MediaError } from "../services/webrtc";
import { CallMode, CallScreenState, NetworkTier, User } from "../types";
import { mockDirectory } from "../services/mockData";
import { useAuth } from "./AuthContext";

interface IncomingCallInfo {
  roomId: string;
  fromUserId: string;
  fromName: string;
  mode: CallMode;
}

interface CallContextValue {
  state: CallScreenState;
  mode: CallMode;
  peer: User | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  networkTier: NetworkTier;
  totalBytes: number;
  bytesPerSecond: number;
  durationSec: number;
  incoming: IncomingCallInfo | null;
  mediaError: MediaError | null;
  muted: boolean;
  cameraOn: boolean;
  dataSaver: boolean;
  startCall: (peer: User, mode: CallMode) => void;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleDataSaver: () => void;
  switchToAudio: () => void;
  switchCamera: () => void;
  dismissMediaError: () => void;
  resetToIdle: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const managerRef = useRef<CallManager | null>(null);

  const [state, setState] = useState<CallScreenState>("idle");
  const [mode, setMode] = useState<CallMode>("video");
  const [peer, setPeer] = useState<User | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [networkTier, setNetworkTier] = useState<NetworkTier>("good");
  const [totalBytes, setTotalBytes] = useState(0);
  const [bytesPerSecond, setBytesPerSecond] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [mediaError, setMediaError] = useState<MediaError | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  const callStartRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const peerRef = useRef<User | null>(null);
  const modeRef = useRef<CallMode>("video");
  const directionRef = useRef<"incoming" | "outgoing">("outgoing");

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!user) return;
    const manager = new CallManager({
      onStateChange: (s) => {
        setState(s);
        if (s === "connected" && callStartRef.current === null) {
          callStartRef.current = Date.now();
          durationTimerRef.current = window.setInterval(() => {
            setDurationSec(Math.floor((Date.now() - (callStartRef.current || Date.now())) / 1000));
          }, 1000);
        }
        if (s === "ended" || s === "idle") {
          if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
          if (callStartRef.current && peerRef.current) {
            mockDirectory.logCall({
              id: `h_${Date.now()}`,
              peer: peerRef.current,
              direction: directionRef.current,
              mode: modeRef.current,
              timestamp: callStartRef.current,
              durationSec: Math.floor((Date.now() - callStartRef.current) / 1000),
            });
          }
          callStartRef.current = null;
          window.setTimeout(() => {
            setLocalStream(null);
            setRemoteStream(null);
            setDurationSec(0);
            setPeer(null);
            setTotalBytes(0);
            setBytesPerSecond(0);
            setNetworkTier("good");
          }, 300);
        }
      },
      onRemoteStream: setRemoteStream,
      onLocalStream: setLocalStream,
      onNetworkTierChange: setNetworkTier,
      onDataUsageTick: (bytes, bps) => {
        setTotalBytes(bytes);
        setBytesPerSecond(bps);
      },
      onMediaError: setMediaError,
      onIncomingCall: (payload) => setIncoming(payload),
      onRemoteEnded: () => setState("ended"),
    });
    manager.init(user);
    managerRef.current = manager;
    return () => manager.destroy();
  }, [user?.id]);

  function startCall(target: User, callMode: CallMode) {
    directionRef.current = "outgoing";
    setPeer(target);
    setMode(callMode);
    setMuted(false);
    setCameraOn(callMode === "video");
    managerRef.current?.startCall(target, callMode);
  }

  function acceptIncoming() {
    if (!incoming) return;
    directionRef.current = "incoming";
    const peerUser = mockDirectory.allUsers().find((u) => u.id === incoming.fromUserId) || {
      id: incoming.fromUserId,
      username: incoming.fromUserId,
      displayName: incoming.fromName,
      avatarSeed: incoming.fromName,
      status: "online" as const,
    };
    setPeer(peerUser);
    setMode(incoming.mode);
    setCameraOn(incoming.mode === "video");
    managerRef.current?.acceptCall(incoming.roomId, incoming.fromUserId, incoming.mode);
    setIncoming(null);
  }

  function rejectIncoming() {
    if (!incoming) return;
    const peerUser = mockDirectory.allUsers().find((u) => u.id === incoming.fromUserId) || {
      id: incoming.fromUserId,
      username: incoming.fromUserId,
      displayName: incoming.fromName,
      avatarSeed: incoming.fromName,
      status: "online" as const,
    };
    mockDirectory.logCall({
      id: `h_${Date.now()}`,
      peer: peerUser,
      direction: "missed",
      mode: incoming.mode,
      timestamp: Date.now(),
      durationSec: 0,
    });
    managerRef.current?.rejectCall(incoming.roomId, incoming.fromUserId);
    setIncoming(null);
  }

  function endCall() {
    managerRef.current?.endCall();
  }

  function toggleMute() {
    setMuted((m) => {
      managerRef.current?.toggleMute(!m);
      return !m;
    });
  }

  function toggleCamera() {
    setCameraOn((c) => {
      managerRef.current?.toggleCamera(!c);
      return !c;
    });
  }

  function toggleDataSaver() {
    setDataSaver((d) => {
      managerRef.current?.setDataSaver(!d);
      return !d;
    });
  }

  function switchToAudio() {
    setMode("audio");
    setCameraOn(false);
    managerRef.current?.switchToAudioOnly();
  }

  function switchCamera() {
    managerRef.current?.switchCamera();
  }

  function dismissMediaError() {
    setMediaError(null);
  }

  function resetToIdle() {
    setState("idle");
  }

  const value = useMemo<CallContextValue>(
    () => ({
      state,
      mode,
      peer,
      localStream,
      remoteStream,
      networkTier,
      totalBytes,
      bytesPerSecond,
      durationSec,
      incoming,
      mediaError,
      muted,
      cameraOn,
      dataSaver,
      startCall,
      acceptIncoming,
      rejectIncoming,
      endCall,
      toggleMute,
      toggleCamera,
      toggleDataSaver,
      switchToAudio,
      switchCamera,
      dismissMediaError,
      resetToIdle,
    }),
    [
      state,
      mode,
      peer,
      localStream,
      remoteStream,
      networkTier,
      totalBytes,
      bytesPerSecond,
      durationSec,
      incoming,
      mediaError,
      muted,
      cameraOn,
      dataSaver,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
