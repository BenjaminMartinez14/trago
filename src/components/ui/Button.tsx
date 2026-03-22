"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-trago-orange text-white font-semibold hover:bg-trago-orange-light glow-orange-sm",
  secondary: "bg-trago-card text-white font-semibold hover:bg-trago-card-hover border border-trago-border",
  ghost: "bg-transparent text-white hover:bg-white/5",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-4 text-sm rounded-lg",
  md: "h-12 px-5 text-base rounded-xl",
  lg: "h-14 px-6 text-lg rounded-2xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "select-none touch-manipulation press-scale",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
