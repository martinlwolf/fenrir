import { z } from "zod";
import { api } from "@/lib/api";
import {
  arbiterResponseSchema,
  proposalResponseSchema,
  votingPowerResponseSchema,
  type ArbiterResponse,
  type ProposalResponse,
  type VotingPowerResponse,
} from "@shared/schemas/proposal.schema";
import { getInvestments } from "./investors.service";
import { sameAddress } from "@/lib/format";

export async function listProposals(address: string): Promise<ProposalResponse[]> {
  const { data } = await api.get(`/projects/${address}/proposals`);
  return z.array(proposalResponseSchema).parse(data);
}

export async function getProposal(
  address: string,
  proposalId: number,
): Promise<ProposalResponse> {
  const { data } = await api.get(`/projects/${address}/proposals/${proposalId}`);
  return proposalResponseSchema.parse(data);
}

export async function getVotingPower(
  address: string,
  proposalId: number,
  wallet: string,
): Promise<VotingPowerResponse> {
  const { data } = await api.get(
    `/projects/${address}/proposals/${proposalId}/voting-power`,
    { params: { wallet } },
  );
  return votingPowerResponseSchema.parse(data);
}

export async function getArbiter(address: string): Promise<ArbiterResponse> {
  const { data } = await api.get(`/projects/${address}/arbiter`);
  return arbiterResponseSchema.parse(data);
}

/** Una propuesta de un proyecto donde la wallet es inversora, con si puede votarla. */
export interface MyProposal {
  projectAddress: string;
  proposal: ProposalResponse;
  /** La wallet puede votar esta propuesta ahora (Active, con poder y sin voto previo). */
  canVote: boolean;
  /** La wallet es el arbitro del proyecto (habilita el desempate de propuestas trabadas). */
  isArbiter: boolean;
}

// Trae TODAS las propuestas de los proyectos donde la wallet invirtio, marcando cuales
// puede votar y si la wallet es el arbitro del proyecto. El watcher de notificaciones usa
// esto para avisar a CADA inversor de un proyecto apenas se abre una votacion (aunque no
// tenga poder de voto, p.ej. el hito 0), cuando se resuelve, y al arbitro cuando una
// propuesta queda trabada esperando su desempate. Solo orquesta lecturas que el backend ya
// resolvio; no decide negocio.
export async function listMyProposals(wallet: string): Promise<MyProposal[]> {
  const investments = await getInvestments(wallet);
  const projectAddresses = [...new Set(investments.map((i) => i.projectAddress))];

  const perProject = await Promise.all(
    projectAddresses.map(async (address) => {
      const [proposals, arbiter] = await Promise.all([
        listProposals(address),
        getArbiter(address).catch(() => null),
      ]);
      const isArbiter = sameAddress(arbiter?.currentArbiter, wallet);
      return Promise.all(
        proposals.map(async (proposal) => {
          let canVote = false;
          if (proposal.status === "Active") {
            try {
              const vp = await getVotingPower(address, proposal.governorProposalId, wallet);
              canVote = vp.votingPower !== "0" && !vp.hasVoted;
            } catch {
              // si falla el voting-power puntual, lo tratamos como no-votable
            }
          }
          return { projectAddress: address, proposal, canVote, isArbiter };
        }),
      );
    }),
  );

  return perProject.flat();
}
