import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownUp, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/domain/PageHeader";
import { ReputationCounts } from "@/components/domain/CertificateBadge";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/domain/states";
import { useDevelopersList } from "@/hooks/useDeveloper";
import { shortAddress } from "@/lib/format";
import { initials, avatarGradient } from "@/lib/avatar";
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
    <div className="space-y-7">
      <PageHeader
        eyebrow="Directorio"
        title="Desarrolladores"
        description="Explorá los desarrolladores por su historial verificable de obras completadas y fallidas, registrado on-chain."
      />

      <div className="animate-fade-up flex flex-wrap items-end gap-3 rounded-xl border border-[var(--fen-border)] bg-card p-3 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs text-[var(--fen-muted)]">Ordenar por</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as DeveloperSort)}>
            <SelectTrigger className="w-52">
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
          <ArrowDownUp className="size-3.5" />
          {order === "desc" ? "Mayor a menor" : "Menor a mayor"}
        </Button>

        <div className="space-y-1.5">
          <Label className="text-xs text-[var(--fen-muted)]">Filtrar</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as DeveloperFilter)}>
            <SelectTrigger className="w-44">
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((d, i) => (
            <Link
              key={d.wallet}
              to={`/developers/${d.wallet}`}
              className="animate-fade-up block"
              style={{ animationDelay: `${Math.min(i, 9) * 60}ms` }}
            >
              <Card className="card-hover h-full border-[var(--fen-border)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-12 shrink-0 items-center justify-center rounded-xl font-serif text-lg font-semibold text-white shadow-sm"
                      style={{ background: avatarGradient(d.wallet) }}
                    >
                      {initials(d.razonSocial)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--fen-ink)]">
                        <Building2 className="size-3.5 shrink-0 text-[var(--fen-muted)]" />
                        {d.razonSocial}
                      </p>
                      <p className="text-xs text-[var(--fen-body)]">CUIT {d.cuit}</p>
                      <p className="font-mono text-xs text-[var(--fen-muted)]">
                        {shortAddress(d.wallet)}
                      </p>
                    </div>
                  </div>
                  <ReputationCounts completed={d.completed} failed={d.failed} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
