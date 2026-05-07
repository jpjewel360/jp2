import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { ClipboardList, Play, StopCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Audit() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [scans, setScans] = useState([])
  const [serial, setSerial] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSessions() }, [])

  async function fetchSessions() {
    const { data } = await supabase
      .from('audit_sessions')
      .select('*')
      .order('started_at', { ascending: false })
    setSessions(data ?? [])
    // Check if there's an active one
    const active = data?.find(s => !s.ended_at)
    if (active) {
      setActiveSession(active)
      fetchScans(active.id)
    }
    setLoading(false)
  }

  async function fetchScans(sessionId) {
    const { data } = await supabase
      .from('audit_scans')
      .select('*, inventory_items(serial_number, product_types(name), status)')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false })
    setScans(data ?? [])
  }

  async function startAudit() {
    const { data, error } = await supabase
      .from('audit_sessions')
      .insert({ started_by: user.id })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setActiveSession(data)
    setScans([])
    toast.success('Audit session started')
    fetchSessions()
  }

  async function endAudit() {
    const { error } = await supabase
      .from('audit_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', activeSession.id)
    if (error) { toast.error(error.message); return }
    setActiveSession(null)
    setScans([])
    toast.success('Audit session ended')
    fetchSessions()
  }

  async function scanItem(e) {
    e.preventDefault()
    if (!serial.trim()) return
    const serialUpper = serial.trim().toUpperCase()

    // Find the item
    const { data: item } = await supabase
      .from('inventory_items')
      .select('id, serial_number, status')
      .eq('serial_number', serialUpper)
      .single()

    if (!item) { toast.error('Item not found'); return }

    // Check if already scanned in this session
    const alreadyScanned = scans.find(s => s.inventory_items?.serial_number === serialUpper)
    if (alreadyScanned) { toast.error('Already scanned in this session'); setSerial(''); return }

    const { error } = await supabase.from('audit_scans').insert({
      session_id: activeSession.id,
      inventory_item_id: item.id,
      scanned_by: user.id
    })
    if (error) { toast.error(error.message); return }

    toast.success(`Scanned: ${serialUpper}`)
    setSerial('')
    fetchScans(activeSession.id)
  }

  return (
    <div className="p-8 fade-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-[#f5ead8]">Stock Audit</h1>
        <p className="text-[#4a3c2a] text-sm mt-1">Verify physical stock against database</p>
      </div>

      {/* Active Session */}
      {activeSession ? (
        <div className="card p-6 mb-6 border-gold-700/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Audit In Progress</span>
              <span className="text-[#4a3c2a] text-xs">— {scans.length} items scanned</span>
            </div>
            <button onClick={endAudit} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700/40 px-3 py-1.5 rounded-lg transition-all">
              <StopCircle size={14} /> End Audit
            </button>
          </div>

          <form onSubmit={scanItem} className="flex gap-2 mb-4">
            <input
              className="input flex-1"
              placeholder="Scan QR or type serial number..."
              value={serial}
              onChange={e => setSerial(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-gold px-4 flex items-center gap-2">
              <CheckCircle size={14} /> Record
            </button>
          </form>

          {/* Scanned items */}
          {scans.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {scans.map(scan => (
                <div key={scan.id} className="flex items-center justify-between py-2 px-3 bg-[#1e170d] rounded-lg text-sm">
                  <span className="font-mono text-gold-400 text-xs">{scan.inventory_items?.serial_number}</span>
                  <span className="text-[#8a7560]">{scan.inventory_items?.product_types?.name}</span>
                  <span className="text-[#4a3c2a] text-xs">{new Date(scan.scanned_at).toLocaleTimeString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button onClick={startAudit} className="btn-gold flex items-center gap-2 mb-6">
          <Play size={15} /> Start New Audit
        </button>
      )}

      {/* Past Sessions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2012]">
          <h2 className="font-display text-base text-[#f5ead8]">Past Audits</h2>
        </div>
        {loading ? (
          <div className="p-5 text-[#4a3c2a] text-sm">Loading...</div>
        ) : sessions.filter(s => s.ended_at).length === 0 ? (
          <div className="p-5 text-[#4a3c2a] text-sm">No completed audits yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#2a2012]">
              <tr className="text-[#4a3c2a] text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Started</th>
                <th className="text-left px-5 py-3">Ended</th>
                <th className="text-left px-5 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1208]">
              {sessions.filter(s => s.ended_at).map(session => {
                const duration = Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)
                return (
                  <tr key={session.id} className="hover:bg-[#1e170d]/40 transition-colors">
                    <td className="px-5 py-3 text-[#8a7560]">{new Date(session.started_at).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-[#8a7560]">{new Date(session.ended_at).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-[#4a3c2a]">{duration} min</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
