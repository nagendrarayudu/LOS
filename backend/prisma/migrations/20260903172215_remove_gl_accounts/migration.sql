-- DropForeignKey
ALTER TABLE "GLAccount" DROP CONSTRAINT "GLAccount_parentId_fkey";

-- DropForeignKey
ALTER TABLE "GLAccount" DROP CONSTRAINT "GLAccount_tenantId_fkey";

-- DropTable
DROP TABLE "GLAccount";

-- DropEnum
DROP TYPE "GLAccountClass";

