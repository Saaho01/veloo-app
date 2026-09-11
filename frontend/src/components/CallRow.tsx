import { ArrowDownLeft, ArrowUpRight, PhoneMissed, Video, Phone } from "lucide-react";
import { Avatar } from "./Avatar";
import { CallHistoryEntry } from "../types";
import { formatDuration, formatRelativeTime } from "../utils/format";

interface CallRowProps {
  entry: CallHistoryEntry;
  onCall: () => void;
}

const DIRECTION_META = {
  incoming: { icon: ArrowDownLeft, color: "text-good" },
  outgoing: { icon: ArrowUpRight, color: "text-muted" },
  missed: { icon: PhoneMissed, color: "text-bad" },
};

export function CallRow({ entry, onCall }: CallRowProps) {
  const { icon: DirIcon, color } = DIRECTION_META[entry.direction];
  const ModeIcon = entry.mode === "video" ? Video : Phone;

  return (
    <button onClick={onCall} className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-surface">
      <Avatar name={entry.peer.displayName} seed={entry.peer.avatarSeed} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${entry.direction === "missed" ? "text-bad" : "text-ink"}`}>
          {entry.peer.displayName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
          <DirIcon size={13} className={color} />
          <span>{entry.direction === "missed" ? "Missed" : formatDuration(entry.durationSec)}</span>
          <span>·</span>
          <span>{formatRelativeTime(entry.timestamp)}</span>
        </div>
      </div>
      <ModeIcon size={18} className="text-muted" />
    </button>
  );
}
