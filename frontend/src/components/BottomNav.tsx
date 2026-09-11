import { Home, Phone, Users, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/calls", label: "Calls", icon: Phone },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-4">
        {TABS.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} className={active ? "text-accent" : "text-muted"} />
              <span className={`text-[11px] ${active ? "text-ink font-medium" : "text-muted"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
