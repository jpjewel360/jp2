import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventory from './pages/Inventory.jsx'
import Sales from './pages/Sales.jsx'
import Audit from './pages/Audit.jsx'
import Admin from './pages/Admin.jsx'
import Scan from './pages/Scan.jsx'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gold-500 font-mono text-sm animate-pulse">Loading...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<Sales />} />
        <Route path="scan" element={<Scan />} />
        <Route path="audit" element={<Audit />} />
        <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e170d',
              color: '#f5ead8',
              border: '1px solid #2a2012',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#c98a12', secondary: '#0a0806' } },
            error: { iconTheme: { primary: '#c0392b', secondary: '#0a0806' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
