import { SidebarNav } from './sidebar-nav'
import { TopBar } from './top-bar'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {title && (
            <div className="px-4 md:px-6 py-6 border-b border-border">
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>
          )}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
