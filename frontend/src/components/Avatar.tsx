import { initialsFromName, seedToHue } from "../utils/format";

interface AvatarProps {
  name: string;
  seed?: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
}

export function Avatar({ name, seed, size = 44, ring = false, online }: AvatarProps) {
  const hue = seedToHue(seed || name);
  const bg = `hsl(${hue} 55% 22%)`;
  const fg = `hsl(${hue} 70% 78%)`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full font-display font-medium ${
          ring ? "ring-2 ring-accent/60 ring-offset-2 ring-offset-base" : ""
        }`}
        style={{ backgroundColor: bg, color: fg, fontSize: size * 0.36 }}
      >
        {initialsFromName(name)}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-base ${
            online ? "bg-good" : "bg-muted/50"
          }`}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
