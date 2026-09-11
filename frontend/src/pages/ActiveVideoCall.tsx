import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  MoreHorizontal,
  PhoneOff,
  RotateCcw,
  Gauge,
  SwitchCamera,
} from "lucide-react";
import { useCall } from "../context/CallContext";
import { NetworkBadge } from "../components/NetworkBadge";
import { DataUsageBadge } from "../components/DataUsageBadge";
import { CallControlButton } from "../components/CallControlButton";
import { Avatar } from "../components/Avatar";
import { formatDuration } from "../utils/format";
import { mediaErrorMessage } from "../services/webrtc";

export function ActiveVideoCall() {
  const {
    peer,
    state,
    durationSec,
    localStream,
    remoteStream,
    networkTier,
    totalBytes,
    dataSaver,
    muted,
    cameraOn,
    mediaError,
    toggleMute,
    toggleCamera,
    toggleDataSaver,
    endCall,
    switchToAudio,
    switchCamera,
    dismissMediaError,
  } = useCall();

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [swapped, setSwapped] = useState(false); // double-tap layout swap
  const [selfPos, setSelfPos] = useState({ x: 16, y: 90 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  function scheduleHide() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 4500);
  }

  function handleTapScreen() {
    setControlsVisible(true);
    scheduleHide();
  }

  function handleDoubleTapRemote() {
    setSwapped((s) => !s);
  }

  function onDragStart(clientX: number, clientY: number) {
    dragState.current = { dragging: true, startX: clientX, startY: clientY, origX: selfPos.x, origY: selfPos.y };
  }
  function onDragMove(clientX: number, clientY: number) {
    if (!dragState.current.dragging) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    setSelfPos({ x: Math.max(8, dragState.current.origX - dx), y: Math.max(8, dragState.current.origY + dy) });
  }
  function onDragEnd() {
    dragState.current.dragging = false;
  }

  if (!peer) return null;

  const isRinging = state === "dialing" || state === "connecting";
  const isReconnecting = state === "reconnecting";

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      onClick={handleTapScreen}
      onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
      onMouseUp={onDragEnd}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onDragEnd}
    >
      {/* Remote video (or waiting state) */}
      <div className="absolute inset-0" onDoubleClick={handleDoubleTapRemote}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${swapped ? "scale-x-[-1]" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-elevated to-base">
            <Avatar name={peer.displayName} seed={peer.avatarSeed} size={120} />
            <p className="mt-5 font-display text-[20px] font-medium text-ink">{peer.displayName}</p>
            <p className="mt-1 text-[14px] text-muted animate-pulse">
              {state === "dialing" ? "Calling…" : "Connecting…"}
            </p>
          </div>
        )}
      </div>

      {isReconnecting && (
        <div className="absolute inset-x-0 top-24 z-30 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur-md animate-fadeIn">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warn" />
            <span className="text-[13px] text-white">Reconnecting…</span>
          </div>
        </div>
      )}

      {/* Floating self view (draggable) */}
      {localStream && cameraOn && (
        <div
          className="absolute z-20 h-36 w-24 overflow-hidden rounded-2xl border border-white/10 shadow-soft cursor-grab active:cursor-grabbing sm:h-44 sm:w-32"
          style={{ right: selfPos.x, bottom: selfPos.y }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onDragStart(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            onDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
        </div>
      )}

      {/* Top bar */}
      <div
        className={`safe-top absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div>
          <p className="text-[15px] font-medium text-white">{peer.displayName}</p>
          <p className="text-[12px] text-white/60">
            {isRinging ? "Ringing…" : isReconnecting ? "Reconnecting…" : formatDuration(durationSec)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NetworkBadge tier={networkTier} />
        </div>
      </div>

      <div
        className={`absolute inset-x-0 z-20 flex justify-center transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 52px)" }}
      >
        <DataUsageBadge totalBytes={totalBytes} dataSaverOn={dataSaver} />
      </div>

      {/* Bottom controls */}
      <div
        className={`safe-bottom absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-5 px-6 pb-8 pt-10 transition-all duration-300 ${
          controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
      >
        {showMore && (
          <div className="mb-1 flex items-center gap-6 rounded-2xl bg-black/50 px-5 py-3 backdrop-blur-md animate-popIn">
            <button onClick={switchToAudio} className="flex flex-col items-center gap-1 text-white/80">
              <RotateCcw size={20} />
              <span className="text-[11px]">Audio only</span>
            </button>
            <button onClick={switchCamera} className="flex flex-col items-center gap-1 text-white/80">
              <SwitchCamera size={20} />
              <span className="text-[11px]">Flip camera</span>
            </button>
            <div className="flex flex-col items-center gap-1 text-white/80">
              <Gauge size={20} />
              <span className="text-[11px]">{dataSaver ? "Saver on" : "Saver off"}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <CallControlButton onClick={toggleMute} active={muted} label={muted ? "Unmute" : "Mute"}>
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </CallControlButton>
          <CallControlButton onClick={toggleCamera} active={!cameraOn} label={cameraOn ? "Camera" : "Off"}>
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </CallControlButton>
          <CallControlButton onClick={() => setSpeakerOn((s) => !s)} active={!speakerOn} label="Speaker">
            {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </CallControlButton>
          <CallControlButton onClick={toggleDataSaver} active={dataSaver} label="Data saver">
            <Gauge size={20} />
          </CallControlButton>
          <CallControlButton onClick={() => setShowMore((s) => !s)} active={showMore} label="More">
            <MoreHorizontal size={20} />
          </CallControlButton>
          <CallControlButton onClick={endCall} danger label="End">
            <PhoneOff size={20} />
          </CallControlButton>
        </div>
      </div>

      {mediaError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-8">
          <div className="max-w-xs rounded-2xl bg-elevated p-6 text-center animate-popIn">
            <p className="text-[15px] text-ink">{mediaErrorMessage(mediaError)}</p>
            <button
              onClick={dismissMediaError}
              className="mt-5 h-11 w-full rounded-xl2 bg-accent text-[14px] font-medium text-white"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
