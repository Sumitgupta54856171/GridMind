import { Bell, Search } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const user = useAppSelector((s) => s.auth.user)

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-white shrink-0">
      {/* Left: mobile logo & page title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xs shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>}
        </div>
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
