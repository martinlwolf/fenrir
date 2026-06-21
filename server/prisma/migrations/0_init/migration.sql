-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('Investment', 'Civic');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Funding', 'Building', 'Selling', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('Pending', 'Declared', 'Voting', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('Voting', 'Approved', 'Rejected', 'Refunded', 'Executed');

-- CreateEnum
CREATE TYPE "VotingMode" AS ENUM ('ByToken', 'OneWalletOneVote');

-- CreateEnum
CREATE TYPE "ProposalKind" AS ENUM ('ArbiterElection', 'Milestone', 'SaleOffer');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('Active', 'AwaitingArbiter', 'Resolved');

-- CreateEnum
CREATE TYPE "ProposalResult" AS ENUM ('None', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('Completion', 'Failure');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('Refund', 'Distribution');

-- CreateTable
CREATE TABLE "Developer" (
    "wallet" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "verificationDocsUrl" TEXT,
    "registeredAtBlock" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "Project" (
    "address" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "governorAddress" TEXT NOT NULL,
    "developerWallet" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "votingMode" "VotingMode" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'Funding',
    "fmpa" DECIMAL(78,0) NOT NULL,
    "ff" DECIMAL(78,0) NOT NULL,
    "totalRaised" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "totalReleasedToDeveloper" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "estimatedSalePrice" DECIMAL(78,0) NOT NULL,
    "salePrice" DECIMAL(78,0),
    "fundingDeadline" TIMESTAMP(3) NOT NULL,
    "penaltyAccumulatedBps" INTEGER NOT NULL DEFAULT 0,
    "currentArbiter" TEXT,
    "currentMilestoneIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAtBlock" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" SERIAL NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "milestoneIndex" INTEGER NOT NULL,
    "budget" DECIMAL(78,0) NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'Pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "trancheReleased" BOOLEAN NOT NULL DEFAULT false,
    "reportHash" TEXT,
    "reportUrl" TEXT,
    "proposalId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneReport" (
    "id" SERIAL NOT NULL,
    "milestoneId" INTEGER,
    "projectAddress" TEXT NOT NULL,
    "milestoneIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "mediaUrls" TEXT[],
    "documentUrls" TEXT[],
    "computedHash" TEXT NOT NULL,
    "onChainHash" TEXT,
    "hashMatch" BOOLEAN,
    "storageRef" TEXT NOT NULL,
    "createdByWallet" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" SERIAL NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "investorWallet" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "block" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" SERIAL NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "governorProposalId" INTEGER NOT NULL,
    "kind" "ProposalKind" NOT NULL,
    "refId" INTEGER NOT NULL,
    "snapshotBlock" BIGINT NOT NULL,
    "totalPowerAtSnapshot" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3) NOT NULL,
    "extended" BOOLEAN NOT NULL DEFAULT false,
    "votesFor" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "votesAgainst" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "weightVoted" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "status" "ProposalStatus" NOT NULL DEFAULT 'Active',
    "result" "ProposalResult" NOT NULL DEFAULT 'None',
    "electedArbiter" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "voterWallet" TEXT NOT NULL,
    "weight" DECIMAL(78,0) NOT NULL,
    "support" BOOLEAN,
    "candidate" TEXT,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "block" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleOffer" (
    "id" SERIAL NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "offerId" INTEGER NOT NULL,
    "buyerWallet" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "proposalId" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'Voting',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationCertificate" (
    "id" SERIAL NOT NULL,
    "developerWallet" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "mintedAtBlock" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" SERIAL NOT NULL,
    "projectAddress" TEXT NOT NULL,
    "investorWallet" TEXT NOT NULL,
    "type" "ClaimType" NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "block" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionCursor" (
    "id" TEXT NOT NULL,
    "lastProcessedBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("txHash","logIndex")
);

-- CreateTable
CREATE TABLE "AuthNonce" (
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("wallet")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_cuit_key" ON "Developer"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tokenAddress_key" ON "Project"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Project_governorAddress_key" ON "Project"("governorAddress");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "Project_developerWallet_idx" ON "Project"("developerWallet");

-- CreateIndex
CREATE INDEX "Milestone_projectAddress_idx" ON "Milestone"("projectAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectAddress_milestoneIndex_key" ON "Milestone"("projectAddress", "milestoneIndex");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneReport_milestoneId_key" ON "MilestoneReport"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneReport_projectAddress_milestoneIndex_idx" ON "MilestoneReport"("projectAddress", "milestoneIndex");

-- CreateIndex
CREATE INDEX "Investment_projectAddress_idx" ON "Investment"("projectAddress");

-- CreateIndex
CREATE INDEX "Investment_investorWallet_idx" ON "Investment"("investorWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_txHash_logIndex_key" ON "Investment"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "Proposal_projectAddress_idx" ON "Proposal"("projectAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_projectAddress_governorProposalId_key" ON "Proposal"("projectAddress", "governorProposalId");

-- CreateIndex
CREATE INDEX "Vote_proposalId_idx" ON "Vote"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_proposalId_voterWallet_key" ON "Vote"("proposalId", "voterWallet");

-- CreateIndex
CREATE INDEX "SaleOffer_projectAddress_idx" ON "SaleOffer"("projectAddress");

-- CreateIndex
CREATE UNIQUE INDEX "SaleOffer_projectAddress_offerId_key" ON "SaleOffer"("projectAddress", "offerId");

-- CreateIndex
CREATE INDEX "ReputationCertificate_developerWallet_idx" ON "ReputationCertificate"("developerWallet");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationCertificate_type_tokenId_key" ON "ReputationCertificate"("type", "tokenId");

-- CreateIndex
CREATE INDEX "Claim_projectAddress_idx" ON "Claim"("projectAddress");

-- CreateIndex
CREATE INDEX "Claim_investorWallet_idx" ON "Claim"("investorWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_txHash_logIndex_key" ON "Claim"("txHash", "logIndex");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_developerWallet_fkey" FOREIGN KEY ("developerWallet") REFERENCES "Developer"("wallet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "Project"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReport" ADD CONSTRAINT "MilestoneReport_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "Project"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "Project"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOffer" ADD CONSTRAINT "SaleOffer_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "Project"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationCertificate" ADD CONSTRAINT "ReputationCertificate_developerWallet_fkey" FOREIGN KEY ("developerWallet") REFERENCES "Developer"("wallet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES "Project"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

