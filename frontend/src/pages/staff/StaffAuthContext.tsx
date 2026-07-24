import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type StaffUser = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'LOAN_OFFICER' | 'MANAGER' | 'COMMITTEE_MEMBER' | 'DISBURSAL_OFFICER'
}

type StaffAuth = {
  token: string | null
  staff: StaffUser | null
  login: (token: string, staff: StaffUser) => void
  logout: () => void
}

const StaffAuthCtx = createContext<StaffAuth | null>(null)

const TOKEN_KEY = 'los_staff_token'
const STAFF_KEY = 'los_staff_profile'

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [staff, setStaff] = useState<StaffUser | null>(() => {
    const raw = localStorage.getItem(STAFF_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const value = useMemo<StaffAuth>(
    () => ({
      token,
      staff,
      login: (t, s) => {
        localStorage.setItem(TOKEN_KEY, t)
        localStorage.setItem(STAFF_KEY, JSON.stringify(s))
        setToken(t)
        setStaff(s)
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(STAFF_KEY)
        setToken(null)
        setStaff(null)
      },
    }),
    [token, staff]
  )

  return <StaffAuthCtx.Provider value={value}>{children}</StaffAuthCtx.Provider>
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthCtx)
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider')
  return ctx
}

export const ROLE_LABEL: Record<StaffUser['role'], string> = {
  ADMIN: 'Admin',
  LOAN_OFFICER: 'Loan Officer (Maker)',
  MANAGER: 'Manager (Checker)',
  COMMITTEE_MEMBER: 'Credit Committee',
  DISBURSAL_OFFICER: 'Disbursal Officer',
}
