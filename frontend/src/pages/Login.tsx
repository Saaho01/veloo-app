import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const [username, setUsername] = useState("");
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(username);
    navigate("/home", { replace: true });
  }

  return (
    <div className="safe-top safe-bottom flex h-full flex-col justify-between px-6 pb-8 pt-14">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-2 text-[15px] text-muted">Log in to pick up right where you left off.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] text-muted">Username</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. priya.k"
              className="w-full rounded-xl2 border border-border bg-surface px-4 py-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
          </div>
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <Button type="submit" fullWidth disabled={!username.trim() || loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>

      <p className="text-center text-[14px] text-muted">
        New to Velo?{" "}
        <button onClick={() => navigate("/signup")} className="font-medium text-accent">
          Create an account
        </button>
      </p>
    </div>
  );
}
