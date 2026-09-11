import { formatBytes } from "../services/dataUsage";

interface DataUsageBadgeProps {
  totalBytes: number;
  dataSaverOn: boolean;
}

export function DataUsageBadge({ totalBytes, dataSaverOn }: DataUsageBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
      {dataSaverOn && <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" />}
      <span className="text-[11px] text-white/70">Data used: {formatBytes(totalBytes)}</span>
    </div>
  );
}
