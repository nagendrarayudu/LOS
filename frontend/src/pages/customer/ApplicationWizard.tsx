import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useCustomerAuth } from './CustomerAuthContext'
import { KycStep } from './KycStep'
import { DocumentsStep } from './DocumentsStep'
import { KfsStep } from './KfsStep'
import { StatusView } from './StatusView'

type Application = {
  id: string
  status: string
  requestedAmount: string
  tenureMonths: number
  emi: string | null
  aprPercent: string | null
  processingFeeAmount: string | null
  totalInterest: string | null
  totalPayable: string | null
  netDisbursedAmount: string | null
  scheme: { name: string; interestRate: string; repaymentType: string; key: string }
}

type Customer = { kycVerifiedAt: string | null }
type RequiredDocs = { required: Array<{ id: string; uploaded: boolean }> }

export function ApplicationWizard() {
  const { id } = useParams<{ id: string }>()
  const auth = useCustomerAuth()
  const [app, setApp] = useState<Application | null>(null)
  const [step, setStep] = useState(0)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    if (!id) return
    const application = await apiRequest<Application>(`/customer/applications/${id}`, { token: auth.token })
    setApp(application)
    if (application.status === 'DRAFT') {
      const [customer, docs] = await Promise.all([
        apiRequest<Customer>('/customer/me', { token: auth.token }),
        apiRequest<RequiredDocs>(`/customer/applications/${id}/documents/required`, { token: auth.token }),
      ])
      if (customer.kycVerifiedAt && docs.required.every((d) => d.uploaded)) setStep(2)
      else if (customer.kycVerifiedAt) setStep(1)
      else setStep(0)
    }
    setLoaded(true)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load()
  }, [id])

  if (!loaded || !app) return <p className="cp-sub">Loading…</p>

  if (app.status !== 'DRAFT') return <StatusView applicationId={app.id} />

  return (
    <div>
      <div className="cp-progress">
        <div className="cp-progress-fill" style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>
      {step === 0 && <KycStep applicationId={app.id} onDone={() => setStep(1)} />}
      {step === 1 && <DocumentsStep applicationId={app.id} onBack={() => setStep(0)} onDone={() => setStep(2)} />}
      {step === 2 && <KfsStep application={app} onBack={() => setStep(1)} onSubmitted={load} />}
    </div>
  )
}
