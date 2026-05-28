import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function getDataSourceLabel(record) {
  if (record.source_type === 'sap') {
    if (record.category === 'fuel') return 'SAP Export (Fuel)'
    if (record.category === 'procurement') return 'SAP Export (Procurement)'
    return 'SAP Export'
  }
  if (record.source_type === 'utility') return 'Utility Portal CSV'
  if (record.source_type === 'travel') {
    if (record.category === 'air_travel') return 'Concur API (Flight)'
    if (record.category === 'hotel') return 'Concur API (Hotel)'
    if (record.category === 'ground_transport') return 'Concur API (Ground)'
    return 'Concur API (Travel)'
  }
  return record.source_type
}

function App() {
  const [sourceType, setSourceType] = useState('sap')
  const [tenantCode, setTenantCode] = useState('acme')
  const [uploadFile, setUploadFile] = useState(null)
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')

  const suspiciousRecords = useMemo(
    () => records.filter((record) => record.suspicious_reason),
    [records],
  )

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const sourceMatch = sourceFilter === 'all' || record.source_type === sourceFilter
      const scopeMatch = scopeFilter === 'all' || record.scope === scopeFilter
      const reviewMatch = reviewFilter === 'all' || record.review_state === reviewFilter
      return sourceMatch && scopeMatch && reviewMatch
    })
  }, [records, reviewFilter, scopeFilter, sourceFilter])

  async function fetchRecords() {
    const response = await fetch(`${API_BASE}/records/?tenant_code=${tenantCode}`)
    const data = await response.json()
    setRecords(data)
  }

  async function fetchSummary() {
    const response = await fetch(`${API_BASE}/dashboard/summary/?tenant_code=${tenantCode}`)
    const data = await response.json()
    setSummary(data)
  }

  async function refreshAll() {
    await Promise.all([fetchRecords(), fetchSummary()])
  }

  useEffect(() => {
    refreshAll().catch(() => {
      setError('Could not load dashboard. Start Django backend on port 8000.')
    })
  }, [])

  async function handleUpload(event) {
    event.preventDefault()
    if (!uploadFile) {
      setError('Select a source file first.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('tenant_code', tenantCode)
      formData.append('source_type', sourceType)
      formData.append('ingestion_mode', 'file_upload')
      formData.append('source_reference', uploadFile.name)
      formData.append('file', uploadFile)

      const response = await fetch(`${API_BASE}/batches/upload/`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const failed = await response.json()
        throw new Error(failed.error || 'Upload failed')
      }
      await refreshAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function reviewRecord(recordId, action) {
    await fetch(`${API_BASE}/records/${recordId}/review/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        reviewed_by: 'analyst@breathe.local',
        analyst_note: `${action} from dashboard`,
      }),
    })
    await refreshAll()
  }

  return (
    <main className="container">
      <h1>Breathe ESG Ingestion Dashboard</h1>
      <p className="subtitle">
        Prototype for SAP, utility electricity, and business travel ingestion with analyst review.
      </p>

      <form className="uploadCard" onSubmit={handleUpload}>
        <div className="grid">
          <label>
            Tenant Code
            <input value={tenantCode} onChange={(e) => setTenantCode(e.target.value)} />
          </label>
          <label>
            Source
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="sap">SAP (CSV)</option>
              <option value="utility">Utility (CSV)</option>
              <option value="travel">Travel (JSON array)</option>
            </select>
          </label>
          <label>
            File
            <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <button disabled={busy} type="submit">
          {busy ? 'Uploading...' : 'Upload and Normalize'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {summary && (
        <section className="summaryCard">
          <h2>Review Summary</h2>
          <p>
            Suspicious rows: <strong>{summary.suspicious_count}</strong>
          </p>
          <div className="inline">
            {summary.review_states.map((item) => (
              <span key={item.review_state} className="pill">
                {item.review_state}: {item.count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="records">
        <h2>Suspicious Rows</h2>
        {suspiciousRecords.length === 0 && <p>No suspicious records found.</p>}
        {suspiciousRecords.map((record) => (
          <article className="record" key={record.id}>
            <div>
              <strong>{record.source_type}</strong> #{record.source_record_id} - {record.category}
            </div>
            <div>Reason: {record.suspicious_reason}</div>
            <div>Emissions: {record.emissions_kgco2e} kgCO2e</div>
            <div className="actions">
              <button onClick={() => reviewRecord(record.id, 'approve')}>Approve</button>
              <button onClick={() => reviewRecord(record.id, 'reject')}>Reject</button>
              <button onClick={() => reviewRecord(record.id, 'lock')}>Lock</button>
            </div>
          </article>
        ))}
      </section>

      <section className="records">
        <h2>All Normalized Records</h2>
        <div className="tableFilters">
          <label>
            Data Source
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="sap">SAP</option>
              <option value="utility">Utility</option>
              <option value="travel">Travel</option>
            </select>
          </label>
          <label>
            Scope
            <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="scope_1">Scope 1</option>
              <option value="scope_2">Scope 2</option>
              <option value="scope_3">Scope 3</option>
            </select>
          </label>
          <label>
            Review State
            <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="locked">Locked</option>
            </select>
          </label>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Scope</th>
                <th>Category</th>
                <th>Activity Date</th>
                <th>Source Record ID</th>
                <th>Raw Activity</th>
                <th>Normalized Activity</th>
                <th>Emission Factor</th>
                <th>kgCO2e</th>
                <th>Review</th>
                <th>Suspicious Flag</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>{getDataSourceLabel(record)}</td>
                  <td>{record.scope}</td>
                  <td>{record.category}</td>
                  <td>{record.activity_date}</td>
                  <td>{record.source_record_id}</td>
                  <td>
                    {record.activity_value} {record.activity_unit_raw}
                  </td>
                  <td>
                    {record.normalized_value} {record.normalized_unit}
                  </td>
                  <td>
                    {record.emission_factor} ({record.emission_factor_unit})
                  </td>
                  <td>{record.emissions_kgco2e}</td>
                  <td>{record.review_state}</td>
                  <td>{record.suspicious_reason || '-'}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="11">No records for selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default App
