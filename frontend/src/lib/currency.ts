export type CurrencyConfig = {
  name: string
  code: string
  symbol: string
  locale: string
  lakhCr?: boolean
}

export const CURRENCY_BY_COUNTRY: Record<string, CurrencyConfig> = {
  IN: { name: 'India', code: 'INR', symbol: '₹', locale: 'en-IN', lakhCr: true },
  US: { name: 'United States', code: 'USD', symbol: '$', locale: 'en-US' },
  GB: { name: 'United Kingdom', code: 'GBP', symbol: '£', locale: 'en-US' },
  CA: { name: 'Canada', code: 'CAD', symbol: 'C$', locale: 'en-US' },
  AU: { name: 'Australia', code: 'AUD', symbol: 'A$', locale: 'en-US' },
  AE: { name: 'United Arab Emirates', code: 'AED', symbol: 'AED ', locale: 'en-US' },
  SG: { name: 'Singapore', code: 'SGD', symbol: 'S$', locale: 'en-US' },
  SA: { name: 'Saudi Arabia', code: 'SAR', symbol: 'SAR ', locale: 'en-US' },
  ZA: { name: 'South Africa', code: 'ZAR', symbol: 'R', locale: 'en-US' },
  NG: { name: 'Nigeria', code: 'NGN', symbol: '₦', locale: 'en-US' },
  KE: { name: 'Kenya', code: 'KES', symbol: 'KSh ', locale: 'en-US' },
  GH: { name: 'Ghana', code: 'GHS', symbol: 'GH₵', locale: 'en-US' },
  EG: { name: 'Egypt', code: 'EGP', symbol: 'E£', locale: 'en-US' },
  TZ: { name: 'Tanzania', code: 'TZS', symbol: 'TSh ', locale: 'en-US' },
  MY: { name: 'Malaysia', code: 'MYR', symbol: 'RM', locale: 'en-US' },
  NP: { name: 'Nepal', code: 'NPR', symbol: 'Rs ', locale: 'en-US' },
  BD: { name: 'Bangladesh', code: 'BDT', symbol: '৳', locale: 'en-US' },
  LK: { name: 'Sri Lanka', code: 'LKR', symbol: 'Rs ', locale: 'en-US' },
  PK: { name: 'Pakistan', code: 'PKR', symbol: 'Rs ', locale: 'en-US' },
  DE: { name: 'Germany', code: 'EUR', symbol: '€', locale: 'en-US' },
  FR: { name: 'France', code: 'EUR', symbol: '€', locale: 'en-US' },
  BR: { name: 'Brazil', code: 'BRL', symbol: 'R$', locale: 'en-US' },
  MX: { name: 'Mexico', code: 'MXN', symbol: '$', locale: 'en-US' },
  NZ: { name: 'New Zealand', code: 'NZD', symbol: 'NZ$', locale: 'en-US' },
}

export function formatMoney(amount: number, cur: CurrencyConfig): string {
  const n = Math.round(amount)
  const abs = Math.abs(n)
  if (cur.lakhCr) {
    if (abs >= 10000000) return `${cur.symbol}${(n / 10000000).toFixed(2)} Cr`
    if (abs >= 100000) return `${cur.symbol}${(n / 100000).toFixed(2)} L`
    return `${cur.symbol}${n.toLocaleString(cur.locale)}`
  }
  if (abs >= 1000000) return `${cur.symbol}${(n / 1000000).toFixed(2)}M`
  return `${cur.symbol}${n.toLocaleString(cur.locale)}`
}
