import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingBag, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSell, setShowSell] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ item_id: '', sale_price: '', buyer_name: '', buyer_phone: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: salesData }, { data: available }] = await Promise.all([
      supabase.from('sales')
        .select('*, inventory_items(serial_number, weight_grams, product_types(name))')
        .order('sold_at', { ascending: false }),
      supabase.from('inventory_items')
        .select('*, product_types(name)')
        .eq('status', 'available')
        .order('serial_number')
    ])
    setSales(salesData ?? [])
    setAvailableItems(available ?? [])
    setLoading(false)
  }

  async function handleSell(e) {
    e.preventDefault()
    const item = availableItems.find(i => i.id === form.item_id)
    if (!item) { toast.error('Select an item'); return }

    const { error: saleErr } = await supabase.from('sales').insert({
      inventory_item_id: form.item_id,
      sale_price: parseFloat(form.sale_price),
      buyer_name: form.buyer_name || null,
      buyer_phone: form.buyer_phone || null,
      sold_by: user.id,
      sold_at: new Date().toISOString()
    })
    if (saleErr) { toast.error(saleErr.message); return }

    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({ status: 'sold' })
      .eq('id', form.item_id)
    if (updateErr) { toast.error(updateErr.message); return }

    toast.success(`Sold ${item.serial_number}`)
    setShowSell(false)
    setForm({ item_id: '', sale_price: '', buyer_name: '', buyer_phone: '' })
    fetchAll()
  }

  const filtered = sales.filter(s =>
    s.inventory_items?.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.buyer_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 fade-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-[#f5ead8]">Sales</h1>
          <p className="text-[#4a3c2a] text-sm mt-1">{sales.length} total sales recorded</p>
        </div>
        <button onClick={() => setShowSell(true)} className="btn-gold flex items-center gap-2">
          <ShoppingBag size={15} /> Record Sale
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a3c2a]" />
        <input className="input pl-9" placeholder="Search by serial or buyer..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[#2a2012]">
            <tr className="text-[#4a3c2a] text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3">Serial</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Weight</th>
              <th className="text-left px-5 py-3">Sale Price</th>
              <th className="text-left px-5 py-3">Buyer</th>
              <th className="text-left px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1208]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-4 shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-[#4a3c2a]">No sales yet</td></tr>
            ) : filtered.map(sale => (
              <tr key={sale.id} className="hover:bg-[#1e170d]/40 transition-colors">
                <td className="px-5 py-3 font-mono text-gold-400 text-xs">{sale.inventory_items?.serial_number}</td>
                <td className="px-5 py-3 text-[#8a7560]">{sale.inventory_items?.product_types?.name}</td>
                <td className="px-5 py-3 text-[#8a7560]">{sale.inventory_items?.weight_grams}g</td>
                <td className="px-5 py-3 text-[#f5ead8] font-medium">₹{Number(sale.sale_price).toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-[#8a7560]">{sale.buyer_name || '—'}</td>
                <td className="px-5 py-3 text-[#4a3c2a]">{new Date(sale.sold_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sell Modal */}
      {showSell && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-[#f5ead8]">Record Sale</h2>
              <button onClick={() => setShowSell(false)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Item</label>
                <select className="input" value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))} required>
                  <option value="">Select available item...</option>
                  {availableItems.map(i => (
                    <option key={i.id} value={i.id}>{i.serial_number} — {i.product_types?.name} ({i.weight_grams}g)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Sale Price (₹)</label>
                <input type="number" step="0.01" className="input" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="e.g. 15000" required />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Buyer Name (optional)</label>
                <input type="text" className="input" value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Buyer Phone (optional)</label>
                <input type="tel" className="input" value={form.buyer_phone} onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))} placeholder="+91 ..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Confirm Sale</button>
                <button type="button" onClick={() => setShowSell(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
