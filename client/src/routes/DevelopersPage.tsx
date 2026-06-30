import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";
import { useDevelopersList } from "@/hooks/useDeveloper";
import { shortAddress } from "@/lib/format";
import {
  type DeveloperFilter,
  type DeveloperSort,
} from "@shared/schemas/developer.schema";

const SORT_LABEL: Record<DeveloperSort, string> = {
  completed: "Proyectos completados",
  failed: "Proyectos fallidos",
  razonSocial: "Razón social",
};

const FILTER_LABEL: Record<DeveloperFilter, string> = {
  all: "Todos",
  withCompleted: "Con completados",
  withFailed: "Con fallidos",
};

// Directorio de developers: lista ordenable y filtrable por su historico de reputacion
// (certificados de finalizacion / proyecto fallido). Cada fila enlaza a su perfil.
export function DevelopersPage() {
  const [sort, setSort] = useState<DeveloperSort>("completed");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<DeveloperFilter>("all");
  const { data, isLoading, isError, refetch } = useDevelopersList({ sort, order, filter });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Desarrolladores</h1>
          <p className="text-sm text-muted-foreground">
            Explorá los developers por su historial verificable de proyectos completados y fallidos.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Ordenar por</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as DeveloperSort)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABEL) as DeveloperSort[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
            title="Invertir orden"
          >
            {order === "desc" ? "Mayor a menor" : "Menor a mayor"}
          </Button>

          <div className="space-y-1.5">
            <Label className="text-xs">Filtrar</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as DeveloperFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABEL) as DeveloperFilter[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FILTER_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : isError ? (
        <ErrorState
          description="No se pudieron cargar los desarrolladores."
          onRetry={() => void refetch()}
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No hay desarrolladores"
          description="Probá quitar los filtros o volvé más tarde."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((d) => (
            <Link key={d.wallet} to={`/developers/${d.wallet}`}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="space-y-3 pt-6">
                  <div>
                    <p className="font-medium">{d.razonSocial}</p>
                    <p className="text-xs text-muted-foreground">CUIT {d.cuit}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {shortAddress(d.wallet)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="success">Completados: {d.completed}</Badge>
                    <Badge variant="destructive">Fallidos: {d.failed}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
