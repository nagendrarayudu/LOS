import { PrismaClient, GLAccountClass } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Chart of accounts, ported from the BIAB (Bank In A Box) CBS navigation prototype's
// chart-of-accounts sample generator — a 3-level IFRS-aligned bank GL tree (main group ->
// sub group -> posting group). `parentCode` is resolved to a real `parentId` below.
type GlAccountSeed = {
  code: string;
  name: string;
  cls: GLAccountClass;
  level: number;
  parentCode: string | null;
  isLeaf: boolean;
  normalBalance: string | null;
  currency: string | null;
  mapLabel: string | null;
  subGroup: string | null;
  notes: string | null;
  rangeFrom: string | null;
  rangeTo: string | null;
};

const GL_ACCOUNTS: GlAccountSeed[] = JSON.parse(readFileSync(join(__dirname, "data/gl-accounts.json"), "utf8"));

async function main() {
  const idByCode = new Map<string, string>();
  for (const row of GL_ACCOUNTS) {
    const { parentCode, ...data } = row;
    const account = await prisma.gLAccount.upsert({
      where: { code: row.code },
      update: data,
      create: data,
    });
    idByCode.set(row.code, account.id);
  }
  for (const row of GL_ACCOUNTS) {
    if (!row.parentCode) continue;
    const parentId = idByCode.get(row.parentCode);
    if (!parentId) continue;
    await prisma.gLAccount.update({ where: { code: row.code }, data: { parentId } });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${GL_ACCOUNTS.length} GL accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
