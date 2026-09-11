import { Phone, Video, UserPlus } from "lucide-react";
import { Avatar } from "./Avatar";
import { User } from "../types";

interface ContactRowProps {
  user: User;
  onCall?: (mode: "video" | "audio") => void;
  onAdd?: () => void;
}

export function ContactRow({ user, onCall, onAdd }: ContactRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Avatar name={user.displayName} seed={user.avatarSeed} online={user.status === "online"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{user.displayName}</p>
        <p className="truncate text-[13px] text-muted">@{user.username}</p>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="p-2 text-accent active:opacity-70">
          <UserPlus size={19} />
        </button>
      )}
      {onCall && (
        <div className="flex items-center gap-1">
          <button onClick={() => onCall("audio")} className="p-2 text-muted active:text-ink">
            <Phone size={19} />
          </button>
          <button onClick={() => onCall("video")} className="p-2 text-accent active:opacity-70">
            <Video size={19} />
          </button>
        </div>
      )}
    </div>
  );
}
