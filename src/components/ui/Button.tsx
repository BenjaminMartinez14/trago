"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-white text-black font-semibold hover:bg-zinc-200 active:bg-zinc-300",
  secondary: "bg-zinc-800 text-white font-semibold hover:bg-zinc-700 active:bg-zinc-600 border border-zinc-700",
  ghost: "bg-transparent text-white hover:bg-zinc-800 active:bg-zinc-700",
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
          "inline-flex items-center justify-center gap-2 transition-colors duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "select-none touch-manipulation",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
