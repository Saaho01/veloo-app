import { useMemo } from "react";
import { CallRow } from "../components/CallRow";
import { mockDirectory } from "../services/mockData";
import { useCall } from "../context/CallContext";

export function CallHistory() {
  const history = useMemo(() => mockDirectory.history(), []);
  const { startCall } = useCall();

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top px-5 pb-2 pt-5">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Calls</h1>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {history.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-muted">Your call history will show up here.</p>
        ) : (
          history.map((entry) => (
            <CallRow key={entry.id} entry={entry} onCall={() => startCall(entry.peer, entry.mode)} />
          ))
        )}
      </div>
    </div>
  );
}
