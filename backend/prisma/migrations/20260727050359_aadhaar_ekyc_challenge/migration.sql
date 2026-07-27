-- CreateTable
CREATE TABLE "AadhaarEkycChallenge" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "aadhaarNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "otpHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AadhaarEkycChallenge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AadhaarEkycChallenge" ADD CONSTRAINT "AadhaarEkycChallenge_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
