import { http, HttpResponse } from "msw";
import { env } from "@/lib/env";
import { mockProjects } from "../fixtures";

const base = env.apiUrl;
const ETH = (n: number) => (BigInt(Math.round(n * 1000)) * 10n ** 15n).toString();

function proposalsFor(address: string) {
  if (address !== mockProjects[0].address) return [];
  return [
    {
      governorProposalId: 2,
      kind: "Milestone",
      refId: 1,
      snapshotBlock: "1000500",
      totalPowerAtSnapshot: ETH(14),
      deadline: new Date(Date.now() + 45_000).toISOString(),
      extended: false,
      votesFor: ETH(6),
      votesAgainst: ETH(2),
      weightVoted: ETH(8),
      quorumBps: 5100,
      approvalThresholdBps: 5100,
      quorumReached: true,
      status: "Active",
      result: "None",
      electedArbiter: null,
    },
  ];
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
