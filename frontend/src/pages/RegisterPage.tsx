import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Shield, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { RegisterHeader, RegisterForm, RegisterError, RegisterFooter } from '@/components/register'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'

const BENEFITS = [
  'Detect conflicts between utility construction timelines',
  'Evidence-backed spatial and temporal analysis',
  'AI coordination recommendations grounded in facts',
  'Full audit trail and privacy controls',
  'Real-time analysis status and progress',
]

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (name: string, email: string, password: string) => {
    setError('')
    setIsLoading(true)
    try {
      const { data } = await authApi.register({ name, email, password })
      dispatch(setCredentials({ user: data.user, token: data.token }))
      toast.success('Account created!', {
        description: `Welcome to GridMind, ${data.user.name}.`,
      })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.'
      setError(message)
      toast.error('Registration failed', { description: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex-col justify-between p-12 overflow-hidden">
        {/* Grid bg */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/5 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl" />

        {/* Logo */}
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

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-xs font-medium tracking-wide uppercase">
                Join the platform
              </span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Infrastructure coordination
              <span className="block text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text">
                starts here
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Get access to the full GridMind platform — from project import to conflict detection,
              AI analysis, and coordination recommendations.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2.5">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-slate-500 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Evidence-backed · Privacy-controlled · Auditable</span>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <RegisterHeader />

          <Card className="border-border/60 shadow-xl shadow-slate-200/60">
            <CardContent className="pt-6 pb-8 px-6 space-y-5">
              <RegisterError message={error} />
              <RegisterForm onSubmit={handleSubmit} isLoading={isLoading} />
            </CardContent>
          </Card>

          <RegisterFooter />
        </div>
      </div>
    </div>
  )
}
