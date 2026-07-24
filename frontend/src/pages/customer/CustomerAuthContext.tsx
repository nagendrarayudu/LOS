import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Customer = {
  id: string
  mobile: string
  name: string | null
}

type CustomerAuth = {
  token: string | null
  customer: Customer | null
  login: (token: string, customer: Customer) => void
  logout: () => void
}

const CustomerAuthCtx = createContext<CustomerAuth | null>(null)

const TOKEN_KEY = 'los_customer_token'
const CUSTOMER_KEY = 'los_customer_profile'

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const raw = localStorage.getItem(CUSTOMER_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const value = useMemo<CustomerAuth>(
    () => ({
      token,
      customer,
      login: (t, c) => {
        localStorage.setItem(TOKEN_KEY, t)
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c))
        setToken(t)
        setCustomer(c)
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(CUSTOMER_KEY)
        setToken(null)
        setCustomer(null)
      },
    }),
    [token, customer]
  )

  return <CustomerAuthCtx.Provider value={value}>{children}</CustomerAuthCtx.Provider>
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthCtx)
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  return ctx
}
