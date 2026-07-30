-- CreateTable
CREATE TABLE "LoanParameter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "processingFeePercent" DECIMAL(5,2) NOT NULL,
    "gstPercent" DECIMAL(5,2) NOT NULL,
    "penalInterestPercent" DECIMAL(5,2) NOT NULL,
    "foreclosurePercent" DECIMAL(5,2) NOT NULL,
    "bounceChargeAmount" DECIMAL(10,2) NOT NULL,
    "lateFeeAmount" DECIMAL(10,2) NOT NULL,
    "coolingOffDays" INTEGER NOT NULL DEFAULT 3,
    "moratoriumMonths" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankParameter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cbsCode" TEXT NOT NULL,
    "ifscPrefix" TEXT NOT NULL,
    "baseRatePercent" DECIMAL(5,2) NOT NULL,
    "singleApproverCeiling" DECIMAL(14,2) NOT NULL,
    "makerCheckerCeiling" DECIMAL(14,2) NOT NULL,
    "committeeQuorum" INTEGER NOT NULL,
    "committeeSize" INTEGER NOT NULL,
    "neftCutoffTime" TEXT NOT NULL,
    "workingDays" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER NOT NULL,
    "maxDbrPercent" DECIMAL(5,2) NOT NULL,
    "defaultMaxLtvPercent" DECIMAL(5,2) NOT NULL,
    "minCibilScore" INTEGER NOT NULL,
    "minCompositeScoreAutoApprove" INTEGER NOT NULL,
    "requireKyc" BOOLEAN NOT NULL DEFAULT true,
    "blockActiveDefault" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanParameter_tenantId_key" ON "LoanParameter"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BankParameter_tenantId_key" ON "BankParameter"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPolicy_tenantId_key" ON "LoanPolicy"("tenantId");

-- AddForeignKey
ALTER TABLE "LoanParameter" ADD CONSTRAINT "LoanParameter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankParameter" ADD CONSTRAINT "BankParameter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPolicy" ADD CONSTRAINT "LoanPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
