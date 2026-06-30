import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useSession } from "@/providers/SessionProvider";
import { useWrite } from "@/hooks/useWrite";
import { createReport } from "@/services/reports.service";
import { declareMilestone } from "@/lib/chain/contracts";

// Flujo del desarrollador: subir el reporte (off-chain, autenticado por firma) y declarar
// el hito on-chain con el reportHash + reportUrl que devuelve el backend (FR-013).
export function DeclareMilestoneDialog({
  projectAddress,
  milestoneIndex,
}: {
  projectAddress: string;
  milestoneIndex: number;
}) {
  const { address, isOnSepolia } = useWallet();
  const { ensureAuth, authenticating } = useSession();
  const { phase, error, run } = useWrite([["project", projectAddress], ["proposals", projectAddress]]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy =
    uploading || authenticating || phase === "signing" || phase === "mining" || phase === "propagating";

  async function onSubmit() {
    setUploadError(null);
    try {
      setUploading(true);
      await ensureAuth();
      const { reportHash, reportUrl } = await createReport(projectAddress, milestoneIndex, {
        text,
        media,
        documents: docs,
      });
      setUploading(false);
      const ok = await run(() => declareMilestone(projectAddress, reportHash, reportUrl));
      if (ok) setTimeout(() => setOpen(false), 1200);
    } catch (err: unknown) {
      setUploading(false);
      setUploadError((err as Error)?.message ?? "No se pudo subir el reporte.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Declarar hito</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Declarar hito {milestoneIndex + 1}</DialogTitle>
          <DialogDescription>
            Subís el reporte y firmás la declaración on-chain. Requiere autenticar tu wallet.
          </DialogDescription>
        </DialogHeader>

        {!address ? (
          <p className="text-sm text-muted-foreground">Conectá tu wallet para continuar.</p>
        ) : !isOnSepolia ? (
          <p className="text-sm text-destructive">Cambiá a Sepolia para firmar.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-text">Texto del reporte</Label>
              <textarea
                id="report-text"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-media">Fotos / videos</Label>
              <Input
                id="report-media"
                type="file"
                multiple
                disabled={busy}
                onChange={(e) => setMedia(Array.from(e.target.files ?? []))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-docs">Documentos</Label>
              <Input
                id="report-docs"
                type="file"
                multiple
                disabled={busy}
                onChange={(e) => setDocs(Array.from(e.target.files ?? []))}
              />
            </div>
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <TxFeedback phase={phase} error={error} />
          </div>
        )}

        <DialogFooter>
          {address && isOnSepolia && (
            <Button onClick={() => void onSubmit()} disabled={busy}>
              {busy ? "Procesando…" : "Subir y declarar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
