import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Vote, XCircle } from "lucide-react";
import { useMyProposalsFeed } from "@/hooks/useMyVotableProposals";
import { useWallet } from "@/providers/WalletProvider";
import { shortAddress, timeRemaining } from "@/lib/format";
import type {
  ProposalKindValue,
  ProposalResultValue,
  ProposalStatusValue,
} from "@shared/constants/enums";

const KIND_LABEL: Record<ProposalKindValue, string> = {
  ArbiterElection: "Elección de árbitro",
  Milestone: "Votación de hito",
  SaleOffer: "Oferta de venta",
};

interface Seen {
  status: ProposalStatusValue;
  result: ProposalResultValue;
}

// Estado a NIVEL DE MODULO (no useRef): sobrevive a remontajes del componente al navegar,
// asi que cambiar de pantalla NO re-dispara avisos de votaciones ya conocidas. Se
// re-siembra solo cuando cambia la wallet o se recarga la pagina.
let seededFor: string | null = null;
const notifiedOpen = new Set<string>();
const lastSeen = new Map<string, Seen>();

// Watcher invisible montado una vez en App. Cada inversor lo corre en su sesion y solo
// recibe avisos de EVENTOS NUEVOS (votaciones que se abren o se resuelven mientras esta
// mirando), nunca de las que ya existian al entrar.
export function VoteNotifications() {
  const { data } = useMyProposalsFeed();
  const { address } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) return;
    const wallet = address ?? null;

    // Siembra silenciosa al primer feed de esta wallet: registra lo existente SIN avisar.
    // De ahi en mas, solo lo nuevo dispara toast.
    if (seededFor !== wallet) {
      notifiedOpen.clear();
      lastSeen.clear();
      for (const { proposal, projectAddress } of data) {
        const key = `${projectAddress}:${proposal.governorProposalId}`;
        lastSeen.set(key, { status: proposal.status, result: proposal.result });
        if (proposal.status === "Active") notifiedOpen.add(key);
      }
      seededFor = wallet;
      return;
    }

    for (const { proposal, projectAddress, canVote } of data) {
      const key = `${projectAddress}:${proposal.governorProposalId}`;
      const before = lastSeen.get(key);
      const kind = KIND_LABEL[proposal.kind];
      const isOpen = proposal.status === "Active";

      // 1) Votacion NUEVA recien abierta (no estaba en el set de conocidas).
      if (isOpen && !notifiedOpen.has(key)) {
        notifiedOpen.add(key);
        toast(`Votación abierta · ${kind}`, {
          id: `${key}:open`,
          icon: <Vote className="size-4" />,
          description: canVote
            ? `Proyecto ${shortAddress(projectAddress)} · cierra en ${timeRemaining(proposal.deadline)}`
            : `Proyecto ${shortAddress(projectAddress)} · no tenés poder de voto en este snapshot`,
          duration: 30000,
          action: {
            label: canVote ? "Ir a votar" : "Ver",
            onClick: () => navigate(`/projects/${projectAddress}?tab=governance`),
          },
        });
      }
      if (!isOpen && notifiedOpen.has(key)) {
        toast.dismiss(`${key}:open`);
        notifiedOpen.delete(key);
      }

      // 2) Resolucion NUEVA: transicion a Resolved observada mientras miraba.
      if (before && before.status !== "Resolved" && proposal.status === "Resolved") {
        const goToProject = () => navigate(`/projects/${projectAddress}`);
        if (proposal.result === "Approved") {
          toast.success(`${kind} · aprobada ✅`, {
            id: `${key}:resolved`,
            icon: <CheckCircle2 className="size-4" />,
            description: `Proyecto ${shortAddress(projectAddress)}`,
            duration: 12000,
            action: { label: "Ver", onClick: goToProject },
          });
        } else if (proposal.result === "Rejected") {
          toast.error(`${kind} · rechazada`, {
            id: `${key}:resolved`,
            icon: <XCircle className="size-4" />,
            description: `Proyecto ${shortAddress(projectAddress)}`,
            duration: 12000,
            action: { label: "Ver", onClick: goToProject },
          });
        }
      }

      lastSeen.set(key, { status: proposal.status, result: proposal.result });
    }
  }, [data, navigate, address]);

  return null;
}
