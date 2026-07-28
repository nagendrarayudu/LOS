-- CreateTable
CREATE TABLE "DigilockerRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DigilockerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigilockerRequest_requestId_key" ON "DigilockerRequest"("requestId");

-- AddForeignKey
ALTER TABLE "DigilockerRequest" ADD CONSTRAINT "DigilockerRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
