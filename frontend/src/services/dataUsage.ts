export interface ByteCounters {
  bytesSent: number;
  bytesReceived: number;
  timestamp: number;
}

/**
 * Tracks cumulative bytes sent+received across a call using real
 * RTCPeerConnection getStats() counters (not a hardcoded estimate), and
 * derives a smoothed instantaneous throughput for the "Data used" HUD.
 */
export class DataUsageTracker {
  private samples: ByteCounters[] = [];
  private startedAt = performance.now();

  reset() {
    this.samples = [];
    this.startedAt = performance.now();
  }

  push(counters: ByteCounters) {
    this.samples.push(counters);
    if (this.samples.length > 20) this.samples.shift();
  }

  get totalBytes(): number {
    const last = this.samples[this.samples.length - 1];
    return last ? last.bytesSent + last.bytesReceived : 0;
  }

  /** Bytes/sec averaged over the last few samples for a stable readout. */
  get bytesPerSecond(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.timestamp - first.timestamp) / 1000;
    if (dt <= 0) return 0;
    const totalFirst = first.bytesSent + first.bytesReceived;
    const totalLast = last.bytesSent + last.bytesReceived;
    return Math.max(0, (totalLast - totalFirst) / dt);
  }

  get sessionSeconds(): number {
    return Math.floor((performance.now() - this.startedAt) / 1000);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export function estimatePerMinuteRate(bytesPerSecond: number): string {
  const perMinKb = (bytesPerSecond * 60) / 1024;
  if (perMinKb < 1024) return `~${Math.max(1, Math.round(perMinKb))} KB/min`;
  return `~${(perMinKb / 1024).toFixed(1)} MB/min`;
}
