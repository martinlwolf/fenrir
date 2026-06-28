import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { FundingSummary } from "@/components/domain/FundingSummary";
import { MilestoneList } from "@/components/domain/MilestoneList";
import { InvestDialog } from "@/components/domain/InvestDialog";
import { GovernanceSection } from "@/components/domain/GovernanceSection";
import { SaleSection } from "@/components/domain/SaleSection";
import { ClaimCommissionPanel } from "@/components/domain/ClaimCommissionPanel";
import { MaintenancePanel } from "@/components/domain/MaintenancePanel";
import { ProjectStatusBadge } from "@/components/domain/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/domain/states";
import { formatWei, shortAddress } from "@/lib/format";

const TYPE_LABEL = { Investment: "Inversión", Civic: "Cívico" } as const;

export function ProjectDetailPage() {
  const { address } = useParams<{ address: string }>();
  const { data: project, isLoading, isError, refetch } = useProject(address);

  if (isLoading) return <LoadingState label="Cargando proyecto…" />;
  if (isError || !project)
    return (
      <ErrorState
        description="No se pudo cargar el proyecto."
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft /> Volver al catálogo
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{shortAddress(project.address)}</h1>
        <Badge variant="outline">{TYPE_LABEL[project.projectType]}</Badge>
        <ProjectStatusBadge status={project.status} />
        <span className="text-sm text-muted-foreground">
          FDT emitido: {formatWei(project.totalRaised)}
        </span>
        {project.status === "Funding" && (
          <div className="ml-auto">
            <InvestDialog projectAddress={project.address} />
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Desarrollador:{" "}
        <Link
          to={`/developers/${project.developerWallet}`}
          className="text-primary underline"
        >
          {shortAddress(project.developerWallet)}
        </Link>
      </p>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="governance">Gobernanza</TabsTrigger>
          {(project.status === "Selling" || project.status === "Completed") && (
            <TabsTrigger value="sale">Venta</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="summary">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <FundingSummary project={project} />
              <ClaimCommissionPanel project={project} />
              <MaintenancePanel project={project} />
            </div>
            <div className="lg:col-span-2">
              <MilestoneList
                milestones={project.milestones}
                projectAddress={project.address}
                developerWallet={project.developerWallet}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="governance">
          <GovernanceSection project={project} />
        </TabsContent>
        {(project.status === "Selling" || project.status === "Completed") && (
          <TabsContent value="sale">
            <SaleSection project={project} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
