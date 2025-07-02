import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'
import Dashboard from '@/pages/dashboard/Dashboard'
import Users from '@/pages/users/Users'
import Content from '@/pages/content/Content'
import Products from '@/pages/ecommerce/Products'
import Orders from '@/pages/ecommerce/Orders'
import Analytics from '@/pages/analytics/Analytics'
import Settings from '@/pages/settings/Settings'
// import Pages from '@/pages/pages/Pages' // Temporarily disabled for TypeScript strict mode
import Media from '@/pages/media/Media'
// import CustomFields from '@/pages/custom-fields/CustomFields' // Temporarily disabled for TypeScript strict mode
import Login from '@/pages/auth/Login'
import { useAuthStore } from '@/api/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users/*" element={<Users />} />
        <Route path="/content/*" element={<Content />} />
        <Route path="/products/*" element={<Products />} />
        <Route path="/orders/*" element={<Orders />} />
        <Route path="/analytics/*" element={<Analytics />} />
        {/* <Route path="/pages/*" element={<Pages />} /> */}
        <Route path="/media/*" element={<Media />} />
        {/* <Route path="/custom-fields/*" element={<CustomFields />} /> */}
        <Route path="/settings/*" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  )
}

export default App