import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects } from "../fixtures";

const base = env.apiUrl;
const ETH = (n: number) => (BigInt(Math.round(n * 1000)) * 10n ** 15n).toString();

// Epoch estable capturado al cargar el modulo: permite simular una votacion "en vivo" cuyo
// deadline no se mueve y cuyos votos crecen con el tiempo. Cada poll (4s) del front ve mas poder
// sumado y el reloj bajando, para demostrar la balanza dinamica sin backend real.
const START = Date.now();
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

// Propuesta de hito en `a1`: el Sí va ganando y el quorum se cruza durante la demo.
function liveMilestoneProposal() {
  const durationMs = 4 * 60 * 1000; // 4 min de ventana
  const elapsed = Date.now() - START;
  const p = clamp(elapsed / durationMs);
  const totalPower = 14;
  // El poder votado sube de 3 a ~12 ETH; el Sí mantiene ~63-70% del total votado.
  const voted = 3 + 9 * p;
  const forShare = 0.63 + 0.06 * Math.sin(p * Math.PI);
  const votesFor = voted * forShare;
  const votesAgainst = voted - votesFor;
  const quorumTarget = totalPower * 0.51;
  return {
    governorProposalId: 2,
    kind: "Milestone" as const,
    refId: 1,
    snapshotBlock: "1000500",
    totalPowerAtSnapshot: ETH(totalPower),
    deadline: new Date(START + durationMs).toISOString(),
    extended: false,
    votesFor: ETH(votesFor),
    votesAgainst: ETH(votesAgainst),
    weightVoted: ETH(voted),
    quorumBps: 5100,
    approvalThresholdBps: 5100,
    quorumReached: voted >= quorumTarget,
    status: "Active" as const,
    result: "None" as const,
    electedArbiter: null,
  };
}

// Propuesta de hito en `a5`: el No va ganando y todavia no llega al quorum (otro estado de UI).
function contestedMilestoneProposal() {
  const durationMs = 8 * 60 * 1000;
  const elapsed = Date.now() - START;
  const p = clamp(elapsed / durationMs);
  const totalPower = 48;
  const voted = 8 + 10 * p; // sube de 8 a 18 ETH (29% -> 37%, no cruza el 51%)
  const againstShare = 0.6 + 0.05 * Math.sin(p * Math.PI);
  const votesAgainst = voted * againstShare;
  const votesFor = voted - votesAgainst;
  return {
    governorProposalId: 7,
    kind: "Milestone" as const,
    refId: 1,
    snapshotBlock: "1100800",
    totalPowerAtSnapshot: ETH(totalPower),
    deadline: new Date(START + durationMs).toISOString(),
    extended: false,
    votesFor: ETH(votesFor),
    votesAgainst: ETH(votesAgainst),
    weightVoted: ETH(voted),
    quorumBps: 5100,
    approvalThresholdBps: 5100,
    quorumReached: voted >= totalPower * 0.51,
    status: "Active" as const,
    result: "None" as const,
    electedArbiter: null,
  };
}

function proposalsFor(address: string) {
  if (address === mockProjects[0].address) return [liveMilestoneProposal()];
  if (address === mockProjects[4].address) return [contestedMilestoneProposal()];
  return [];
}

export const governanceHandlers = [
  http.get(`${base}/projects/:address/proposals`, ({ params }) =>
    HttpResponse.json(proposalsFor(String(params.address))),
  ),

  http.get(`${base}/projects/:address/proposals/:id`, ({ params }) => {
    const proposal = proposalsFor(String(params.address)).find(
      (p) => p.governorProposalId === Number(params.id),
    );
    if (!proposal) {
      return HttpResponse.json({ error: "No encontrada", error_code: "NOT_FOUND" }, { status: 404 });
    }
    return HttpResponse.json(proposal);
  }),

  http.get(`${base}/projects/:address/proposals/:id/voting-power`, ({ request, params }) => {
    const url = new URL(request.url);
    return HttpResponse.json({
      wallet: (url.searchParams.get("wallet") ?? "0x0").toLowerCase(),
      proposalId: Number(params.id),
      snapshotBlock: "1000500",
      votingPower: ETH(2),
      hasVoted: false,
    });
  }),

  http.get(`${base}/projects/:address/arbiter`, ({ params }) => {
    const project = mockProjects.find((p) => p.address === params.address);
    return HttpResponse.json({
      projectAddress: String(params.address),
      currentArbiter: project?.currentArbiter ?? null,
      electionInProgress: false,
    });
  }),

  // Subida de reporte (off-chain, autenticada). Devuelve hash + url para la tx.
  http.post(`${base}/projects/:address/milestones/:index/report`, () =>
    HttpResponse.json({
      reportId: 99,
      reportUrl: "http://localhost:4000/reports/99",
      reportHash: "0x" + "99".repeat(32),
    }),
  ),
];
