import { ChevronRight, LogOut } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import { useNavigate } from "react-router-dom";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${on ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
      <span className="text-[15px] text-ink">{label}</span>
      <div className="flex items-center gap-2 text-muted">
        {value && <span className="text-[14px]">{value}</span>}
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

export function Settings() {
  const { user, logout } = useAuth();
  const { dataSaver, toggleDataSaver } = useCall();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top px-5 pb-2 pt-5">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="flex items-center gap-3 px-5 py-4">
          <Avatar name={user.displayName} size={56} />
          <div>
            <p className="text-[16px] font-medium">{user.displayName}</p>
            <p className="text-[13px] text-muted">@{user.username}</p>
          </div>
        </div>

        <div className="mt-2 divide-y divide-border/60 border-y border-border/60">
          <Row label="Account" />
          <Row label="Notifications" />
        </div>

        <p className="mt-6 px-5 text-[12px] font-medium uppercase tracking-wide text-muted/70">Calls</p>
        <div className="mt-1 divide-y divide-border/60 border-y border-border/60">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[15px] text-ink">Data Saver</p>
              <p className="text-[12px] text-muted">Lower resolution and bitrate to save data</p>
            </div>
            <Toggle on={dataSaver} onChange={toggleDataSaver} />
          </div>
          <Row label="Video quality" value="Auto" />
          <Row label="Audio quality" value="Auto" />
        </div>

        <p className="mt-6 px-5 text-[12px] font-medium uppercase tracking-wide text-muted/70">Privacy</p>
        <div className="mt-1 divide-y divide-border/60 border-y border-border/60">
          <Row label="Privacy" />
          <Row label="Blocked users" />
          <Row label="About" value="v1.0.0" />
        </div>

        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="mt-8 flex w-full items-center justify-center gap-2 px-5 py-3 text-[15px] font-medium text-bad"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </div>
  );
}
