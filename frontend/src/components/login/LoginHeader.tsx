// Brand header shown at the top of the login card
export function LoginHeader() {
  return (
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">G</span>
        </div>
        <span className="font-bold text-xl tracking-tight">GridMind</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-sm text-muted-foreground">Sign in to your account</p>
    </div>
  )
}
