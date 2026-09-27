import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  FolderOpen,
  AlertTriangle,
  Menu,
  X,
  Building2,
  FlaskConical,
  BrainCircuit,
  Database,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'

const PRIMARY_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/conflicts', icon: AlertTriangle, label: 'Conflicts' },
]

const MORE_NAV_ITEMS = [
  { to: '/utilities', icon: Building2, label: 'Utilities' },
  { to: '/analyses', icon: FlaskConical, label: 'Analyses' },
  { to: '/ai', icon: BrainCircuit, label: 'AI Control' },
  { to: '/sources', icon: Database, label: 'Data Sources' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function MobileFloatingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const isMoreActive = MORE_NAV_ITEMS.some((item) =>
    location.pathname.startsWith(item.to)
  )

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Dimmed backdrop when More menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Floating Bottom Sheet for "More" Navigation */}
      {isMenuOpen && (
        <div className="fixed bottom-20 inset-x-3 z-50 md:hidden max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 duration-200 flex flex-col gap-3">
          {/* User profile & header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email || 'Logged in'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary links grid */}
          <div className="grid grid-cols-2 gap-2">
            {MORE_NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-indigo-600' : 'text-slate-500'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Sign out button */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false)
              handleLogout()
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200/60 mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out of GridMind</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Navigation Bar Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-3 inset-x-3 z-40 md:hidden flex justify-center pointer-events-none select-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 rounded-2xl p-1.5 flex items-center justify-around gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 relative min-w-0',
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-xs scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95'
                )
              }
            >
              <item.icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-[10px] leading-tight font-medium mt-0.5 truncate max-w-full">
                {item.label}
              </span>
            </NavLink>
          ))}

          {/* More Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 relative min-w-0',
              isMenuOpen || isMoreActive
                ? 'bg-slate-900 text-white font-medium shadow-xs scale-[1.02]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95'
            )}
          >
            {isMenuOpen ? (
              <X className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            ) : (
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            )}
            <span className="text-[10px] leading-tight font-medium mt-0.5 truncate max-w-full">
              {isMenuOpen ? 'Close' : 'More'}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
