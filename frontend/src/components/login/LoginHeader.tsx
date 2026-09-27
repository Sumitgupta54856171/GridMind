import { Grid3x3, Zap } from 'lucide-react'

export function LoginHeader() {
  return (
    <div className="text-center space-y-3">
      {/* Logo mark */}
      <div className="flex items-center justify-center gap-2.5 mb-1">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Grid3x3 className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
          GridMind
        </span>
      </div>

      {/* Tagline */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your infrastructure intelligence platform
        </p>
      </div>
    </div>
  )
}
