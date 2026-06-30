import { useParams } from "react-router-dom";
import { ExternalLink, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, EmptyState, ErrorState } from "@/components/domain/states";
import { PageHeader } from "@/components/domain/PageHeader";
import {
  CertificateMedallion,
  ReputationCounts,
} from "@/components/domain/CertificateBadge";
import { SubmitVerificationDialog } from "@/components/domain/SubmitVerificationDialog";
import { useWallet } from "@/providers/WalletProvider";
import { useDeveloper, useReputation } from "@/hooks/useDeveloper";
import { shortAddress } from "@/lib/format";
import { AddressTag } from "@/components/domain/AddressTag";
import { initials, avatarGradient } from "@/lib/avatar";

export function DeveloperProfilePage() {
  const { wallet } = useParams<{ wallet: string }>();
  const { address } = useWallet();
  const developer = useDeveloper(wallet);
  const reputation = useReputation(wallet);
  const isOwner = !!address && address === wallet?.toLowerCase();
  const name = developer.data?.razonSocial ?? "Desarrollador";

  if (developer.isLoading) return <LoadingState label="Cargando desarrollador…" />;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Perfil" title={name}>
        {isOwner && wallet && <SubmitVerificationDialog wallet={wallet} />}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Identidad */}
        <Card className="animate-fade-up border-[var(--fen-border)]">
          <CardContent className="space-y-4 p-6">
            {developer.isError || !developer.data ? (
              <EmptyState title="Identidad no registrada" />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span
                    className="flex size-16 shrink-0 items-center justify-center rounded-2xl font-serif text-2xl font-semibold text-white shadow-sm"
                    style={{ background: avatarGradient(developer.data.wallet) }}
                  >
                    {initials(developer.data.razonSocial)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-serif text-xl font-semibold text-[var(--fen-ink)]">
                      {developer.data.razonSocial}
                    </p>
                    <p className="text-xs text-[var(--fen-muted)]">
                      <AddressTag address={developer.data.wallet} />
                    </p>
                  </div>
                </div>

                <dl className="space-y-2 border-t border-[var(--fen-divider)] pt-4 text-sm">
                  <Row label="Razón social" value={developer.data.razonSocial} />
                  <Row label="CUIT" value={developer.data.cuit} />
                </dl>

                {developer.data.verificationDocsUrl && (
                  <a
                    href={developer.data.verificationDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fen-accent-strong)] hover:underline"
                  >
                    <FileText className="size-4" />
                    Material de verificación
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reputacion + credenciales */}
        <Card className="animate-fade-up border-[var(--fen-border)]" style={{ animationDelay: "80ms" }}>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Reputación on-chain</CardTitle>
          </CardHeader>
          <CardContent>
            {reputation.isLoading ? (
              <LoadingState />
            ) : reputation.isError || !reputation.data ? (
              <ErrorState onRetry={() => void reputation.refetch()} />
            ) : (
              <div className="space-y-5">
                <ReputationCounts
                  completed={reputation.data.completed}
                  failed={reputation.data.failed}
                />

                <div className="border-t border-[var(--fen-divider)] pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fen-muted)]">
                    Credenciales soulbound
                  </p>
                  {reputation.data.certificates.length === 0 ? (
                    <p className="text-sm text-[var(--fen-body)]">Sin certificados aún.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {reputation.data.certificates.map((c) => (
                        <CertificateMedallion
                          key={`${c.type}-${c.tokenId}`}
                          kind={c.type === "Completion" ? "completion" : "failed"}
                          title={
                            c.type === "Completion"
                              ? "Certificado de finalización"
                              : "Certificado de proyecto fallido"
                          }
                          subtitle={`Proyecto ${shortAddress(c.projectAddress)} · #${c.tokenId}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--fen-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--fen-ink)]">{value}</dd>
    </div>
  );
}
