import { PrismaClient, SchemeCategory, StaffRole, RepaymentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Passw0rd!";

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
  { name: "Anita Rao", email: "admin@sahayog.coop", role: "ADMIN", branch: "Head Office" },
  { name: "Ravi Kumar", email: "officer@sahayog.coop", role: "LOAN_OFFICER", branch: "Khammam Main" },
  { name: "Lakshmi Prasad", email: "officer2@sahayog.coop", role: "LOAN_OFFICER", branch: "Wyra" },
  { name: "Sunita Iyer", email: "manager@sahayog.coop", role: "MANAGER", branch: "Khammam Main", approvalLimit: 2500000 },
  { name: "Mohan Reddy", email: "manager2@sahayog.coop", role: "MANAGER", branch: "Wyra", approvalLimit: 1500000 },
  { name: "Devendra Singh", email: "committee1@sahayog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Farida Khan", email: "committee2@sahayog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Arjun Mehta", email: "committee3@sahayog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Priya Subramaniam", email: "committee4@sahayog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Karan Bose", email: "committee5@sahayog.coop", role: "COMMITTEE_MEMBER", branch: "Head Office", approvalLimit: 20000000 },
  { name: "Meera Nair", email: "disbursal@sahayog.coop", role: "DISBURSAL_OFFICER", branch: "Head Office" },
];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "sahayog" },
    update: {},
    create: { slug: "sahayog", name: "Sahayog Cooperative Bank" },
  });

  for (const scheme of SCHEMES) {
    await prisma.scheme.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: scheme.key } },
      update: { ...scheme },
      create: { ...scheme, tenantId: tenant.id },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of STAFF_USERS) {
    await prisma.staffUser.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, branch: user.branch, approvalLimit: user.approvalLimit },
      create: { ...user, tenantId: tenant.id, passwordHash },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded tenant "${tenant.name}" with ${SCHEMES.length} schemes and ${STAFF_USERS.length} staff users.`);
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
