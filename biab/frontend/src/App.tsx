import { useEffect, useState } from 'react'
import { apiRequest } from './lib/api'

type GLAccount = {
  id: string
  code: string
  name: string
  cls: 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'INCOME' | 'EXPENSES' | 'CONTINGENT'
  level: number
  parentId: string | null
  isLeaf: boolean
  normalBalance: string | null
  currency: string | null
  mapLabel: string | null
  subGroup: string | null
  notes: string | null
  rangeFrom: string | null
  rangeTo: string | null
}

const GL_CLASSES: Array<GLAccount['cls'] | 'ALL'> = ['ALL', 'ASSETS', 'LIABILITIES', 'EQUITY', 'INCOME', 'EXPENSES', 'CONTINGENT']

export function App() {
  const [rows, setRows] = useState<GLAccount[]>([])
  const [cls, setCls] = useState<GLAccount['cls'] | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  useEffect(() => {
    apiRequest<GLAccount[]>('/gl-accounts').then(setRows)
  }, [])

  const q = query.trim().toLowerCase()
  const visible = rows.filter((r) => {
    if (cls !== 'ALL' && r.cls !== cls) return false
    if (q && !r.code.includes(q) && !r.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="page">
      <h1>BIAB — Chart of Accounts</h1>
      <p className="sub">
        Bank-wide chart of accounts (main group → sub group → posting group), ported from the BIAB core-banking
        chart-of-accounts reference.
      </p>
      <div className="toolbar">
        <select value={cls} onChange={(e) => setCls(e.target.value as GLAccount['cls'] | 'ALL')}>
          {GL_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All main groups' : c}
            </option>
          ))}
        </select>
        <input placeholder="Search code or name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="count">{visible.length} accounts</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Class</th>
            <th>Dr/Cr</th>
            <th>Currency</th>
            <th>Statement mapping</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id}>
              <td className="code" style={{ paddingLeft: 12 + (r.level - 1) * 20 }}>
                {r.code}
              </td>
              <td className={r.isLeaf ? '' : 'group'}>{r.name}</td>
              <td>{r.cls}</td>
              <td>{r.normalBalance ?? ''}</td>
              <td>{r.currency ?? ''}</td>
              <td className="map">{r.mapLabel ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
