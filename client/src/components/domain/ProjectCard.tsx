import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectStatusBadge } from "./StatusBadge";
import { formatWei, shortAddress } from "@/lib/format";
import type { ProjectResponse } from "@shared/schemas/project.schema";

const TYPE_LABEL = { Investment: "Inversión", Civic: "Cívico" } as const;

export function ProjectCard({ project }: { project: ProjectResponse }) {
  return (
    <Link to={`/projects/${project.address}`} className="block">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline">{TYPE_LABEL[project.projectType]}</Badge>
            <ProjectStatusBadge status={project.status} />
          </div>
          <CardTitle className="pt-2 text-base">{shortAddress(project.address)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </Link>
  );
}
