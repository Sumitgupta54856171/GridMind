import { Bell, Search } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const user = useAppSelector((s) => s.auth.user)

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-background shrink-0">
      {/* Left: page title */}
      <div>
        <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ml-1">
          <span className="text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  )
}
