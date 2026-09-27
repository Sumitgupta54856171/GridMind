import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MapPin, Shield, BarChart3, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { LoginHeader, LoginForm, LoginError, LoginFooter } from '@/components/login'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'

const FEATURES = [
  { icon: Layers, label: 'Multi-utility project comparison' },
  { icon: MapPin, label: 'Spatial & temporal conflict detection' },
  { icon: BarChart3, label: 'Evidence-backed analysis' },
  { icon: Shield, label: 'AI-controlled privacy & cost visibility' },
]

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (email: string, password: string) => {
    setError('')
    setIsLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      dispatch(setCredentials({ user: data.user, token: data.token }))
      toast.success(`Welcome back, ${data.user.name}!`, {
        description: 'Redirecting to your dashboard…',
      })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please check your credentials.'
      setError(message)
      toast.error('Sign in failed', { description: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex-col justify-between p-12 overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl" />

        {/* Top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">GridMind</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 text-xs font-medium tracking-wide uppercase">
                Infrastructure Intelligence
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Coordinate utility projects
              <span className="block text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text">
                before conflicts arise
              </span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Detect spatial and temporal conflicts between public utility construction plans using
              deterministic analysis and AI-backed recommendations.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 flex items-center gap-2 text-slate-500 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Evidence-backed · Privacy-controlled · Auditable</span>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <LoginHeader />

          <Card className="border-border/60 shadow-xl shadow-slate-200/60">
            <CardContent className="pt-6 pb-8 px-6 space-y-5">
              <LoginError message={error} />
              <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>

          <LoginFooter />
        </div>
      </div>
    </div>
  )
}
