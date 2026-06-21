// Servicio de venta y reparto (US5). Las ofertas se leen del espejo; los pools y
// balances se leen on-chain en el momento (research.md 2) para reflejar lo realmente
// reclamable hoy (los reclamos queman FDT, asi que el balance vivo ya descuenta lo
// ya reclamado).
import type {
  ClaimableResponse,
  DistributionResponse,
  SaleOfferResponse,
} from "@shared/schemas/sale.schema";
import { projectContract, tokenContract } from "../blockchain/provider";
import * as saleOfferDao from "../daos/saleOffer.dao";
import * as projectDao from "../daos/project.dao";
import * as investmentDao from "../daos/investment.dao";
import { NotFoundException } from "../exceptions/common";

function proportionalShare(balance: bigint, totalSupply: bigint, pool: bigint): bigint {
  return totalSupply > 0n ? (pool * balance) / totalSupply : 0n;
}

export async function listOffers(projectAddress: string): Promise<SaleOfferResponse[]> {
  const offers = await saleOfferDao.listByProject(projectAddress);
  return offers.map((o) => o.toResponse());
}

export async function getDistribution(projectAddress: string): Promise<DistributionResponse> {
  const project = await projectDao.findByAddress(projectAddress);
  if (!project) throw new NotFoundException("Project not found");
  const info = project.toResponse();

  const projectC = projectContract(info.address);
  const token = tokenContract(info.tokenAddress);
  const [distributionPool, totalSupply] = await Promise.all([
    projectC.distributionPool() as Promise<bigint>,
    token.totalSupply() as Promise<bigint>,
  ]);

  const investors = await investmentDao.listInvestorsByProject(info.address);
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

export async function getClaimable(wallet: string): Promise<ClaimableResponse> {
  const projectAddresses = await investmentDao.listProjectsByInvestor(wallet);
  const items: ClaimableResponse["items"] = [];

  for (const address of projectAddresses) {
    const project = await projectDao.findByAddress(address);
    if (!project) continue;
    const info = project.toResponse();

    const token = tokenContract(info.tokenAddress);
    const balance = (await token.balanceOf(wallet)) as bigint;
    if (balance === 0n) continue;

    const projectC = projectContract(info.address);
    let pool: bigint;
    let type: "Refund" | "Distribution";
    if (info.status === "Cancelled") {
      pool = (await projectC.refundPool()) as bigint;
      type = "Refund";
    } else if (info.status === "Completed" && info.projectType === "Investment") {
      pool = (await projectC.distributionPool()) as bigint;
      type = "Distribution";
    } else {
      continue;
    }

    const totalSupply = (await token.totalSupply()) as bigint;
    const amount = proportionalShare(balance, totalSupply, pool);
    if (amount > 0n) {
      items.push({ projectAddress: info.address, type, amount: amount.toString() });
    }
  }

  return { wallet: wallet.toLowerCase(), items };
}
