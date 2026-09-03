import { PrismaClient, SchemeCategory, StaffRole, RepaymentType, GLAccountClass } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Passw0rd!";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Chart of accounts, ported from the BIAB (Bank In A Box) CBS prototype's chart-of-accounts
// sample generator — a 3-level IFRS-aligned bank GL tree (main group -> sub group -> posting
// group). `parentCode` is resolved to a real `parentId` in `seedGlAccounts` below.
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

async function seedGlAccounts(tenantId: string) {
  const idByCode = new Map<string, string>();
  for (const row of GL_ACCOUNTS) {
    const { parentCode, ...data } = row;
    const account = await prisma.gLAccount.upsert({
      where: { tenantId_code: { tenantId, code: row.code } },
      update: data,
      create: { ...data, tenantId },
    });
    idByCode.set(row.code, account.id);
  }
  for (const row of GL_ACCOUNTS) {
    if (!row.parentCode) continue;
    const parentId = idByCode.get(row.parentCode);
    if (!parentId) continue;
    await prisma.gLAccount.update({ where: { tenantId_code: { tenantId, code: row.code } }, data: { parentId } });
  }
}

const SCHEMES: Array<{
  key: string;
  name: string;
  category: SchemeCategory;
  repaymentType: RepaymentType;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  ltvPercent?: number;
  tag: string;
  description: string;
}> = [
  {
    key: "gold",
    name: "Gold loan",
    category: "SECURED",
    repaymentType: "BULLET",
    interestRate: 8.5,
    minAmount: 10000,
    maxAmount: 2500000,
    minTenureMonths: 3,
    maxTenureMonths: 36,
    ltvPercent: 75,
    tag: "Lowest rate",
    description: "Against gold ornaments & coins",
  },
  {
    key: "personal",
    name: "Personal loan",
    category: "UNSECURED",
    repaymentType: "REDUCING",
    interestRate: 11.25,
    minAmount: 25000,
    maxAmount: 1000000,
    minTenureMonths: 6,
    maxTenureMonths: 60,
    tag: "No collateral",
    description: "Unsecured, minimal documents",
  },
  {
    key: "msme",
    name: "MSME loan",
    category: "SECURED",
    repaymentType: "REDUCING",
    interestRate: 10.75,
    minAmount: 100000,
    maxAmount: 5000000,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    tag: "CGTMSE eligible",
    description: "Working capital / term loan for micro & small enterprises",
  },
  {
    key: "housing",
    name: "Housing loan",
    category: "SECURED",
    repaymentType: "REDUCING",
    interestRate: 9.15,
    minAmount: 300000,
    maxAmount: 7500000,
    minTenureMonths: 60,
    maxTenureMonths: 240,
    tag: "Upto 20 years",
    description: "Purchase, construction or renovation; CERSAI registered",
  },
  {
    key: "lap",
    name: "Loan against property",
    category: "SECURED",
    repaymentType: "REDUCING",
    interestRate: 9.75,
    minAmount: 200000,
    maxAmount: 5000000,
    minTenureMonths: 12,
    maxTenureMonths: 180,
    ltvPercent: 60,
    tag: "60% LTV",
    description: "Mortgage an existing residential or commercial property",
  },
  {
    key: "vehicle",
    name: "Vehicle loan",
    category: "SECURED",
    repaymentType: "REDUCING",
    interestRate: 9.5,
    minAmount: 50000,
    maxAmount: 1500000,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    tag: "New & used",
    description: "New & used vehicles, up to 7 years old",
  },
];

const STAFF_USERS: Array<{
  name: string;
  email: string;
  role: StaffRole;
  branch?: string;
  approvalLimit?: number;
}> = [
  { name: "Anita Rao", email: "admin@sahyog.coop", role: "ADMIN", branch: "Head Office" },
  { name: "Ravi Kumar", email: "officer@sahyog.coop", role: "LOAN_OFFICER", branch: "Khammam Main" },
  { name: "Lakshmi Prasad", email: "officer2@sahyog.coop", role: "LOAN_OFFICER", branch: "Wyra" },
  { name: "Sunita Iyer", email: "manager@sahyog.coop", role: "MANAGER", branch: "Khammam Main", approvalLimit: 2500000 },
  { name: "Mohan Reddy", email: "manager2@sahyog.coop", role: "MANAGER", branch: "Wyra", approvalLimit: 1500000 },
  { name: "Devendra Singh", email: "committee1@sahyog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Farida Khan", email: "committee2@sahyog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Arjun Mehta", email: "committee3@sahyog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Priya Subramaniam", email: "committee4@sahyog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Karan Bose", email: "committee5@sahyog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Meera Nair", email: "disbursal@sahyog.coop", role: "DISBURSAL_OFFICER", branch: "Head Office" },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "sahyog" },
    update: {},
    create: { slug: "sahyog", name: "Sahyog Cooperative Bank" },
  });

  for (const scheme of SCHEMES) {
    await prisma.scheme.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: scheme.key } },
      update: { ...scheme },
      create: { ...scheme, tenantId: tenant.id },
    });
  }

  await prisma.loanParameter.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      processingFeePercent: 1,
      gstPercent: 18,
      penalInterestPercent: 24,
      foreclosurePercent: 2,
      bounceChargeAmount: 500,
      lateFeeAmount: 250,
      coolingOffDays: 3,
      moratoriumMonths: 0,
    },
  });

  await prisma.bankParameter.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      bankName: "Sahyog Cooperative Bank",
      cbsCode: "SAHYOG01",
      ifscPrefix: "SHYG0",
      baseRatePercent: 8.5,
      singleApproverCeiling: 500000,
      makerCheckerCeiling: 2500000,
      committeeQuorum: 3,
      committeeSize: 5,
      neftCutoffTime: "16:30",
      workingDays: "Mon–Sat",
    },
  });

  await prisma.loanPolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      minAge: 21,
      maxAge: 58,
      maxDbrPercent: 50,
      defaultMaxLtvPercent: 80,
      minCibilScore: 650,
      minCompositeScoreAutoApprove: 65,
      requireKyc: true,
      blockActiveDefault: true,
    },
  });

  await seedGlAccounts(tenant.id);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of STAFF_USERS) {
    await prisma.staffUser.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, branch: user.branch, approvalLimit: user.approvalLimit },
      create: { ...user, tenantId: tenant.id, passwordHash },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded tenant "${tenant.name}" with ${SCHEMES.length} schemes, ${GL_ACCOUNTS.length} GL accounts and ${STAFF_USERS.length} staff users.`);
  // eslint-disable-next-line no-console
  console.log(`Demo staff password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
