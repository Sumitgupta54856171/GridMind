import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import UtilitiesPage from '@/pages/UtilitiesPage'
import UtilityDetailPage from '@/pages/UtilityDetailPage'
import SourcesPage from '@/pages/SourcesPage'
import MapPage from '@/pages/MapPage'
import ProjectsPage from '@/pages/ProjectsPage'
import { AppShell } from '@/components/layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">Coming in the next phase.</p>
      </div>
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/" element={<ComingSoon title="Dashboard" subtitle="Infrastructure coordination overview" />} />
                <Route path="/utilities" element={<UtilitiesPage />} />
                <Route path="/utilities/:id" element={<UtilityDetailPage />} />
                <Route path="/utilities/:id/sources/new" element={<UtilityDetailPage />} />
                <Route path="/utilities/:id/import" element={<ComingSoon title="Import Projects" subtitle="Coming in Project Import phase" />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/analyses" element={<ComingSoon title="Analyses" subtitle="Run and manage analyses" />} />
                <Route path="/conflicts" element={<ComingSoon title="Conflicts" subtitle="Detected conflict opportunities" />} />
                <Route path="/ai" element={<ComingSoon title="AI Control Center" subtitle="Privacy, model and cost controls" />} />
                <Route path="/sources" element={<SourcesPage />} />
                <Route path="/settings" element={<ComingSoon title="Settings" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
