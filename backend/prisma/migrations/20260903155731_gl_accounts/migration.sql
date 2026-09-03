-- CreateEnum
CREATE TYPE "GLAccountClass" AS ENUM ('ASSETS', 'LIABILITIES', 'EQUITY', 'INCOME', 'EXPENSES', 'CONTINGENT');

-- CreateTable
CREATE TABLE "GLAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cls" "GLAccountClass" NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "normalBalance" TEXT,
    "currency" TEXT,
    "mapLabel" TEXT,
    "subGroup" TEXT,
    "notes" TEXT,
    "rangeFrom" TEXT,
    "rangeTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GLAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GLAccount_tenantId_code_key" ON "GLAccount"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "GLAccount" ADD CONSTRAINT "GLAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GLAccount" ADD CONSTRAINT "GLAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GLAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
