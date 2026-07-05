import { cn } from "@/lib/utils";

// Marca Fenrir: cuadro tinta con un rombo blanco (rectángulo rotado 45°) + wordmark.
// Reutilizada en el Header y el Footer. `onDark` invierte los colores para fondos oscuros
// (hero full-bleed): caja emerald + wordmark blanco.
export function FenrirLogo({
  size = 36,
  wordSize = 20,
  onDark = false,
  className,
}: {
  size?: number;
  wordSize?: number;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-[11px]", className)}>
      <span
        className="flex shrink-0 items-center justify-center rounded-[9px]"
        style={{
          width: size,
          height: size,
          background: onDark ? "var(--fen-accent)" : "var(--fen-ink)",
        }}
      >
        <span
          className="rotate-45 rounded-[2px] bg-white"
          style={{ width: size * 0.39, height: size * 0.39 }}
        />
      </span>
      <span
        className="font-bold tracking-[1px]"
        style={{ fontSize: wordSize, color: onDark ? "#ffffff" : "var(--fen-ink)" }}
      >
        FENRIR
      </span>
    </div>
  );
}
