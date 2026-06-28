import { cn } from "@/lib/utils";

// Marca Fenrir: cuadro tinta con un rombo blanco (rectángulo rotado 45°) + wordmark.
// Reutilizada en el Header y el Footer de la landing.
export function FenrirLogo({
  size = 36,
  wordSize = 20,
  className,
}: {
  size?: number;
  wordSize?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-[11px]", className)}>
      <span
        className="flex shrink-0 items-center justify-center rounded-[9px] bg-[var(--fen-ink)]"
        style={{ width: size, height: size }}
      >
        <span
          className="rotate-45 rounded-[2px] bg-white"
          style={{ width: size * 0.39, height: size * 0.39 }}
        />
      </span>
      <span
        className="font-bold tracking-[1px] text-[var(--fen-ink)]"
        style={{ fontSize: wordSize }}
      >
        FENRIR
      </span>
    </div>
  );
}
