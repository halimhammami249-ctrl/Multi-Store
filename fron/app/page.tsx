'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/stat-card'
import { Package, TrendingUp, AlertCircle, Building2, Zap, Tags, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'
import { useState, useEffect } from 'react'

interface DashboardStats {
  totalStores?: string | number
  activeStores?: string | number
  totalProducts: string | number
  totalVariants: string | number
  totalBrands?: string | number
  totalCategories?: string | number
  lowStock: string | number
  totalInventory: string | number
}

export default function Dashboard() {
  const { selectedStore } = useStore()
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsData, setStatsData] = useState<DashboardStats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true)

      try {
        const url = selectedStore
          ? `/api/stats?storeId=${selectedStore.id}`
          : '/api/stats'
        const response = await fetch(url)
        const data = await response.json()

        setStatsData(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setStatsData(null)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [selectedStore])

  const formatValue = (value: string | number | undefined, suffix = '') => {
    const displayValue = value ?? 0

    return `${Number(displayValue).toLocaleString()}${suffix}`
  }

  const platformStats = [
    { title: 'Total Stores', value: formatValue(statsData?.totalStores), change: 0, icon: Building2, color: 'primary' as const },
    { title: 'Active Stores', value: formatValue(statsData?.activeStores), change: 0, icon: Zap, color: 'accent' as const },
    { title: 'Total Products', value: formatValue(statsData?.totalProducts), change: 0, icon: Package, color: 'primary' as const },
    { title: 'Total Variants', value: formatValue(statsData?.totalVariants), change: 0, icon: TrendingUp, color: 'accent' as const },
    { title: 'Total Brands', value: formatValue(statsData?.totalBrands), change: 0, icon: Tags, color: 'primary' as const },
    { title: 'Total Categories', value: formatValue(statsData?.totalCategories), change: 0, icon: Grid3x3, color: 'accent' as const },
    { title: 'Low Stock Items', value: formatValue(statsData?.lowStock), change: 0, icon: AlertCircle, color: 'accent' as const },
    { title: 'Total Inventory', value: formatValue(statsData?.totalInventory, ' units'), change: 0, icon: Package, color: 'primary' as const },
  ]

  const storeStats = [
    { title: 'Products', value: formatValue(statsData?.totalProducts), change: 0, icon: Package, color: 'primary' as const },
    { title: 'Variants', value: formatValue(statsData?.totalVariants), change: 0, icon: TrendingUp, color: 'accent' as const },
    { title: 'Low Stock', value: formatValue(statsData?.lowStock), change: 0, icon: AlertCircle, color: 'accent' as const },
    { title: 'Total Inventory', value: formatValue(statsData?.totalInventory, ' units'), change: 0, icon: Package, color: 'primary' as const },
  ]

  const stats = selectedStore ? storeStats : platformStats

  return (
    <DashboardLayout title={selectedStore ? `${selectedStore.name} Dashboard` : 'Platform Dashboard'}>
      <div className="space-y-6">
        {!selectedStore && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
            <Building2 size={20} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Multi-tenant Platform Admin</p>
              <p className="text-sm text-muted-foreground">Manage all stores and view platform-wide analytics. Select a store to access its workspace.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? stats.map((stat, index) => (
            <div key={index} className="h-32 bg-card border border-border rounded-lg animate-pulse" />
          )) : stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>

        {/* Quick Actions */}
        {selectedStore ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary/90">
                Add New Product
              </Button>
              <Button variant="outline" className="border-border hover:bg-secondary">
                View Inventory
              </Button>
              <Button variant="outline" className="border-border hover:bg-secondary">
                Manage Categories
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Platform Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary/90">
                Create New Store
              </Button>
              <Button variant="outline" className="border-border hover:bg-secondary">
                View All Stores
              </Button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedStore ? `Product "${`Product ${i}`}" updated` : `Store "${`Store ${i}`}" created`}
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <span className="text-xs bg-secondary text-foreground px-2 py-1 rounded">
                  {selectedStore ? 'Updated' : 'Created'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
