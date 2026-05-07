import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, Trash2, X, Users, Tag, ChevronDown, ChevronRight,
  Package, Edit2, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Admin() {
  const [types, setTypes] = useState([])           // categories
  const [itemsByType, setItemsByType] = useState({}) // items grouped by category id
  const [expanded, setExpanded] = useState({})       // which categories are expanded
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Add category modal
  const [showAddType, setShowAddType] = useState(false)
  const [newType, setNewType] = useState({ name: '', prefix: '', purity_percent: '' })

  // Add item modal (launched from within a category)
  const [addItemFor, setAddItemFor] = useState(null) // product_type object
  const [newItem, setNewItem] = useState({ weight_grams: '', purchase_price: '', notes: '' })

  // Inline edit for category name
  const [editTypeId, setEditTypeId] = useState(null)
  const [editTypeName, setEditTypeName] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: typesData }, { data: itemsData }, { data: usersData }] = await Promise.all([
      supabase.from('product_types').select('*').order('name'),
      supabase.from('inventory_items')
        .select('id, serial_number, weight_grams, purchase_price, status, product_type_id')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*, user_roles(role)').order('created_at')
    ])
    const types = typesData ?? []
    setTypes(types)
    setUsers(usersData ?? [])

    // Group items by product_type_id
    const grouped = {}
    types.forEach(t => { grouped[t.id] = [] })
    ;(itemsData ?? []).forEach(item => {
      if (grouped[item.product_type_id]) grouped[item.product_type_id].push(item)
    })
    setItemsByType(grouped)
    setLoading(false)
  }

  // ── Category actions ────────────────────────────────────────

  async function addType(e) {
    e.preventDefault()
    const { error } = await supabase.from('product_types').insert({
      name: newType.name.trim(),
      prefix: newType.prefix.trim().toUpperCase(),
      purity_percent: newType.purity_percent ? parseFloat(newType.purity_percent) : null
    })
    if (error) { toast.error(error.message); return }
    toast.success(`Category "${newType.name}" added`)
    setShowAddType(false)
    setNewType({ name: '', prefix: '', purity_percent: '' })
    fetchAll()
  }

  async function deleteType(id, name) {
    if (!confirm(`Delete category "${name}"?\nItems under it will remain but become uncategorised.`)) return
    const { error } = await supabase.from('product_types').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Category deleted')
    fetchAll()
  }

  async function saveTypeName(id) {
    if (!editTypeName.trim()) return
    const { error } = await supabase.from('product_types').update({ name: editTypeName.trim() }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Category renamed')
    setEditTypeId(null)
    fetchAll()
  }

  // ── Item actions ────────────────────────────────────────────

  async function addItem(e) {
    e.preventDefault()
    const { data: serial, error: serialErr } = await supabase
      .rpc('next_serial', { type_id: addItemFor.id })
    if (serialErr) { toast.error('Serial generation failed: ' + serialErr.message); return }

    const { error } = await supabase.from('inventory_items').insert({
      product_type_id: addItemFor.id,
      serial_number: serial,
      weight_grams: parseFloat(newItem.weight_grams),
      purchase_price: parseFloat(newItem.purchase_price),
      notes: newItem.notes,
      status: 'available'
    })
    if (error) { toast.error(error.message); return }
    toast.success(`Item added — Serial: ${serial}`)
    setAddItemFor(null)
    setNewItem({ weight_grams: '', purchase_price: '', notes: '' })
    setExpanded(prev => ({ ...prev, [addItemFor.id]: true }))
    fetchAll()
  }

  async function deleteItem(itemId, serial) {
    if (!confirm(`Delete item ${serial}?`)) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', itemId)
    if (error) { toast.error(error.message); return }
    toast.success(`${serial} deleted`)
    fetchAll()
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="p-8 fade-up max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-[#f5ead8]">Admin</h1>
        <p className="text-[#4a3c2a] text-sm mt-1">Manage categories, items, and users</p>
      </div>

      {/* ── Categories + Items ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gold-500" />
            <h2 className="font-display text-base text-[#f5ead8]">
              Jewellery Categories
              <span className="text-xs font-sans text-[#4a3c2a] ml-2">({types.length})</span>
            </h2>
          </div>
          <button onClick={() => setShowAddType(true)} className="btn-gold flex items-center gap-2">
            <Plus size={14} /> Add Category
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 shimmer rounded-lg" />)}
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-8 text-[#4a3c2a]">
            <Tag size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No categories yet.</p>
            <p className="text-xs mt-1">Add a category first (e.g. "Ring 92.5%", prefix "RNG")</p>
            <button onClick={() => setShowAddType(true)} className="btn-gold mt-4 flex items-center gap-2 mx-auto">
              <Plus size={14} /> Add First Category
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {types.map(type => {
              const items = itemsByType[type.id] ?? []
              const isOpen = !!expanded[type.id]
              return (
                <div key={type.id} className="border border-[#2a2012] rounded-lg overflow-hidden">
                  {/* Category row */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#1e170d] hover:bg-[#261d0f] transition-colors">
                    <button onClick={() => toggleExpand(type.id)} className="text-[#6b5a42] hover:text-gold-400 transition-colors flex-shrink-0">
                      {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    {editTypeId === type.id ? (
                      <input
                        className="input py-0.5 px-2 text-sm flex-1"
                        value={editTypeName}
                        onChange={e => setEditTypeName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTypeName(type.id); if (e.key === 'Escape') setEditTypeId(null) }}
                        autoFocus
                      />
                    ) : (
                      <button onClick={() => toggleExpand(type.id)} className="flex-1 text-left flex items-center gap-3">
                        <span className="text-[#f5ead8] text-sm">{type.name}</span>
                        <span className="font-mono text-gold-600 text-xs">{type.prefix}-XXXX</span>
                        {type.purity_percent && (
                          <span className="text-[#4a3c2a] text-xs">{type.purity_percent}%</span>
                        )}
                        <span className="text-[#3a2d1a] text-xs ml-auto mr-2">
                          <Package size={11} className="inline mr-1" />{items.length} items
                        </span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editTypeId === type.id ? (
                        <button onClick={() => saveTypeName(type.id)} className="text-green-500 hover:text-green-400 p-1">
                          <Check size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setEditTypeId(type.id); setEditTypeName(type.name) }}
                          className="text-[#4a3c2a] hover:text-gold-400 p-1 transition-colors"
                          title="Rename category"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => { setAddItemFor(type); setNewItem({ weight_grams: '', purchase_price: '', notes: '' }) }}
                        className="text-[#4a3c2a] hover:text-gold-400 p-1 transition-colors"
                        title="Add item to this category"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => deleteType(type.id, type.name)}
                        className="text-[#4a3c2a] hover:text-red-400 p-1 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Items list (expandable) */}
                  {isOpen && (
                    <div className="divide-y divide-[#1a1208] bg-[#0d0b07]">
                      {items.length === 0 ? (
                        <div className="px-8 py-4 text-[#3a2d1a] text-xs flex items-center gap-2">
                          <Package size={12} />
                          No items yet —
                          <button
                            onClick={() => { setAddItemFor(type); setNewItem({ weight_grams: '', purchase_price: '', notes: '' }) }}
                            className="text-gold-600 hover:text-gold-400 underline underline-offset-2"
                          >
                            add first item
                          </button>
                        </div>
                      ) : items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 px-8 py-2.5 hover:bg-[#1a1208]/60 transition-colors">
                          <span className="font-mono text-gold-500 text-xs w-24">{item.serial_number}</span>
                          <span className="text-[#8a7560] text-xs">{item.weight_grams}g</span>
                          <span className="text-[#f5ead8] text-xs">₹{Number(item.purchase_price).toLocaleString('en-IN')}</span>
                          <span className={`text-xs ml-auto mr-2 ${
                            item.status === 'available' ? 'text-green-500' :
                            item.status === 'sold' ? 'text-red-400' : 'text-yellow-500'
                          }`}>{item.status}</span>
                          <button
                            onClick={() => deleteItem(item.id, item.serial_number)}
                            className="text-[#3a2d1a] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="px-8 py-2">
                        <button
                          onClick={() => { setAddItemFor(type); setNewItem({ weight_grams: '', purchase_price: '', notes: '' }) }}
                          className="text-xs text-[#4a3c2a] hover:text-gold-400 flex items-center gap-1 transition-colors py-1"
                        >
                          <Plus size={11} /> Add item to {type.name}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Users ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users size={16} className="text-gold-500" />
          <h2 className="font-display text-base text-[#f5ead8]">Users</h2>
        </div>
        {users.length === 0 ? (
          <p className="text-[#4a3c2a] text-sm">No users yet.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2.5 px-3 bg-[#1e170d] rounded-lg">
                <div>
                  <div className="text-[#f5ead8] text-sm">{u.email}</div>
                  <div className="text-[#4a3c2a] text-xs">{u.display_name || 'No display name'}</div>
                </div>
                <span className="badge-admin text-xs">admin</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Category Modal ── */}
      {showAddType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-[#f5ead8]">Add Category</h2>
              <button onClick={() => setShowAddType(false)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <form onSubmit={addType} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Category Name</label>
                <input
                  className="input" value={newType.name}
                  onChange={e => setNewType(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ring 92.5%" required autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Serial Prefix</label>
                <input
                  className="input" value={newType.prefix}
                  onChange={e => setNewType(f => ({ ...f, prefix: e.target.value.toUpperCase() }))}
                  placeholder="e.g. RNG" maxLength={6} required
                />
                <p className="text-[#3a2d1a] text-xs mt-1">Generates: {newType.prefix || 'RNG'}-0001, {newType.prefix || 'RNG'}-0002…</p>
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Purity % (optional)</label>
                <input
                  type="number" step="0.1" className="input" value={newType.purity_percent}
                  onChange={e => setNewType(f => ({ ...f, purity_percent: e.target.value }))}
                  placeholder="e.g. 92.5"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Add Category</button>
                <button type="button" onClick={() => setShowAddType(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Item Modal ── */}
      {addItemFor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm fade-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-lg text-[#f5ead8]">Add Item</h2>
              <button onClick={() => setAddItemFor(null)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <p className="text-xs text-gold-600 mb-5">
              Category: <span className="text-gold-400">{addItemFor.name}</span>
              <span className="text-[#4a3c2a] ml-2">Serial auto-assigned ({addItemFor.prefix}-XXXX)</span>
            </p>
            <form onSubmit={addItem} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Weight (grams)</label>
                <input
                  type="number" step="0.001" className="input" value={newItem.weight_grams}
                  onChange={e => setNewItem(f => ({ ...f, weight_grams: e.target.value }))}
                  placeholder="e.g. 4.520" required autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Purchase Price (₹)</label>
                <input
                  type="number" step="0.01" className="input" value={newItem.purchase_price}
                  onChange={e => setNewItem(f => ({ ...f, purchase_price: e.target.value }))}
                  placeholder="e.g. 12500" required
                />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Notes (optional)</label>
                <input
                  type="text" className="input" value={newItem.notes}
                  onChange={e => setNewItem(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any remarks..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Add Item</button>
                <button type="button" onClick={() => setAddItemFor(null)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
