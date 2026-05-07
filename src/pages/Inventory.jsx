import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, QrCode, Download, X, Search, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'

// ─── ZD230TA ZPL Barcode Print Helper ────────────────────────────────────────
// Sends a ZPL label directly to the ZD230 series thermal printer via BrowserPrint
// (Zebra BrowserPrint must be installed on the desktop — https://www.zebra.com/us/en/support-downloads/software/utilities/browser-print.html)

async function printZebraBarcode(item) {
  // ZPL for ZD230TA — Code128 barcode + human-readable serial + item name
  // Label size: 50mm x 25mm (adjust ^PW and ^LL for your label stock)
  const zpl = `
^XA
^CI28
^FO20,10^BY2^BCN,50,Y,N,N^FD${item.serial_number}^FS
^FO20,75^A0N,18,18^FD${item.product_types?.name ?? ''}^FS
^FO20,98^A0N,16,16^FD${item.weight_grams}g  Rs.${Number(item.purchase_price).toLocaleString('en-IN')}^FS
^XZ`.trim()

  // Try Zebra BrowserPrint (desktop app must be running)
  if (window.BrowserPrint) {
    window.BrowserPrint.getDefaultDevice('printer', (printer) => {
      if (!printer) {
        toast.error('No Zebra printer found. Is BrowserPrint running?')
        return
      }
      printer.send(zpl,
        () => toast.success(`Barcode sent to ${printer.name ?? 'ZD230TA'}`),
        (err) => toast.error('Print failed: ' + err)
      )
    }, () => toast.error('BrowserPrint not responding'))
    return
  }

  // Fallback: open ZPL in a new window so user can copy-paste to Zebra Designer / USB raw print
  const blob = new Blob([zpl], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${item.serial_number}.zpl`
  link.click()
  URL.revokeObjectURL(url)
  toast('ZPL file downloaded — send to ZD230TA via USB or Zebra Setup Utilities', { icon: '🖨️' })
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [items, setItems] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [qrItem, setQrItem] = useState(null)
  const qrCanvasRef = useRef(null)

  const [form, setForm] = useState({ product_type_id: '', weight_grams: '', purchase_price: '', notes: '' })

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (qrItem && qrCanvasRef.current) generateQR() }, [qrItem])

  async function fetchAll() {
    const [{ data: itemsData }, { data: typesData }] = await Promise.all([
      supabase.from('inventory_items')
        .select('*, product_types(name)')
        .order('created_at', { ascending: false }),
      supabase.from('product_types').select('*').order('name')
    ])
    setItems(itemsData ?? [])
    setTypes(typesData ?? [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    const { data: serialData, error: serialErr } = await supabase
      .rpc('next_serial', { type_id: form.product_type_id })
    if (serialErr) { toast.error('Serial generation failed'); return }

    const { error } = await supabase.from('inventory_items').insert({
      product_type_id: form.product_type_id,
      serial_number: serialData,
      weight_grams: parseFloat(form.weight_grams),
      purchase_price: parseFloat(form.purchase_price),
      notes: form.notes,
      status: 'available'
    })
    if (error) { toast.error(error.message); return }
    toast.success(`Added — Serial: ${serialData}`)
    setShowAdd(false)
    setForm({ product_type_id: '', weight_grams: '', purchase_price: '', notes: '' })
    fetchAll()
  }

  async function generateQR() {
    if (!qrCanvasRef.current || !qrItem) return
    await QRCode.toCanvas(qrCanvasRef.current, qrItem.serial_number, {
      width: 200,
      margin: 2,
      color: { dark: '#0a0806', light: '#f5ead8' }
    })
  }

  async function downloadQR() {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${qrItem.serial_number}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const filtered = items.filter(i =>
    i.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
    i.product_types?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-[#f5ead8]">Inventory</h1>
          <p className="text-[#4a3c2a] text-sm mt-1">{items.length} items total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold flex items-center gap-2">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a3c2a]" />
        <input
          className="input pl-9"
          placeholder="Search by serial or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[#2a2012]">
            <tr className="text-[#4a3c2a] text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3">Serial</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Weight</th>
              <th className="text-left px-5 py-3">Purchase Price</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">QR</th>
              <th className="text-left px-5 py-3">Barcode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1208]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="h-4 shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4a3c2a]">No items found</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} className="hover:bg-[#1e170d]/40 transition-colors">
                <td className="px-5 py-3 font-mono text-gold-400 text-xs">{item.serial_number}</td>
                <td className="px-5 py-3 text-[#8a7560]">{item.product_types?.name}</td>
                <td className="px-5 py-3 text-[#f5ead8]">{item.weight_grams}g</td>
                <td className="px-5 py-3 text-[#f5ead8]">₹{Number(item.purchase_price).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3">
                  {item.status === 'available' && <span className="badge-available">available</span>}
                  {item.status === 'sold' && <span className="badge-sold">sold</span>}
                  {item.status === 'audit' && <span className="badge-audit">audit</span>}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => setQrItem(item)} className="text-[#4a3c2a] hover:text-gold-400 transition-colors" title="Show QR Code">
                    <QrCode size={15} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => printZebraBarcode(item)} className="text-[#4a3c2a] hover:text-gold-400 transition-colors" title="Print ZD230TA Barcode Label">
                    <Printer size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-[#f5ead8]">Add Inventory Item</h2>
              <button onClick={() => setShowAdd(false)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Category</label>
                <select className="input" value={form.product_type_id} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value }))} required>
                  <option value="">Select category...</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Weight (grams)</label>
                <input type="number" step="0.01" className="input" value={form.weight_grams} onChange={e => setForm(f => ({ ...f, weight_grams: e.target.value }))} placeholder="e.g. 4.52" required />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Purchase Price (₹)</label>
                <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="e.g. 12500" required />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Notes (optional)</label>
                <input type="text" className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any remarks..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Add Item</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-80 fade-up text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base text-[#f5ead8]">QR Code</h2>
              <button onClick={() => setQrItem(null)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <canvas ref={qrCanvasRef} className="mx-auto rounded-lg mb-3" />
            <div className="font-mono text-gold-400 text-sm mb-4">{qrItem.serial_number}</div>
            <div className="text-[#4a3c2a] text-xs mb-4">{qrItem.product_types?.name}</div>
            <div className="flex gap-2">
              <button onClick={downloadQR} className="btn-gold flex-1 flex items-center justify-center gap-2">
                <Download size={14} /> Download PNG
              </button>
              <button onClick={() => { setQrItem(null); printZebraBarcode(qrItem) }} className="btn-ghost flex items-center justify-center gap-2 px-3" title="Print ZD230TA barcode">
                <Printer size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
