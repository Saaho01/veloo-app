import { useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Video, PhoneOff } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { NetworkBadge } from "../components/NetworkBadge";
import { useCall } from "../context/CallContext";
import { formatDuration } from "../utils/format";
import { CallControlButton } from "../components/CallControlButton";

export function AudioCall() {
  const { peer, state, durationSec, muted, networkTier, remoteStream, toggleMute, endCall } = useCall();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  if (!peer) return null;

  return (
    <div className="safe-top safe-bottom flex h-full flex-col items-center justify-between bg-base px-8 py-14">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="flex flex-col items-center gap-2">
        <NetworkBadge tier={networkTier} />
      </div>

      <div className="flex flex-col items-center animate-fadeIn">
        <Avatar name={peer.displayName} seed={peer.avatarSeed} size={132} />
        <h2 className="mt-6 font-display text-[24px] font-semibold tracking-tight">{peer.displayName}</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          {state === "connecting" ? "Connecting…" : state === "reconnecting" ? "Reconnecting…" : formatDuration(durationSec)}
        </p>
      </div>

      <div className="flex w-full items-center justify-center gap-6">
        <CallControlButton onClick={toggleMute} active={muted} label={muted ? "Unmute" : "Mute"}>
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </CallControlButton>
        <CallControlButton onClick={() => {}} label="Speaker">
          <Volume2 size={22} />
        </CallControlButton>
        <CallControlButton onClick={() => {}} label="Video">
          <Video size={22} />
        </CallControlButton>
        <CallControlButton onClick={endCall} danger label="End">
          <PhoneOff size={22} />
        </CallControlButton>
      </div>
    </div>
  );
}
