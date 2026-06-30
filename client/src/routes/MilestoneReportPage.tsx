import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { useMilestoneReport } from "@/hooks/useMilestoneReport";
import { ReportVerificationBadge } from "@/components/domain/ReportVerificationBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/domain/states";
import { shortAddress } from "@/lib/format";

// Pagina del reporte de un hito: el contenido que subio el developer (texto + fotos + docs)
// renderizado inline, mas el origen IPFS y la verificacion de hash. Es la pagina a la que
// apunta la reportUrl on-chain. Con storage IPFS las imagenes/docs se sirven desde el
// gateway, asi que se ven aunque el backend este caido.
export function MilestoneReportPage() {
  const { address, index } = useParams<{ address: string; index: string }>();
  const milestoneIndex = Number(index);
  const { data, isLoading, isError, error, refetch } = useMilestoneReport(address, milestoneIndex);

  const backToProject = (
    <Button variant="ghost" size="sm" asChild>
      <Link to={`/projects/${address}`}>
        <ArrowLeft /> Volver al proyecto
      </Link>
    </Button>
  );

  if (isLoading) return <LoadingState label="Cargando reporte…" />;

  // 404 = el hito todavia no tiene reporte declarado (caso esperable, no un error de red).
  const notFound = isError && (error as { status?: number } | null)?.status === 404;
  if (notFound) {
    return (
      <div className="space-y-6">
        {backToProject}
        <ErrorState description="Este hito todavía no tiene un reporte declarado." />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-6">
        {backToProject}
        <ErrorState description="No se pudo cargar el reporte." onRetry={() => void refetch()} />
      </div>
    );
  }

  // CID del manifest en IPFS -> gateway publico (ipfs.io) para inspeccionarlo crudo.
  const ipfsManifestUrl = data.cid ? `https://ipfs.io/ipfs/${data.cid}` : null;

  return (
    <div className="space-y-6">
      {backToProject}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Reporte — Hito {milestoneIndex + 1}</h1>
        <ReportVerificationBadge address={address as string} index={milestoneIndex} />
        {data.cid && (
          <Badge variant="secondary" className="font-mono">
            IPFS
          </Badge>
        )}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Proyecto {shortAddress(data.projectAddress)}
        {data.cid && (
          <>
            {" · "}
            CID {data.cid}
          </>
        )}
      </p>

      {ipfsManifestUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={ipfsManifestUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> Ver manifest en IPFS
          </a>
        </Button>
      )}

      {data.text.trim() !== "" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm">{data.text}</p>
          </CardContent>
        </Card>
      )}

      {data.mediaUrls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Imágenes ({data.mediaUrls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.mediaUrls.map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="group block">
                  <img
                    src={url}
                    alt={`Adjunto ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-md border object-cover transition group-hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.documentUrls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Documentos ({data.documentUrls.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.documentUrls.map((url, i) => (
              <div key={url} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="size-4" /> Documento {i + 1}
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                      <ExternalLink /> Abrir
                    </a>
                  </Button>
                </div>
                {/* Preview embebido: el navegador renderiza PDFs; otros formatos caen al link "Abrir". */}
                <iframe
                  src={url}
                  title={`Documento ${i + 1}`}
                  className="h-96 w-full rounded-md border"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.text.trim() === "" &&
        data.mediaUrls.length === 0 &&
        data.documentUrls.length === 0 && (
          <p className="text-sm text-muted-foreground">El reporte no tiene contenido para mostrar.</p>
        )}
    </div>
  );
}
