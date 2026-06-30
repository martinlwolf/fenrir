import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { FundingSummary } from "@/components/domain/FundingSummary";
import { MilestoneList } from "@/components/domain/MilestoneList";
import { InvestDialog } from "@/components/domain/InvestDialog";
import { GovernanceSection } from "@/components/domain/GovernanceSection";
import { DeveloperInfoCard } from "@/components/domain/DeveloperInfoCard";
import { SaleSection } from "@/components/domain/SaleSection";
import { ClaimCommissionPanel } from "@/components/domain/ClaimCommissionPanel";
import { MaintenancePanel } from "@/components/domain/MaintenancePanel";
import { RefundPanel } from "@/components/domain/RefundPanel";
import { ProjectStatusBadge } from "@/components/domain/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/domain/states";
import { formatWei, shortAddress } from "@/lib/format";

const TYPE_LABEL = { Investment: "Inversión", Civic: "Cívico" } as const;

export function ProjectDetailPage() {
  const { address } = useParams<{ address: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: project, isLoading, isError, refetch } = useProject(address);

  if (isLoading) return <LoadingState label="Cargando proyecto…" />;
  if (isError || !project)
    return (
      <ErrorState
        description="No se pudo cargar el proyecto."
        onRetry={() => void refetch()}
      />
    );

  // Pestaña activa controlada por ?tab= (permite el deep-link "Ir a votar" -> Gobernanza).
  // Solo los proyectos de Inversión tienen etapa de venta; los Cívicos no
  // (FenrirProject: "civic has no sale stage"), así que nunca mostramos la pestaña Venta.
  const saleTabAvailable =
    project.projectType === "Investment" &&
    (project.status === "Selling" || project.status === "Completed");
  const validTabs = ["summary", "governance", ...(saleTabAvailable ? ["sale"] : [])];
  const requestedTab = searchParams.get("tab") ?? "summary";
  const activeTab = validTabs.includes(requestedTab) ? requestedTab : "summary";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/projects">
          <ArrowLeft /> Volver al catálogo
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {project.tokenName ?? shortAddress(project.address)}
        </h1>
        {project.tokenSymbol && (
          <Badge variant="secondary" className="font-mono">
            {project.tokenSymbol}
          </Badge>
        )}
        <Badge variant="outline">{TYPE_LABEL[project.projectType]}</Badge>
        <ProjectStatusBadge status={project.status} />
        <span className="text-sm text-muted-foreground">
          {project.investorCount} inversores · FDT emitido: {formatWei(project.totalRaised)}
        </span>
        {/* Botón siempre visible: el contrato valida estado/ronda/rol al firmar invest(). */}
        <div className="ml-auto">
          <InvestDialog projectAddress={project.address} />
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">{project.address}</p>

      {/* Reembolso leido on-chain: aparece aunque el backend no haya espejado la cancelacion. */}
      <RefundPanel projectAddress={project.address} />

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="governance">Gobernanza</TabsTrigger>
          {saleTabAvailable && <TabsTrigger value="sale">Venta</TabsTrigger>}
        </TabsList>
        <TabsContent value="summary">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <FundingSummary project={project} />
              <DeveloperInfoCard
                wallet={project.developerWallet}
                razonSocial={project.developerRazonSocial}
              />
              <ClaimCommissionPanel project={project} />
              <MaintenancePanel project={project} />
            </div>
            <div className="lg:col-span-2">
              <MilestoneList
                milestones={project.milestones}
                projectAddress={project.address}
                developerWallet={project.developerWallet}
                totalRaised={project.totalRaised}
                // Solo se puede declarar un hito una vez arrancada la obra: el proyecto llego al
                // FMPA (status Building) y se resolvio el hito 0 / se eligio arbitro (currentArbiter).
                obraStarted={project.status === "Building" && project.currentArbiter != null}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="governance">
          <GovernanceSection project={project} />
        </TabsContent>
        {saleTabAvailable && (
          <TabsContent value="sale">
            <SaleSection project={project} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
