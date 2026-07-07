import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Gavel, Vote, XCircle } from "lucide-react";
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

// Watcher invisible montado en App (vive en cualquier vista). Cada inversor lo corre en su
// propia sesion: vigila las propuestas de SUS proyectos y avisa por toast apenas el backend
// refleja el evento, sin importar en que pantalla este parado:
//  - cuando se ABRE una votacion del proyecto (a todos los inversores, puedan votar o no);
//    si la wallet puede votar, el boton lleva directo a Gobernanza.
//  - cuando la votacion se RESUELVE (aprobada/rechazada).
//  - cuando una votacion queda TRABADA esperando al arbitro, solo a la wallet arbitro, con
//    un boton directo al desempate.
// Las resoluciones solo se avisan en la transicion observada en la sesion (no spamea el
// historial al cargar).
export function VoteNotifications() {
  const { data } = useMyProposalsFeed();
  const { address } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  // Si el destino del toast es la pagina en la que ya estamos, react-router no dispara
  // ningun re-render util (misma ruta): recargamos para que se vea el estado real.
  const goTo = (path: string) => {
    const [pathname, search = ""] = path.split("?");
    const currentSearch = location.search.replace(/^\?/, "");
    if (location.pathname === pathname && currentSearch === search) {
      window.location.reload();
    } else {
      navigate(path);
    }
  };
  // Colecciones estables entre renders (via ref): ultimo estado visto y votaciones abiertas ya avisadas.
  const lastSeen = useRef<Map<string, Seen>>(new Map()).current;
  const notifiedOpen = useRef<Set<string>>(new Set()).current;
  const arbiterNotified = useRef<Set<string>>(new Set());
  // Wallet para la que ya se sembro el feed (null = todavia no): evita spamear el historial al cargar.
  const seededFor = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!data) return;
    const wallet = address ?? null;

    // Siembra silenciosa al primer feed de esta wallet: registra lo existente SIN avisar.
    // De ahi en mas, solo lo nuevo dispara toast.
    if (seededFor.current !== wallet) {
      notifiedOpen.clear();
      lastSeen.clear();
      for (const { proposal, projectAddress } of data) {
        const key = `${projectAddress}:${proposal.governorProposalId}`;
        lastSeen.set(key, { status: proposal.status, result: proposal.result });
        if (proposal.status === "Active") notifiedOpen.add(key);
      }
      seededFor.current = wallet;
      initialized.current = true;
      return;
    }

    for (const { proposal, projectAddress, canVote, isArbiter } of data) {
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
            onClick: () => goTo(`/projects/${projectAddress}?tab=governance`),
          },
        });
      }
      if (!isOpen && notifiedOpen.has(key)) {
        toast.dismiss(`${key}:open`);
        notifiedOpen.delete(key);
      }

      // 2) Trabada esperando desempate: avisar UNA vez, solo si la wallet es el arbitro.
      const awaitingArbiter = proposal.status === "AwaitingArbiter";
      if (awaitingArbiter && isArbiter && !arbiterNotified.current.has(key)) {
        arbiterNotified.current.add(key);
        toast.warning(`Desempate pendiente · ${kind}`, {
          id: `${key}:arbiter`,
          icon: <Gavel className="size-4" />,
          description: `Proyecto ${shortAddress(projectAddress)} · empate o falta de quórum, tu voto define`,
          duration: Infinity,
          action: {
            label: "Ir a desempatar",
            onClick: () => goTo(`/projects/${projectAddress}?tab=governance`),
          },
        });
      }
      // Cuando deja de estar trabada, sacamos el toast de desempate.
      if (!awaitingArbiter && arbiterNotified.current.has(key)) {
        toast.dismiss(`${key}:arbiter`);
        arbiterNotified.current.delete(key);
      }

      // 3) Resolucion (aprobada/rechazada), solo en la transicion vista en esta sesion.
      const justResolved =
        initialized.current &&
        before &&
        before.status !== "Resolved" &&
        proposal.status === "Resolved";
      if (justResolved) {
        const goToProject = () => goTo(`/projects/${projectAddress}`);
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
