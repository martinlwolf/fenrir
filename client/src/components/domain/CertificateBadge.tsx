// Identidad visual de los tokens / credenciales on-chain de Fenrir (business_rules/tokens.md).
// No decide nada de negocio: solo le da una "cara" reconocible a cada activo para que en la
// demo se distinga de un vistazo un Certificado de Finalizacion de uno de Proyecto Fallido, etc.
//
//  - Completion  -> Certificado de Finalizacion (ERC-721 soulbound, exito)   · emerald · medalla
//  - Failed      -> Certificado de Proyecto Fallido (ERC-721 soulbound)      · clay    · escudo roto
//  - Badge       -> Insignia de participacion por hito votado (ERC-1155)     · indigo  · roseta
//  - FDT         -> token economico/voto (ERC-20)                            · laton   · monedas
import { Award, Coins, ShieldX, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type TokenKind = "completion" | "failed" | "badge" | "fdt";

const TOKEN_META: Record<
  TokenKind,
  {
    label: string;
    Icon: typeof Award;
    fg: string;
    soft: string;
    ring: string;
  }
> = {
  completion: {
    label: "Certificado de finalización",
    Icon: Award,
    fg: "var(--fen-cert-completion)",
    soft: "var(--fen-cert-completion-soft)",
    ring: "color-mix(in srgb, var(--fen-cert-completion) 28%, transparent)",
  },
  failed: {
    label: "Certificado de proyecto fallido",
    Icon: ShieldX,
    fg: "var(--fen-cert-failed)",
    soft: "var(--fen-cert-failed-soft)",
    ring: "color-mix(in srgb, var(--fen-cert-failed) 28%, transparent)",
  },
  badge: {
    label: "Insignia de participación",
    Icon: Sparkles,
    fg: "var(--fen-cert-badge)",
    soft: "var(--fen-cert-badge-soft)",
    ring: "color-mix(in srgb, var(--fen-cert-badge) 28%, transparent)",
  },
  fdt: {
    label: "Token FDT",
    Icon: Coins,
    fg: "var(--fen-fdt)",
    soft: "var(--fen-fdt-soft)",
    ring: "color-mix(in srgb, var(--fen-fdt) 28%, transparent)",
  },
};

/** Pildora compacta con icono: para listas/filas de credenciales. */
export function CertificatePill({
  kind,
  label,
  className,
}: {
  kind: TokenKind;
  /** Sobrescribe el texto por defecto (ej. "Finalización" en vez del nombre completo). */
  label?: string;
  className?: string;
}) {
  const m = TOKEN_META[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5",
        className,
      )}
      style={{ color: m.fg, background: m.soft, borderColor: m.ring }}
    >
      <m.Icon />
      {label ?? m.label}
    </span>
  );
}

/** Medallon grande: para destacar una credencial (perfil del developer, hito final). */
export function CertificateMedallion({
  kind,
  title,
  subtitle,
  className,
}: {
  kind: TokenKind;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const m = TOKEN_META[kind];
  return (
    <div
      className={cn(
        "animate-rise flex items-center gap-3 rounded-xl border p-3",
        className,
      )}
      style={{ background: m.soft, borderColor: m.ring }}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm [&_svg]:size-5"
        style={{ background: m.fg }}
      >
        <m.Icon />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={{ color: m.fg }}>
          {title ?? m.label}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-[var(--fen-body)]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/** Contador de reputacion (completados / fallidos) con su identidad de token. */
export function ReputationCounts({
  completed,
  failed,
  className,
}: {
  completed: number;
  failed: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <CertificatePill kind="completion" label={`${completed} completados`} />
      <CertificatePill kind="failed" label={`${failed} fallidos`} />
    </div>
  );
}
