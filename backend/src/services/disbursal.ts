import crypto from "node:crypto";
import { seededRandom } from "../lib/seededRandom.js";

export function simulatePennyDrop(accountNumber: string, attempt: number): boolean {
  if (!/^\d{9,18}$/.test(accountNumber)) return false;
  const rand = seededRandom(`pennydrop:${accountNumber}:${attempt}`);
  return rand() > 0.08; // ~92% success rate per attempt
}

export function generateUtr(): string {
  return `UTR${new Date().getFullYear()}${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export function generateNeftBatchFile(row: {
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  amount: number;
  applicationNumber: string;
  utrReference: string | null;
}): string {
  const header = "BENEFICIARY_NAME|ACCOUNT_NUMBER|IFSC|AMOUNT|NARRATION|REFERENCE";
  const line = [
    row.beneficiaryName,
    row.accountNumber,
    row.ifsc,
    row.amount.toFixed(2),
    `Loan disbursal ${row.applicationNumber}`,
    row.utrReference ?? "",
  ].join("|");
  return `${header}\n${line}\n`;
}
