'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Package,
  Tags,
  Grid3x3,
  Layers,
  Image,
  Upload,
  Menu,
  X,
  Building2,
  ShoppingCart,
  Users,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/lib/store-context'

const superAdminItems = [
  { href: '/', icon: BarChart3, label: 'Dashboard' },
  { href: '/stores', icon: Building2, label: 'Stores' },
]

const storeItems = [
  { href: '/', icon: BarChart3, label: 'Dashboard', enabled: true },
  { href: '/products', icon: Package, label: 'Products', enabled: true },
  { href: '/inventory', icon: BarChart3, label: 'Inventory', enabled: true },
  { href: '/brands', icon: Tags, label: 'Brands', enabled: true },
  { href: '/categories', icon: Grid3x3, label: 'Categories', enabled: true },
  { href: '/attributes', icon: Layers, label: 'Attributes', enabled: true },
  { href: '/media', icon: Image, label: 'Media', enabled: true },
  { href: '/dashboard/import', icon: Upload, label: 'Import', enabled: true },
  { href: '/orders', icon: ShoppingCart, label: 'Orders', enabled: false },
  { href: '/customers', icon: Users, label: 'Customers', enabled: false },
  { href: '/analytics', icon: TrendingUp, label: 'Analytics', enabled: false },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { selectedStore, isSuperAdmin } = useStore()

  // Determine which nav items to show
  const isInStoreWorkspace = selectedStore !== null
  const navItems = isInStoreWorkspace ? storeItems : superAdminItems

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-card hover:bg-secondary transition-colors"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:translate-x-0 z-40',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sidebar-primary to-accent bg-clip-text text-transparent">
            {isInStoreWorkspace ? 'Store' : 'Platform'}
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isDisabled = 'enabled' in item && !item.enabled && isInStoreWorkspace

            return (
              <Link
                key={item.href}
                href={isDisabled ? '#' : item.href}
                onClick={() => !isDisabled && setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed text-sidebar-foreground'
                    : isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {isDisabled && <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded">Soon</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
          <p>© 2024 E-Commerce Admin</p>
        </div>
      </aside>

      {/* Main content spacer */}
      <div className="hidden md:block w-64" />
    </>
  )
}
