import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDeveloper } from "@/hooks/useDeveloper";
import { shortAddress } from "@/lib/format";

// Info del developer responsable del proyecto. Muestra siempre la razon social; "Ver mas"
// despliega el resto de la identidad (CUIT y, si hay, documentacion de verificacion), que
// hoy esta disponible en todos los casos.
export function DeveloperInfoCard({
  wallet,
  razonSocial,
}: {
  wallet: string;
  razonSocial: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useDeveloper(expanded ? wallet : undefined);
  const name = razonSocial ?? data?.razonSocial ?? "Desarrollador sin verificar";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Desarrollador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <Link
            to={`/developers/${wallet}`}
            className="font-mono text-xs text-muted-foreground hover:text-primary"
          >
            {shortAddress(wallet)}
          </Link>
        </div>

        {expanded && (
          <div className="space-y-2 border-t pt-3">
            {isLoading && <p className="text-muted-foreground">Cargando identidad…</p>}
            {data && (
              <>
                <Row label="Razón social" value={data.razonSocial} />
                <Row label="CUIT" value={data.cuit} />
                {data.verificationDocsUrl && (
                  <a
                    href={data.verificationDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Documentación de verificación <ExternalLink className="size-3.5" />
                  </a>
                )}
                <Link
                  to={`/developers/${wallet}`}
                  className="block text-primary hover:underline"
                >
                  Ver perfil y reputación →
                </Link>
              </>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              Ver menos <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              Ver más <ChevronDown className="size-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
