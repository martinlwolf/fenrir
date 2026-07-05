import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badges con estilo "pill" de tinte suave + texto de color + ring sutil: lee mas premium /
// inmobiliaria que el badge solido clasico. Las variantes semanticas (success/warning/
// destructive) mapean los estados del dominio; brand/info son acentos de marca.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-[var(--fen-border)] bg-[var(--fen-sand)] text-[var(--fen-ink-2)]",
        destructive:
          "border-[color:var(--fen-clay)]/25 bg-[var(--fen-clay-soft)] text-[var(--fen-clay)]",
        outline: "border-[var(--fen-border-strong)] bg-white/60 text-[var(--fen-ink-2)]",
        success:
          "border-[color:var(--fen-verified)]/25 bg-[var(--fen-verified-soft)] text-[var(--fen-accent-strong)]",
        warning:
          "border-[color:var(--fen-amber)]/30 bg-[var(--fen-amber-soft)] text-[var(--fen-amber)]",
        brand:
          "border-transparent bg-[var(--fen-accent)] text-white",
        info: "border-[color:var(--fen-cert-badge)]/25 bg-[var(--fen-cert-badge-soft)] text-[var(--fen-cert-badge)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
