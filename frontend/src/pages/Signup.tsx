import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await signup(displayName, username);
    navigate("/home", { replace: true });
  }

  return (
    <div className="safe-top safe-bottom flex h-full flex-col justify-between px-6 pb-8 pt-14">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">Create your account</h1>
        <p className="mt-2 text-[15px] text-muted">It takes less than a minute.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] text-muted">Display name</label>
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl2 border border-border bg-surface px-4 py-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-muted">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a unique username"
              className="w-full rounded-xl2 border border-border bg-surface px-4 py-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
          </div>
          {error && <p className="text-[13px] text-bad">{error}</p>}
          <Button type="submit" fullWidth disabled={!displayName.trim() || !username.trim() || loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>

      <p className="text-center text-[14px] text-muted">
        Already have an account?{" "}
        <button onClick={() => navigate("/login")} className="font-medium text-accent">
          Log in
        </button>
      </p>
    </div>
  );
}
