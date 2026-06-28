import { cn } from "@/lib/utils";

// Encabezado centrado de sección: eyebrow + título + subtítulo opcional.
// Compartido por HowItWorks y ProjectTypes (mismos tamaños del diseño).
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-[820px] flex-col items-center gap-4 text-center", className)}>
      <span className="text-sm font-bold tracking-[2px] text-[var(--fen-muted)]">
        {eyebrow}
      </span>
      <h2 className="text-[34px] font-bold leading-[1.1] text-[var(--fen-ink)] sm:text-[40px] lg:text-[46px] lg:leading-[52px]">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-[680px] text-[18px] leading-[28px] text-[var(--fen-body)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
