import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: "bg-accent text-white active:bg-accent-bright",
  secondary: "bg-elevated text-ink border border-border active:bg-border",
  ghost: "bg-transparent text-muted active:text-ink",
  danger: "bg-bad text-white active:brightness-110",
};

export function Button({ variant = "primary", fullWidth, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`${VARIANT_CLASSES[variant]} ${
        fullWidth ? "w-full" : ""
      } h-12 rounded-xl2 px-6 text-[15px] font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
