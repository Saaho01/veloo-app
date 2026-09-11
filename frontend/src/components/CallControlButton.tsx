import { ReactNode } from "react";

interface CallControlButtonProps {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label?: string;
  children: ReactNode;
}

export function CallControlButton({ onClick, active, danger, label, children }: CallControlButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-150 active:scale-90 ${
          danger
            ? "bg-bad text-white"
            : active
            ? "bg-white text-base"
            : "bg-white/15 text-white backdrop-blur-md"
        }`}
      >
        {children}
      </button>
      {label && <span className="text-[11px] text-white/70">{label}</span>}
    </div>
  );
}
