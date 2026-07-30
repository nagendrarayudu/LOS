import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { StaffAuthProvider, useStaffAuth, ROLE_LABEL } from './StaffAuthContext'
import { StaffLogin } from './StaffLogin'
import { Pipeline } from './Pipeline'
import { ApplicationDetail } from './ApplicationDetail'
import { Masters } from './Masters'
import '../customer/CustomerPortal.css'
import './StaffPortal.css'

function Shell({ children }: { children: React.ReactNode }) {
  const auth = useStaffAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const onMasters = location.pathname.startsWith('/staff/masters')
  return (
    <div className="sp">
      <aside className="sp-sidebar">
        <div className="sp-sidebar-brand">
          Sahyog LOS
          <span>Staff Portal</span>
        </div>
        <div className={`sp-nav-item ${onMasters ? '' : 'active'}`} onClick={() => navigate('/staff/applications')}>
          Pipeline
        </div>
        <div className={`sp-nav-item ${onMasters ? 'active' : ''}`} onClick={() => navigate('/staff/masters')}>
          Masters
        </div>
        <div className="sp-sidebar-footer">
          <div className="sp-sidebar-user">{auth.staff?.name}</div>
          <div className="sp-sidebar-role">{auth.staff ? ROLE_LABEL[auth.staff.role] : ''}</div>
          <button className="sp-logout" onClick={auth.logout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="sp-content">{children}</div>
    </div>
  )
}

function Gated() {
  const auth = useStaffAuth()
  if (!auth.token) return <StaffLogin />
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Pipeline />} />
        <Route path="/applications" element={<Pipeline />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/masters" element={<Masters />} />
      </Routes>
    </Shell>
  )
}

export function StaffApp() {
  return (
    <StaffAuthProvider>
      <Gated />
    </StaffAuthProvider>
  )
}
