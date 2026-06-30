import { Link } from "react-router-dom";
import { CheckCircle2, Coins, MapPin, Users, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge } from "./StatusBadge";
import { useWallet } from "@/providers/WalletProvider";
import { useInvestments } from "@/hooks/useInvestments";
import { buildingImage } from "@/lib/buildings";
import { formatWei, isPast, sameAddress, shortAddress } from "@/lib/format";
import type { ProjectResponse } from "@shared/schemas/project.schema";

const TYPE_LABEL = { Investment: "Inversión", Civic: "Cívico" } as const;

// Porcentaje recaudado sobre el objetivo (FF). Tolera ff=0 (evita NaN/Infinity).
function fundedPct(totalRaised: string, ff: string): number {
  try {
    const r = Number(BigInt(totalRaised));
    const goal = Number(BigInt(ff));
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((r / goal) * 100));
  } catch {
    return 0;
  }
}

export function ProjectCard({ project }: { project: ProjectResponse }) {
  // El nombre del token (FDT) es el identificador legible del proyecto; si todavia no se
  // espejo desde on-chain, se cae a la direccion abreviada.
  const title = project.tokenName ?? shortAddress(project.address);
  const membership = useMembership(project);
  const pct = fundedPct(project.totalRaised, project.ff);
  const image = buildingImage(project.address, project.projectType);
  const civic = project.projectType === "Civic";

  return (
    <Link to={`/projects/${project.address}`} className="group block h-full">
      <Card className="card-hover flex h-full flex-col overflow-hidden border-[var(--fen-border)] p-0">
        {/* Foto del edificio con overlay y badges flotantes */}
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[var(--fen-surface)]">
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="img-zoom size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fen-ink)]/75 via-[var(--fen-ink)]/10 to-transparent" />

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span
              className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm"
            >
              {TYPE_LABEL[project.projectType]}
            </span>
          </div>
          <div className="absolute right-3 top-3">
            <ProjectStatusBadge status={project.status} />
          </div>

          <div className="absolute inset-x-3 bottom-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-lg font-bold leading-tight text-white">{title}</h3>
              {project.tokenSymbol && (
                <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white backdrop-blur-sm">
                  {project.tokenSymbol}
                </span>
              )}
            </div>
            {project.developerRazonSocial && (
              <p className="flex items-center gap-1 truncate text-xs text-white/80">
                <MapPin className="size-3 shrink-0" />
                {project.developerRazonSocial}
              </p>
            )}
          </div>
        </div>

        {/* Cuerpo: progreso de fondeo + cifras. flex-col + slot de estado reservado al fondo
            para que todas las cards midan exactamente lo mismo, haya o no membresia. */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-[var(--fen-ink)]">
                {formatWei(project.totalRaised)}
              </span>
              <span className="text-xs text-[var(--fen-muted)]">
                de {formatWei(project.ff)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--fen-divider)]">
              <div
                className="h-full rounded-full bg-[var(--fen-accent)] transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--fen-muted)]">
              <span className="font-medium text-[var(--fen-accent-strong)]">{pct}% fondeado</span>
              {!civic && project.estimatedSalePrice && project.estimatedSalePrice !== "0" && (
                <span>Venta est. {formatWei(project.estimatedSalePrice)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--fen-divider)] pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--fen-body)]">
              <Users className="size-3.5 text-[var(--fen-muted)]" />
              {project.investorCount} {project.investorCount === 1 ? "inversor" : "inversores"}
            </span>
            <span className="text-[var(--fen-muted)]">
              Mínimo {formatWei(project.fmpa)}
            </span>
          </div>

          {/* Slot de estado: altura fija reservada siempre (placeholder si no hay membresia)
              para igualar la altura total de todas las cards. */}
          <div className="mt-auto flex min-h-[2.25rem] items-center pt-1">
            {membership ? (
              <div
                className="flex w-full items-center gap-1.5 rounded-md bg-[var(--fen-surface)] px-2.5 py-1.5 text-xs font-medium"
                style={{ color: membership.color }}
              >
                <membership.Icon className="size-3.5 shrink-0" />
                <span className="truncate">{membership.label}</span>
              </div>
            ) : (
              <span className="text-xs text-[var(--fen-muted)]">
                Ver detalle del proyecto →
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Relacion declarativa de la wallet conectada con el proyecto: si ya invirtio, si puede
// invertir (fondeo abierto) o si tiene que conectar la wallet. useInvestments comparte una
// sola query por wallet (react-query la dedupea), aunque se llame en cada card.
function useMembership(project: ProjectResponse) {
  const { address } = useWallet();
  const investments = useInvestments(address);

  // Mientras carga la lista de inversiones evitamos el parpadeo "Podés invertir" -> "Ya estás
  // invirtiendo" no mostrando nada hasta saber con certeza.
  if (address && investments.isLoading) return null;

  const invested =
    !!address &&
    (investments.data ?? []).some((inv) => sameAddress(inv.projectAddress, project.address));
  // La ronda sigue abierta entre el FMPA y el FF: alcanzar el FMPA pasa el proyecto a Building
  // pero NO cierra la ronda (business_rules/fondeo-y-comision.md). Antes del FMPA (Funding) corre
  // el TTL de fondeo; ya en Building se invierte hasta llegar al FF (totalRaised >= ff).
  const fundingOpen =
    BigInt(project.totalRaised) < BigInt(project.ff) &&
    (project.status === "Building" ||
      (project.status === "Funding" && !isPast(project.fundingDeadline)));

  if (invested) {
    return {
      label: fundingOpen ? "Ya estás invirtiendo" : "Sos inversor",
      color: "var(--fen-accent-strong)",
      Icon: CheckCircle2,
    } as const;
  }
  if (fundingOpen) {
    return address
      ? { label: "Podés invertir", color: "var(--fen-accent-strong)", Icon: Coins } as const
      : {
          label: "Conectá tu wallet para invertir",
          color: "var(--fen-muted)",
          Icon: Wallet,
        } as const;
  }
  return null;
}
