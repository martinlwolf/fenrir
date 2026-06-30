import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

// Direccion de wallet/contrato con acciones: copiar al portapapeles y abrir en Etherscan
// (Sepolia). Los iconos heredan el color del contenedor (currentColor + opacidad), asi
// queda bien tanto sobre fondo claro como en el pill del header sobre el hero.
const EXPLORER_BASE = "https://sepolia.etherscan.io";

export function AddressTag({
  address,
  full = false,
  className,
}: {
  address: string;
  /** Muestra la direccion completa en vez de 0xabc…1234. */
  full?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    // Evita disparar navegacion si el tag esta dentro de un Link/card clickeable.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Dirección copiada");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar la dirección");
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono", className)}>
      <span>{full ? address : shortAddress(address)}</span>
      <button
        type="button"
        onClick={copy}
        title="Copiar dirección"
        aria-label="Copiar dirección"
        className="opacity-60 transition hover:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <a
        href={`${EXPLORER_BASE}/address/${address}`}
        target="_blank"
        rel="noreferrer"
        title="Ver en Etherscan"
        aria-label="Ver en Etherscan"
        onClick={(e) => e.stopPropagation()}
        className="opacity-60 transition hover:opacity-100"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </span>
  );
}
