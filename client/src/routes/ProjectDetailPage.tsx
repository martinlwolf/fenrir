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
import { AddressTag } from "@/components/domain/AddressTag";
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
        <ProjectStatusBadge status={project.status} display={project.display} />
        <span className="text-sm text-muted-foreground">
          {project.investorCount} inversores · FDT emitido: {formatWei(project.totalRaised)}
        </span>
        {/* El backend decide si el viewer puede invertir (capability); el contrato revalida al firmar. */}
        <div className="ml-auto">
          <InvestDialog
            projectAddress={project.address}
            invest={project.viewer.capabilities.invest}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <AddressTag address={project.address} full />
      </p>

      {/* Reembolso: aparece cuando el proyecto está cancelado y hay monto reclamable. */}
      <RefundPanel projectAddress={project.address} projectStatus={project.status} />

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
              <MilestoneList milestones={project.milestones} projectAddress={project.address} />
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
