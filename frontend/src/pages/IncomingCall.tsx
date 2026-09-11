import { Phone, Video, PhoneOff } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useCall } from "../context/CallContext";

export function IncomingCall() {
  const { incoming, acceptIncoming, rejectIncoming } = useCall();
  if (!incoming) return null;

  return (
    <div className="safe-top safe-bottom flex h-full flex-col items-center justify-between bg-base px-8 py-16">
      <div />
      <div className="flex flex-col items-center animate-fadeIn">
        <div className="relative mb-6">
          <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulseRing" />
          <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulseRing [animation-delay:0.6s]" />
          <Avatar name={incoming.fromName} size={128} />
        </div>
        <h2 className="font-display text-[24px] font-semibold tracking-tight">{incoming.fromName}</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          Incoming {incoming.mode === "video" ? "video" : "audio"} call
        </p>
      </div>

      <div className="flex w-full items-center justify-between px-4">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={rejectIncoming}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-bad text-white shadow-soft active:scale-90 transition-transform"
          >
            <PhoneOff size={26} />
          </button>
          <span className="text-[12px] text-muted">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={acceptIncoming}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-good text-white shadow-soft active:scale-90 transition-transform"
          >
            {incoming.mode === "video" ? <Video size={26} /> : <Phone size={26} />}
          </button>
          <span className="text-[12px] text-muted">Accept</span>
        </div>
      </div>
    </div>
  );
}
