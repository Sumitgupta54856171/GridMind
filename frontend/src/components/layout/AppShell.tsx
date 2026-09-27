import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileFloatingNav } from './MobileFloatingNav'

interface AppShellProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden bg-white relative">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 bg-white">
          {children}
        </main>
        {/* Bottom floating navbar for mobile */}
        <MobileFloatingNav />
      </div>
    </div>
  )
}
