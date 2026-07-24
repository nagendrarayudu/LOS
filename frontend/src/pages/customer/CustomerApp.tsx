import { Route, Routes, Link } from 'react-router-dom'
import { CustomerAuthProvider, useCustomerAuth } from './CustomerAuthContext'
import { CustomerLogin } from './CustomerLogin'
import { MyApplications } from './MyApplications'
import { NewApplication } from './NewApplication'
import { ApplicationWizard } from './ApplicationWizard'
import './CustomerPortal.css'

function Shell({ children }: { children: React.ReactNode }) {
  const auth = useCustomerAuth()
  return (
    <div className="cp">
      <header className="cp-header">
        <Link to="/" className="cp-header-brand">
          Sahyog LOS
          <span>Customer Portal</span>
        </Link>
        <div className="cp-header-right">
          <Link to="/" className="cp-header-link">
            Home
          </Link>
          {auth.customer && (
            <button className="cp-logout" onClick={auth.logout}>
              Log out
            </button>
          )}
        </div>
      </header>
      <main className="cp-main">
        <div className="cp-card">{children}</div>
      </main>
    </div>
  )
}

function Gated() {
  const auth = useCustomerAuth()
  if (!auth.token) return <CustomerLogin />
  return (
    <Routes>
      <Route path="/" element={<MyApplications />} />
      <Route path="/new" element={<NewApplication />} />
      <Route path="/app/:id" element={<ApplicationWizard />} />
    </Routes>
  )
}

export function CustomerApp() {
  return (
    <CustomerAuthProvider>
      <Shell>
        <Gated />
      </Shell>
    </CustomerAuthProvider>
  )
}
