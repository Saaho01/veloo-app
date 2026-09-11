import { useCall } from "../context/CallContext";
import { IncomingCall } from "../pages/IncomingCall";
import { ActiveVideoCall } from "../pages/ActiveVideoCall";
import { AudioCall } from "../pages/AudioCall";

export function CallOverlay() {
  const { incoming, state, mode } = useCall();

  const isActiveCall = ["dialing", "connecting", "connected", "reconnecting"].includes(state);

  if (incoming && !isActiveCall) {
    return (
      <div className="fixed inset-0 z-50">
        <IncomingCall />
      </div>
    );
  }

  if (isActiveCall) {
    return (
      <div className="fixed inset-0 z-50">
        {mode === "video" ? <ActiveVideoCall /> : <AudioCall />}
      </div>
    );
  }

  return null;
}
