import { NetworkTier, QualityProfile } from "../types";

export const QUALITY_PROFILES: Record<NetworkTier, QualityProfile> = {
  excellent: {
    tier: "excellent",
    label: "Excellent",
    maxWidth: 1280,
    maxHeight: 720,
    maxFrameRate: 30,
    maxBitrateKbps: 1500,
  },
  good: {
    tier: "good",
    label: "Good",
    maxWidth: 854,
    maxHeight: 480,
    maxFrameRate: 24,
    maxBitrateKbps: 700,
  },
  weak: {
    tier: "weak",
    label: "Weak",
    maxWidth: 640,
    maxHeight: 360,
    maxFrameRate: 18,
    maxBitrateKbps: 300,
  },
  "very-weak": {
    tier: "very-weak",
    label: "Very weak",
    maxWidth: 320,
    maxHeight: 240,
    maxFrameRate: 12,
    maxBitrateKbps: 120,
  },
};

// Data-saver caps every tier to a lower ceiling, biasing hard toward audio.
export const DATA_SAVER_PROFILES: Record<NetworkTier, QualityProfile> = {
  excellent: { ...QUALITY_PROFILES.good, tier: "excellent", label: "Excellent (saver)" },
  good: { ...QUALITY_PROFILES.weak, tier: "good", label: "Good (saver)" },
  weak: { ...QUALITY_PROFILES["very-weak"], tier: "weak", label: "Weak (saver)" },
  "very-weak": { ...QUALITY_PROFILES["very-weak"], label: "Very weak (saver)" },
};

export interface StatSample {
  timestamp: number;
  rttMs: number | null;
  packetLossPct: number | null;
  availableOutgoingBitrateKbps: number | null;
  jitterMs: number | null;
}

/**
 * Classifies raw WebRTC stats into a coarse network tier. Thresholds are
 * intentionally conservative and combined with hysteresis/smoothing in
 * NetworkAdaptationController so the UI doesn't flicker between tiers.
 */
export function classifyTier(sample: StatSample): NetworkTier {
  const { rttMs, packetLossPct, availableOutgoingBitrateKbps } = sample;

  const loss = packetLossPct ?? 0;
  const rtt = rttMs ?? 0;
  const bw = availableOutgoingBitrateKbps ?? Infinity;

  if (loss > 12 || rtt > 500 || bw < 150) return "very-weak";
  if (loss > 6 || rtt > 300 || bw < 350) return "weak";
  if (loss > 2 || rtt > 150 || bw < 900) return "good";
  return "excellent";
}

const TIER_ORDER: NetworkTier[] = ["very-weak", "weak", "good", "excellent"];

/**
 * Smooths tier transitions: requires `stableSamplesNeeded` consecutive
 * classifications in the same direction before committing, and demotes
 * faster than it promotes (drop fast, recover slowly) to avoid visible
 * quality flapping.
 */
export class NetworkAdaptationController {
  private history: NetworkTier[] = [];
  private current: NetworkTier = "good";
  private readonly stableSamplesNeeded = 3;

  get currentTier() {
    return this.current;
  }

  feed(sample: StatSample): { tier: NetworkTier; changed: boolean } {
    const classified = classifyTier(sample);
    this.history.push(classified);
    if (this.history.length > this.stableSamplesNeeded) this.history.shift();

    const currentIdx = TIER_ORDER.indexOf(this.current);
    const classifiedIdx = TIER_ORDER.indexOf(classified);
    const isDowngrade = classifiedIdx < currentIdx;

    const needed = isDowngrade ? 1 : this.stableSamplesNeeded;
    const recentWindow = this.history.slice(-needed);
    const allAgree = recentWindow.length === needed && recentWindow.every((t) => t === classified);

    if (allAgree && classified !== this.current) {
      this.current = classified;
      return { tier: this.current, changed: true };
    }
    return { tier: this.current, changed: false };
  }

  reset(tier: NetworkTier = "good") {
    this.current = tier;
    this.history = [];
  }
}
