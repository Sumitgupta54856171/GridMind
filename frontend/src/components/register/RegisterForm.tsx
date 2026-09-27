import { useState } from 'react'
import { Eye, EyeOff, User, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => void
  isLoading: boolean
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex gap-3 pt-1">
      {checks.map(({ label, ok }) => (
        <div key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
          <CheckCircle2 className={`h-3 w-3 ${ok ? 'text-green-500' : 'text-muted-foreground/40'}`} />
          {label}
        </div>
      ))}
    </div>
  )
}

export function RegisterForm({ onSubmit, isLoading }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordError('')
    onSubmit(name, email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="reg-name" className="text-sm font-medium">Full name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="reg-name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="pl-9 h-11 bg-background border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="reg-email" className="text-sm font-medium">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-9 h-11 bg-background border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-9 pr-10 h-11 bg-background border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrength password={password} />
      </div>

      {/* Confirm password */}
      <div className="space-y-2">
        <Label htmlFor="reg-confirm" className="text-sm font-medium">Confirm password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="reg-confirm"
            type={showPassword ? 'text' : 'password'}
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="pl-9 h-11 bg-background border-border/60 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-colors"
          />
        </div>
        {passwordError && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <span>⚠</span> {passwordError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md shadow-blue-500/25 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Creating account…
          </span>
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  )
}
