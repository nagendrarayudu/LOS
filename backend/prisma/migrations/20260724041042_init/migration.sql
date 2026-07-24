-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'LOAN_OFFICER', 'MANAGER', 'COMMITTEE_MEMBER', 'DISBURSAL_OFFICER');

-- CreateEnum
CREATE TYPE "SchemeCategory" AS ENUM ('SECURED', 'UNSECURED');

-- CreateEnum
CREATE TYPE "RepaymentType" AS ENUM ('REDUCING', 'BULLET');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'NEW_LEAD', 'DOCS_PENDING', 'MAKER_REVIEW', 'COMMITTEE_REVIEW', 'SANCTIONED', 'DISBURSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('INDIVIDUAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SanctionLevel" AS ENUM ('MAKER', 'CHECKER', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "SanctionDecisionType" AS ENUM ('RECOMMENDED', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DisbursalMethod" AS ENUM ('CBS', 'NEFT');

-- CreateEnum
CREATE TYPE "DisbursalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PennyDropStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "branch" TEXT,
    "approvalLimit" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "panNumber" TEXT,
    "panVerifiedAt" TIMESTAMP(3),
    "aadhaarLast4" TEXT,
    "aadhaarVerifiedAt" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "netIncome" DECIMAL(14,2),
    "cibilScore" INTEGER,
    "hasActiveDefault" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "kycVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SchemeCategory" NOT NULL,
    "repaymentType" "RepaymentType" NOT NULL DEFAULT 'REDUCING',
    "interestRate" DECIMAL(5,2) NOT NULL,
    "minAmount" DECIMAL(14,2) NOT NULL,
    "maxAmount" DECIMAL(14,2) NOT NULL,
    "minTenureMonths" INTEGER NOT NULL,
    "maxTenureMonths" INTEGER NOT NULL,
    "ltvPercent" DECIMAL(5,2),
    "tag" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "applicantType" "ApplicantType" NOT NULL DEFAULT 'INDIVIDUAL',
    "requestedAmount" DECIMAL(14,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "purpose" TEXT,
    "collateralValue" DECIMAL(14,2),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "branch" TEXT,
    "assignedOfficerId" TEXT,
    "emi" DECIMAL(14,2),
    "aprPercent" DECIMAL(5,2),
    "processingFeeAmount" DECIMAL(14,2),
    "totalInterest" DECIMAL(14,2),
    "totalPayable" DECIMAL(14,2),
    "netDisbursedAmount" DECIMAL(14,2),
    "kfsAcceptedAt" TIMESTAMP(3),
    "compositeScore" INTEGER,
    "autoRecommendation" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStatusEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditScoreComponent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "CreditScoreComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyCheck" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionDecision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "level" "SanctionLevel" NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decision" "SanctionDecisionType" NOT NULL,
    "sanctionedAmount" DECIMAL(14,2),
    "sanctionedTenureMonths" INTEGER,
    "sanctionedRate" DECIMAL(5,2),
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanctionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursal" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "method" "DisbursalMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "beneficiaryName" TEXT NOT NULL,
    "utrReference" TEXT,
    "pennyDropStatus" "PennyDropStatus" NOT NULL DEFAULT 'PENDING',
    "pennyDropAttempts" INTEGER NOT NULL DEFAULT 0,
    "neftFileGenerated" BOOLEAN NOT NULL DEFAULT false,
    "status" "DisbursalStatus" NOT NULL DEFAULT 'PENDING',
    "disbursedById" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disbursal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_mobile_key" ON "Customer"("tenantId", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_tenantId_key_key" ON "Scheme"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "LoanApplication_applicationNumber_key" ON "LoanApplication"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursal_applicationId_key" ON "Disbursal"("applicationId");

-- AddForeignKey
ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanApplication" ADD CONSTRAINT "LoanApplication_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStatusEvent" ADD CONSTRAINT "ApplicationStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditScoreComponent" ADD CONSTRAINT "CreditScoreComponent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyCheck" ADD CONSTRAINT "PolicyCheck_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SanctionDecision" ADD CONSTRAINT "SanctionDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SanctionDecision" ADD CONSTRAINT "SanctionDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursal" ADD CONSTRAINT "Disbursal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursal" ADD CONSTRAINT "Disbursal_disbursedById_fkey" FOREIGN KEY ("disbursedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
