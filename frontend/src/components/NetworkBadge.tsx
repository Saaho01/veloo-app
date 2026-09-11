import { NetworkTier } from "../types";

const TIER_META: Record<NetworkTier, { label: string; dots: number; color: string }> = {
  excellent: { label: "Excellent", dots: 3, color: "bg-good" },
  good: { label: "Good", dots: 3, color: "bg-good" },
  weak: { label: "Weak", dots: 2, color: "bg-warn" },
  "very-weak": { label: "Weak", dots: 1, color: "bg-bad" },
};

export function NetworkBadge({ tier }: { tier: NetworkTier }) {
  const meta = TIER_META[tier];
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
      <div className="flex items-end gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-sm transition-colors ${i < meta.dots ? meta.color : "bg-white/20"}`}
            style={{ height: 4 + i * 3 }}
          />
        ))}
      </div>
      <span className="text-[11px] text-white/80">{meta.label}</span>
    </div>
  );
}
