import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, X, Users, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Admin() {
  const [types, setTypes] = useState([])
  const [users, setUsers] = useState([])
  const [showAddType, setShowAddType] = useState(false)
  const [newType, setNewType] = useState({ name: '', prefix: '', purity_percent: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: typesData }, { data: usersData }] = await Promise.all([
      supabase.from('product_types').select('*').order('name'),
      supabase.from('profiles').select('*, user_roles(role)').order('created_at')
    ])
    setTypes(typesData ?? [])
    setUsers(usersData ?? [])
    setLoading(false)
  }

  async function addType(e) {
    e.preventDefault()
    const { error } = await supabase.from('product_types').insert({
      name: newType.name,
      prefix: newType.prefix.toUpperCase(),
      purity_percent: newType.purity_percent ? parseFloat(newType.purity_percent) : null
    })
    if (error) { toast.error(error.message); return }
    toast.success('Category added')
    setShowAddType(false)
    setNewType({ name: '', prefix: '', purity_percent: '' })
    fetchAll()
  }

  async function deleteType(id) {
    if (!confirm('Delete this category? Items under it will remain but unlinked.')) return
    const { error } = await supabase.from('product_types').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Category deleted')
    fetchAll()
  }

  async function changeRole(userId, newRole) {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
    if (error) { toast.error(error.message); return }
    toast.success('Role updated')
    fetchAll()
  }

  return (
    <div className="p-8 fade-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-[#f5ead8]">Admin</h1>
        <p className="text-[#4a3c2a] text-sm mt-1">Manage categories and users</p>
      </div>

      {/* Product Types */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gold-500" />
            <h2 className="font-display text-base text-[#f5ead8]">Jewellery Categories</h2>
          </div>
          <button onClick={() => setShowAddType(true)} className="btn-gold flex items-center gap-2">
            <Plus size={14} /> Add
          </button>
        </div>

        {types.length === 0 ? (
          <p className="text-[#4a3c2a] text-sm">No categories yet. Add one to start adding inventory.</p>
        ) : (
          <div className="space-y-2">
            {types.map(type => (
              <div key={type.id} className="flex items-center justify-between py-2.5 px-3 bg-[#1e170d] rounded-lg">
                <div>
                  <span className="text-[#f5ead8] text-sm">{type.name}</span>
                  <span className="font-mono text-gold-600 text-xs ml-3">{type.prefix}</span>
                  {type.purity_percent && <span className="text-[#4a3c2a] text-xs ml-2">{type.purity_percent}%</span>}
                </div>
                <button onClick={() => deleteType(type.id)} className="text-[#4a3c2a] hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
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
                <select
                  value={u.user_roles?.role ?? 'staff'}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className="bg-[#2a2012] border border-[#3a3018] text-[#8a7560] text-xs rounded px-2 py-1 focus:outline-none"
                >
                  <option value="admin">admin</option>
                  <option value="staff">staff</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Type Modal */}
      {showAddType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-[#f5ead8]">Add Category</h2>
              <button onClick={() => setShowAddType(false)} className="text-[#4a3c2a] hover:text-[#f5ead8]"><X size={18} /></button>
            </div>
            <form onSubmit={addType} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Category Name</label>
                <input className="input" value={newType.name} onChange={e => setNewType(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ring 92%" required />
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Serial Prefix</label>
                <input className="input" value={newType.prefix} onChange={e => setNewType(f => ({ ...f, prefix: e.target.value }))} placeholder="e.g. RNG" maxLength={6} required />
                <p className="text-[#3a2d1a] text-xs mt-1">Generates serials like RNG-0001, RNG-0002...</p>
              </div>
              <div>
                <label className="text-xs text-[#6b5a42] mb-1.5 block uppercase tracking-wider">Purity % (optional)</label>
                <input type="number" step="0.1" className="input" value={newType.purity_percent} onChange={e => setNewType(f => ({ ...f, purity_percent: e.target.value }))} placeholder="e.g. 92.5" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-gold flex-1">Add Category</button>
                <button type="button" onClick={() => setShowAddType(false)} className="btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
