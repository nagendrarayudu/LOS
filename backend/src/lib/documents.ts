export type DocTag =
  | "identity"
  | "income"
  | "property"
  | "vehicle"
  | "gold"
  | "biz-id"
  | "biz-fin"
  | "biz-kyc"
  | "biz-prop";

export type DocDefinition = { id: string; label: string; hint: string; tag: DocTag };

export const DOC_LIBRARY: Record<string, DocDefinition> = {
  photo: { id: "photo", label: "Passport-size photograph", hint: "Recent, white background", tag: "identity" },
  pan: { id: "pan", label: "PAN card", hint: "Permanent Account Number", tag: "identity" },
  aadhaar: { id: "aadhaar", label: "Aadhaar card", hint: "Front & back, or eKYC", tag: "identity" },
  address_proof: { id: "address_proof", label: "Address proof", hint: "Utility bill or rent agreement, < 3 months old", tag: "identity" },
  salary_slip: { id: "salary_slip", label: "Salary slips", hint: "Last 3 months", tag: "income" },
  bank_statement: { id: "bank_statement", label: "Bank statement", hint: "Last 6 months", tag: "income" },
  form16: { id: "form16", label: "Form 16", hint: "Latest assessment year", tag: "income" },
  itr: { id: "itr", label: "Income tax returns", hint: "Last 2 years", tag: "income" },
  employment_letter: { id: "employment_letter", label: "Employment letter", hint: "Current employer, on letterhead", tag: "income" },
  sale_deed: { id: "sale_deed", label: "Sale deed", hint: "Registered property sale deed", tag: "property" },
  ec: { id: "ec", label: "Encumbrance certificate", hint: "Last 13 years", tag: "property" },
  approved_plan: { id: "approved_plan", label: "Approved building plan", hint: "Municipality-approved", tag: "property" },
  property_valuation: { id: "property_valuation", label: "Property valuation report", hint: "From an empanelled valuer", tag: "property" },
  vehicle_quotation: { id: "vehicle_quotation", label: "Vehicle proforma invoice", hint: "From the dealer", tag: "vehicle" },
  vehicle_rc: { id: "vehicle_rc", label: "Vehicle registration certificate", hint: "Required for used vehicles", tag: "vehicle" },
  gold_appraisal: { id: "gold_appraisal", label: "Gold appraisal certificate", hint: "From bank-empanelled appraiser", tag: "gold" },
  gold_photo: { id: "gold_photo", label: "Photograph of gold ornaments", hint: "Itemised, with weight", tag: "gold" },
  biz_pan: { id: "biz_pan", label: "Business PAN", hint: "Firm / company PAN", tag: "biz-id" },
  coi_moa: { id: "coi_moa", label: "Certificate of incorporation / MOA-AOA", hint: "For companies & LLPs", tag: "biz-id" },
  gst: { id: "gst", label: "GST registration certificate", hint: "GSTIN", tag: "biz-id" },
  udyam: { id: "udyam", label: "Udyam / MSME registration", hint: "Udyam registration certificate", tag: "biz-id" },
  gst_returns: { id: "gst_returns", label: "GST returns", hint: "Last 12 months", tag: "biz-fin" },
  audited_bs: { id: "audited_bs", label: "Audited balance sheet & P&L", hint: "Last 2 financial years", tag: "biz-fin" },
  biz_bank_statement: { id: "biz_bank_statement", label: "Business bank statement", hint: "Last 12 months", tag: "biz-fin" },
  board_resolution: { id: "board_resolution", label: "Board resolution", hint: "Authorising the loan application", tag: "biz-kyc" },
  director_aadhaar: { id: "director_aadhaar", label: "Director / partner Aadhaar", hint: "For all signatories", tag: "biz-kyc" },
  director_pan: { id: "director_pan", label: "Director / partner PAN", hint: "For all signatories", tag: "biz-kyc" },
  business_address_proof: { id: "business_address_proof", label: "Business address proof", hint: "Utility bill or lease deed", tag: "biz-prop" },
};

export type ApplicantType = "INDIVIDUAL" | "ENTERPRISE";

export type SchemeDocRequirement = { required: string[]; optional: string[] };

export const SCHEME_DOCS: Record<string, Record<ApplicantType, SchemeDocRequirement>> = {
  gold: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "gold_appraisal", "gold_photo"], optional: ["address_proof"] },
    ENTERPRISE: { required: ["photo", "pan", "aadhaar", "gold_appraisal", "gold_photo", "biz_pan"], optional: ["gst"] },
  },
  personal: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "salary_slip", "bank_statement"], optional: ["form16", "itr", "employment_letter"] },
    ENTERPRISE: { required: ["photo", "pan", "aadhaar", "bank_statement", "itr"], optional: ["gst"] },
  },
  msme: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "biz_pan", "gst", "bank_statement", "itr"], optional: ["udyam"] },
    ENTERPRISE: {
      required: ["biz_pan", "coi_moa", "gst", "udyam", "audited_bs", "gst_returns", "biz_bank_statement", "board_resolution", "director_aadhaar", "director_pan"],
      optional: ["business_address_proof"],
    },
  },
  housing: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "salary_slip", "form16", "sale_deed", "ec", "approved_plan"], optional: ["itr", "property_valuation"] },
    ENTERPRISE: { required: ["photo", "pan", "aadhaar", "biz_pan", "gst", "bank_statement", "sale_deed", "ec", "approved_plan"], optional: ["audited_bs"] },
  },
  lap: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "salary_slip", "bank_statement", "sale_deed", "ec", "property_valuation"], optional: ["itr", "form16"] },
    ENTERPRISE: { required: ["biz_pan", "gst", "audited_bs", "biz_bank_statement", "sale_deed", "ec", "property_valuation"], optional: ["board_resolution"] },
  },
  vehicle: {
    INDIVIDUAL: { required: ["photo", "pan", "aadhaar", "salary_slip", "bank_statement", "vehicle_quotation"], optional: ["itr", "vehicle_rc"] },
    ENTERPRISE: { required: ["photo", "pan", "aadhaar", "biz_pan", "gst", "bank_statement", "vehicle_quotation"], optional: ["vehicle_rc"] },
  },
};
