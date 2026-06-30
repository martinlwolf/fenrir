import { Link } from "react-router-dom";
import { CheckCircle2, Coins, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "./StatusBadge";
import { useWallet } from "@/providers/WalletProvider";
import { useInvestments } from "@/hooks/useInvestments";
import { formatWei, isPast, sameAddress, shortAddress } from "@/lib/format";
import type { ProjectResponse } from "@shared/schemas/project.schema";

const TYPE_LABEL = { Investment: "Inversión", Civic: "Cívico" } as const;

export function ProjectCard({ project }: { project: ProjectResponse }) {
  // El nombre del token (FDT) es el identificador legible del proyecto; si todavia no se
  // espejo desde on-chain, se cae a la direccion abreviada.
  const title = project.tokenName ?? shortAddress(project.address);
  const membership = useMembership(project);

  return (
    <Link to={`/projects/${project.address}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{TYPE_LABEL[project.projectType]}</Badge>
            <ProjectStatusBadge status={project.status} />
          </div>
          <CardTitle className="flex items-center gap-2 pt-2 text-base">
            <span className="truncate">{title}</span>
            {project.tokenSymbol && (
              <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                {project.tokenSymbol}
              </Badge>
            )}
          </CardTitle>
          {project.developerRazonSocial && (
            <p className="truncate text-xs text-muted-foreground">
              {project.developerRazonSocial}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> Inversores
            </span>
            <span className="font-medium text-foreground">{project.investorCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Recaudado</span>
            <span className="font-medium text-foreground">{formatWei(project.totalRaised)}</span>
          </div>
          <div className="flex justify-between">
            <span>Objetivo (FF)</span>
            <span>{formatWei(project.ff)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mínimo (FMPA)</span>
            <span>{formatWei(project.fmpa)}</span>
          </div>
          {membership && (
            <div className="mt-3 border-t pt-2">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${membership.tone}`}>
                <membership.Icon className="size-3.5" />
                {membership.label}
              </span>
            </div>
          )}
        </CardContent>
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
      tone: "text-emerald-600 dark:text-emerald-400",
      Icon: CheckCircle2,
    } as const;
  }
  if (fundingOpen) {
    return address
      ? { label: "Podés invertir", tone: "text-primary", Icon: Coins } as const
      : {
          label: "Conectá tu wallet para invertir",
          tone: "text-muted-foreground",
          Icon: Wallet,
        } as const;
  }
  return null;
}
