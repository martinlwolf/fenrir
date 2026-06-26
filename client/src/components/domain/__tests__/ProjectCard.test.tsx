import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "../ProjectCard";
import type { ProjectResponse } from "@shared/schemas/project.schema";

const project: ProjectResponse = {
  address: "0x" + "a1".repeat(20),
  tokenAddress: "0x" + "b1".repeat(20),
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
};

describe("ProjectCard", () => {
  it("muestra tipo y estado del proyecto", () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Inversión")).toBeInTheDocument();
    expect(screen.getByText("En fondeo")).toBeInTheDocument();
  });
});
