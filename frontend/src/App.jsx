import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const DEMO_RECORDS = [
  {
    id: 9001,
    source_type: 'sap',
    source_record_id: '490001',
    category: 'fuel',
    scope: 'scope_1',
    activity_date: '2026-01-15',
    activity_value: '12000',
    activity_unit_raw: 'liter (diesel)',
    normalized_value: '12000',
    normalized_unit: 'L',
    emission_factor: '2.680000',
    emission_factor_unit: 'kgCO2e/L',
    emissions_kgco2e: '32160.0',
    review_state: 'pending',
    suspicious_reason: '',
  },
  {
    id: 9002,
    source_type: 'utility',
    source_record_id: 'INV-77821',
    category: 'electricity',
    scope: 'scope_2',
    activity_date: '2026-01-31',
    activity_value: '850000',
    activity_unit_raw: 'kWh',
    normalized_value: '850000',
    normalized_unit: 'kWh',
    emission_factor: '0.720000',
    emission_factor_unit: 'kgCO2e/kWh',
    emissions_kgco2e: '612000.0',
    review_state: 'pending',
    suspicious_reason: 'Consumption jump vs prior month',
  },
  {
    id: 9003,
    source_type: 'travel',
    source_record_id: 'TR-1022',
    category: 'air_travel',
    scope: 'scope_3',
    activity_date: '2026-01-20',
    activity_value: '3982',
    activity_unit_raw: 'km',
    normalized_value: '3982',
    normalized_unit: 'km',
    emission_factor: '0.146000',
    emission_factor_unit: 'kgCO2e/km',
    emissions_kgco2e: '581.4',
    review_state: 'pending',
    suspicious_reason: '',
  },
  {
    id: 9004,
    source_type: 'sap',
    source_record_id: '490003',
    category: 'procurement',
    scope: 'scope_3',
    activity_date: '2026-01-16',
    activity_value: '2400',
    activity_unit_raw: 'kg',
    normalized_value: '2400',
    normalized_unit: 'kg',
    emission_factor: '0.450000',
    emission_factor_unit: 'kgCO2e/kg',
    emissions_kgco2e: '1080.0',
    review_state: 'approved',
    suspicious_reason: '',
  },
  {
    id: 9005,
    source_type: 'utility',
    source_record_id: 'INV-77823',
    category: 'electricity',
    scope: 'scope_2',
    activity_date: '2026-02-28',
    activity_value: '0',
    activity_unit_raw: 'kWh',
    normalized_value: '0',
    normalized_unit: 'kWh',
    emission_factor: '0.720000',
    emission_factor_unit: 'kgCO2e/kWh',
    emissions_kgco2e: '0.0',
    review_state: 'rejected',
    suspicious_reason: 'Non-positive electricity consumption',
  },
  {
    id: 9006,
    source_type: 'travel',
    source_record_id: 'TR-1023',
    category: 'hotel',
    scope: 'scope_3',
    activity_date: '2026-01-21',
    activity_value: '3',
    activity_unit_raw: 'night',
    normalized_value: '3',
    normalized_unit: 'night',
    emission_factor: '15.500000',
    emission_factor_unit: 'kgCO2e/night',
    emissions_kgco2e: '46.5',
    review_state: 'locked',
    suspicious_reason: '',
  },
  {
    id: 9007,
    source_type: 'travel',
    source_record_id: 'TR-1024',
    category: 'ground_transport',
    scope: 'scope_3',
    activity_date: '2026-01-22',
    activity_value: '58',
    activity_unit_raw: 'km',
    normalized_value: '58',
    normalized_unit: 'km',
    emission_factor: '0.085000',
    emission_factor_unit: 'kgCO2e/km',
    emissions_kgco2e: '4.93',
    review_state: 'pending',
    suspicious_reason: '',
  },
  {
    id: 9008,
    source_type: 'travel',
    source_record_id: 'TR-1025',
    category: 'air_travel',
    scope: 'scope_3',
    activity_date: '2026-01-22',
    activity_value: '45',
    activity_unit_raw: 'km',
    normalized_value: '45',
    normalized_unit: 'km',
    emission_factor: '0.146000',
    emission_factor_unit: 'kgCO2e/km',
    emissions_kgco2e: '6.57',
    review_state: 'pending',
    suspicious_reason: 'Flight distance seems too low; verify route coding',
  },
]

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
  const [demoRecords, setDemoRecords] = useState(DEMO_RECORDS)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')

  const displayRecords = records.length ? records : demoRecords
  const suspiciousRecords = useMemo(
    () => displayRecords.filter((record) => record.suspicious_reason),
    [displayRecords],
  )

  const filteredRecords = useMemo(() => {
    return displayRecords.filter((record) => {
      const sourceMatch = sourceFilter === 'all' || record.source_type === sourceFilter
      const scopeMatch = scopeFilter === 'all' || record.scope === scopeFilter
      const reviewMatch = reviewFilter === 'all' || record.review_state === reviewFilter
      return sourceMatch && scopeMatch && reviewMatch
    })
  }, [displayRecords, reviewFilter, scopeFilter, sourceFilter])

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
    const nextState = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'locked'
    const updateRecord = (record) =>
      record.id === recordId ? { ...record, review_state: nextState } : record

    if (records.length) {
      const previousRecords = records
      setRecords((prev) => prev.map(updateRecord))
      try {
        const response = await fetch(`${API_BASE}/records/${recordId}/review/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            reviewed_by: 'analyst@breathe.local',
            analyst_note: `${action} from dashboard`,
          }),
        })
        if (!response.ok) {
          throw new Error('Review action failed')
        }
        await refreshAll()
      } catch (err) {
        setRecords(previousRecords)
        setError(err.message)
      }
      return
    }

    setDemoRecords((prev) => prev.map(updateRecord))
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
      {!summary && (
        <section className="summaryCard">
          <h2>Review Summary (Demo)</h2>
          <p>
            Suspicious rows: <strong>{suspiciousRecords.length}</strong>
          </p>
          <div className="inline">
            <span className="pill">pending: {displayRecords.length}</span>
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
                <th>Actions</th>
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
                  <td>
                    <div className="actions">
                      <button onClick={() => reviewRecord(record.id, 'approve')}>Approve</button>
                      <button onClick={() => reviewRecord(record.id, 'reject')}>Reject</button>
                      <button onClick={() => reviewRecord(record.id, 'lock')}>Lock</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="12">No records for selected filters.</td>
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
