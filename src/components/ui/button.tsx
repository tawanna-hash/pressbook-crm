import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * The canonical button primitive for the app.
 *
 *   <Button variant="primary" size="md" leftIcon={<Plus />}>New</Button>
 *
 * If you need button-shaped styling on a Link or anchor, use the exported
 * `buttonClasses(...)` helper:
 *
 *   <Link href="..." className={buttonClasses({ variant: "primary" })}>…</Link>
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--r)] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-pb-navy text-white shadow-[var(--sh-xs)] hover:opacity-90",
  secondary:
    "border border-border bg-card text-text shadow-[var(--sh-xs)] hover:bg-muted-bg",
  ghost: "text-text-2 hover:bg-muted-bg hover:text-text",
  danger:
    "bg-pb-red text-white shadow-[var(--sh-xs)] hover:opacity-90",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-3.5 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-[13px]",
  icon: "p-1.5 rounded-full",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`.trim();
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      className = "",
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses({ variant, size, className })}
        {...rest}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  },
);
