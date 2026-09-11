export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  status: "online" | "offline";
}

export interface Contact extends User {
  addedAt: number;
  favorite?: boolean;
}

export type CallDirection = "incoming" | "outgoing" | "missed";
export type CallMode = "video" | "audio";

export interface CallHistoryEntry {
  id: string;
  peer: User;
  direction: CallDirection;
  mode: CallMode;
  timestamp: number;
  durationSec: number;
}

export type NetworkTier = "excellent" | "good" | "weak" | "very-weak";

export interface QualityProfile {
  tier: NetworkTier;
  label: string;
  maxWidth: number;
  maxHeight: number;
  maxFrameRate: number;
  maxBitrateKbps: number;
}

export type CallScreenState =
  | "idle"
  | "dialing"
  | "ringing-incoming"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export interface DataUsageSnapshot {
  totalBytes: number;
  bytesPerSecond: number;
  sessionSeconds: number;
}
