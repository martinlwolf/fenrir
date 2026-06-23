import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/domain/states";
import { SubmitVerificationDialog } from "@/components/domain/SubmitVerificationDialog";
import { useWallet } from "@/providers/WalletProvider";
import { useDeveloper, useReputation } from "@/hooks/useDeveloper";
import { shortAddress } from "@/lib/format";

export function DeveloperProfilePage() {
  const { wallet } = useParams<{ wallet: string }>();
  const { address } = useWallet();
  const developer = useDeveloper(wallet);
  const reputation = useReputation(wallet);
  const isOwner = !!address && address === wallet?.toLowerCase();

  if (developer.isLoading) return <LoadingState label="Cargando desarrollador…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Desarrollador</h1>
        {isOwner && wallet && <SubmitVerificationDialog wallet={wallet} />}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Identidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {developer.isError || !developer.data ? (
            <EmptyState title="Identidad no registrada" />
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Razón social</span>
                <span className="font-medium">{developer.data.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CUIT</span>
                <span className="font-medium">{developer.data.cuit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet</span>
                <span className="font-medium">{shortAddress(developer.data.wallet)}</span>
              </div>
              {developer.data.verificationDocsUrl && (
                <a
                  href={developer.data.verificationDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Material de verificación
                </a>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reputación</CardTitle>
        </CardHeader>
        <CardContent>
          {reputation.isLoading ? (
            <LoadingState />
          ) : reputation.isError || !reputation.data ? (
            <ErrorState onRetry={() => void reputation.refetch()} />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="success">Completados: {reputation.data.completed}</Badge>
                <Badge variant="destructive">Fallidos: {reputation.data.failed}</Badge>
              </div>
              {reputation.data.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin certificados aún.</p>
              ) : (
                <div className="space-y-2">
                  {reputation.data.certificates.map((c) => (
                    <div
                      key={`${c.type}-${c.tokenId}`}
                      className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                    >
                      <Badge variant={c.type === "Completion" ? "success" : "destructive"}>
                        {c.type === "Completion" ? "Finalización" : "Proyecto fallido"}
                      </Badge>
                      <span>{shortAddress(c.projectAddress)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
