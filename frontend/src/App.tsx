import { Route, Routes } from 'react-router-dom'
import { Landing } from './pages/landing/Landing'
import { CustomerApp } from './pages/customer/CustomerApp'
import { StaffApp } from './pages/staff/StaffApp'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/apply/*" element={<CustomerApp />} />
      <Route path="/staff/*" element={<StaffApp />} />
    </Routes>
  )
}

export default App
