import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "../ProjectCard";
import { WalletProvider } from "@/providers/WalletProvider";
import type { ProjectResponse } from "@shared/schemas/project.schema";

const project: ProjectResponse = {
  address: "0x" + "a1".repeat(20),
  tokenAddress: "0x" + "b1".repeat(20),
  tokenName: "Edificio Roca",
  tokenSymbol: "ROCA",
  developerRazonSocial: "Constructora del Norte S.A.",
  investorCount: 12,
  governorAddress: "0x" + "c1".repeat(20),
  developerWallet: "0x" + "d1".repeat(20),
  projectType: "Investment",
  votingMode: "ByToken",
  status: "Funding",
  fmpa: "10000000000000000000",
  ff: "40000000000000000000",
  totalRaised: "14000000000000000000",
  totalReleasedToDeveloper: "0",
  estimatedSalePrice: "0",
  salePrice: null,
  fundingDeadline: new Date().toISOString(),
  penaltyAccumulatedBps: 0,
  currentArbiter: null,
  currentMilestoneIndex: 0,
  // Campos derivados que ahora el backend embebe (el front no los calcula).
  fundedBps: 3500,
  fundingOpen: true,
  display: { label: "En fondeo", variant: "warning" },
  viewer: {
    role: "anonymous",
    isDeveloper: false,
    isArbiter: false,
    isInvestor: false,
    capabilities: {
      invest: { allowed: false, reason: "Conectá tu wallet para invertir" },
      claimCommission: {
        allowed: false,
        reason: "Solo el desarrollador puede reclamar la comisión",
      },
      canExecuteSale: { allowed: false, reason: "Datos de venta no disponibles" },
    },
  },
};

// ProjectCard consume react-query (useInvestments) y el contexto de wallet (useMembership),
// asi que se renderiza envuelto en sus providers.
function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <MemoryRouter>
          <ProjectCard project={project} />
        </MemoryRouter>
      </WalletProvider>
    </QueryClientProvider>,
  );
}

describe("ProjectCard", () => {
  it("muestra tipo y estado del proyecto", () => {
    renderCard();
    expect(screen.getByText("Inversión")).toBeInTheDocument();
    expect(screen.getByText("En fondeo")).toBeInTheDocument();
  });
});
