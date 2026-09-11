import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <header className="safe-top flex items-center justify-between px-5 pb-2 pt-4">
      <button onClick={() => navigate("/settings")} className="flex items-center gap-3">
        <Avatar name={user.displayName} size={38} />
      </button>
      <span className="font-display text-[19px] font-semibold tracking-tight">Velo</span>
      <button onClick={() => navigate("/settings")} className="p-2 text-muted active:text-ink">
        <Settings size={22} strokeWidth={1.8} />
      </button>
    </header>
  );
}
