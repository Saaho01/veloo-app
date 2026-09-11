import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => navigate(user ? "/home" : "/login", { replace: true }), 1100);
    return () => clearTimeout(t);
  }, [user]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-base">
      <div className="animate-fadeIn text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
          <div className="h-7 w-7 rounded-full bg-accent" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Velo</h1>
        <p className="mt-2 text-[14px] text-muted">Instant, private, lightweight video calling</p>
      </div>
    </div>
  );
}
