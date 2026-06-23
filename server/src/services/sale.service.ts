// Servicio de venta y reparto (US5). Las ofertas se leen del espejo; los pools y
// balances se leen on-chain en el momento (research.md 2) para reflejar lo realmente
// reclamable hoy (los reclamos queman FDT, asi que el balance vivo ya descuenta lo
// ya reclamado).
import type {
  ClaimableResponse,
  DistributionResponse,
  SaleOfferResponse,
} from "@shared/schemas/sale.schema";
import type { Contract } from "ethers";
import { NotFoundException } from "../exceptions/common.exception";
import { projectContract, tokenContract } from "../models/onchain/provider";
import { InvestmentRepository, investmentRepository } from "../persistence/repositories/investment.repository";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { SaleOfferRepository, saleOfferRepository } from "../persistence/repositories/saleOffer.repository";

// Strategy de reclamo: como cada (estado, tipo) de proyecto define de que pool se
// reclama y de que tipo es el reclamo. Reemplaza el if/else por (status, projectType)
// por una tabla extensible (analista-patrones, hallazgo B).
interface ClaimRule {
  type: "Refund" | "Distribution";
  readPool: (project: Contract) => Promise<bigint>;
}

function proportionalShare(balance: bigint, totalSupply: bigint, pool: bigint): bigint {
  return totalSupply > 0n ? (pool * balance) / totalSupply : 0n;
}

export class SaleService {
  // Clave: `status` o `status:projectType` (mas especifica gana). Agregar un nuevo
  // modo de reparto es agregar una entrada aca, sin tocar getClaimable.
  private readonly claimRules: Record<string, ClaimRule | undefined> = {
    Cancelled: { type: "Refund", readPool: (p) => p.refundPool() as Promise<bigint> },
    "Completed:Investment": {
      type: "Distribution",
      readPool: (p) => p.distributionPool() as Promise<bigint>,
    },
  };

  constructor(
    private readonly offers: SaleOfferRepository = saleOfferRepository,
    private readonly projects: ProjectRepository = projectRepository,
    private readonly investments: InvestmentRepository = investmentRepository,
  ) { }

  async listOffers(projectAddress: string): Promise<SaleOfferResponse[]> {
    const offers = await this.offers.listByProject(projectAddress);
    return offers.map((o) => o.toResponse());
  }

  async getDistribution(projectAddress: string): Promise<DistributionResponse> {
    const project = await this.projects.findByAddress(projectAddress);
    if (!project) throw new NotFoundException("Project not found");
    const info = project.toResponse();

    const projectC = projectContract(info.address);
    const token = tokenContract(info.tokenAddress);
    const [distributionPool, totalSupply] = await Promise.all([
      projectC.distributionPool() as Promise<bigint>,
      token.totalSupply() as Promise<bigint>,
    ]);

    const investors = await this.investments.listInvestorsByProject(info.address);
    const shares = [];
    for (const investor of investors) {
      const balance = (await token.balanceOf(investor)) as bigint;
      shares.push({
        investorWallet: investor,
        fdtBalance: balance.toString(),
        claimable: proportionalShare(balance, totalSupply, distributionPool).toString(),
      });
    }

    return {
      projectAddress: info.address,
      salePrice: info.salePrice,
      distributionPool: distributionPool.toString(),
      shares,
    };
  }

  async getClaimable(wallet: string): Promise<ClaimableResponse> {
    const projectAddresses = await this.investments.listProjectsByInvestor(wallet);
    const items: ClaimableResponse["items"] = [];

    for (const address of projectAddresses) {
      const project = await this.projects.findByAddress(address);
      if (!project) continue;
      const info = project.toResponse();

      const rule =
        this.claimRules[info.status] ?? this.claimRules[`${info.status}:${info.projectType}`];
      if (!rule) continue;

      const token = tokenContract(info.tokenAddress);
      const balance = (await token.balanceOf(wallet)) as bigint;
      if (balance === 0n) continue;

      const projectC = projectContract(info.address);
      const [pool, totalSupply] = await Promise.all([
        rule.readPool(projectC),
        token.totalSupply() as Promise<bigint>,
      ]);

      const amount = proportionalShare(balance, totalSupply, pool);
      if (amount > 0n) {
        items.push({ projectAddress: info.address, type: rule.type, amount: amount.toString() });
      }
    }

    return { wallet: wallet.toLowerCase(), items };
  }
}

export const saleService = new SaleService();
