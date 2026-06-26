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
import { useSession } from "@/providers/SessionProvider";
import { submitVerification } from "@/services/developers.service";

// Sube material de verificacion de identidad (autenticado por firma). Solo el propio
// developer puede hacerlo; la autorizacion final la resuelve el backend (FR-019).
export function SubmitVerificationDialog({ wallet }: { wallet: string }) {
  const { ensureAuth, authenticating } = useSession();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setStatus("sending");
    try {
      await ensureAuth();
      await submitVerification(wallet, files);
      setStatus("ok");
      setTimeout(() => setOpen(false), 1200);
    } catch (err: unknown) {
      setStatus("error");
      setError((err as Error)?.message ?? "No se pudo subir el material.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Subir verificación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Material de verificación</DialogTitle>
          <DialogDescription>
            Subí documentación que respalde tu identidad. Requiere firmar con tu wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="verif-files">Documentos</Label>
            <Input
              id="verif-files"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              disabled={status === "sending" || authenticating}
            />
          </div>
          {status === "ok" && <p className="text-sm text-emerald-600">Material enviado.</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={() => void onSubmit()}
            disabled={files.length === 0 || status === "sending" || authenticating}
          >
            {status === "sending" || authenticating ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
