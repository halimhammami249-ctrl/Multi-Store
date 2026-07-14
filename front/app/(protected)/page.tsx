'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { StatCard } from '@/components/stat-card';
import {
  Package,
  TrendingUp,
  AlertCircle,
  Building2,
  Zap,
  Tags,
  Grid3x3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  name: string;
  isNew: boolean;
  at: string;
}

interface DashboardStats {
  totalStores?: string | number;
  activeStores?: string | number;
  totalProducts: string | number;
  totalVariants: string | number;
  totalBrands?: string | number;
  totalCategories?: string | number;
  lowStock: string | number;
  totalInventory: string | number;
  recentActivity?: ActivityItem[];
}

function timeAgo(isoString: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000,
  );

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Dashboard() {
  const { selectedStore } = useStore();
  const router = useRouter();
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true);

      try {
        const url = selectedStore
          ? `/api/stats?storeId=${selectedStore.id}`
          : '/api/stats';
        const response = await fetch(url);
        const data = await response.json();

        setStatsData(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStatsData(null);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [selectedStore]);

  const formatValue = (value: string | number | undefined, suffix = '') => {
    const displayValue = value ?? 0;

    return `${Number(displayValue).toLocaleString()}${suffix}`;
  };

  const platformStats = [
    {
      title: 'Total Stores',
      value: formatValue(statsData?.totalStores),
      change: 0,
      icon: Building2,
      color: 'primary' as const,
    },
    {
      title: 'Active Stores',
      value: formatValue(statsData?.activeStores),
      change: 0,
      icon: Zap,
      color: 'accent' as const,
    },
    {
      title: 'Total Products',
      value: formatValue(statsData?.totalProducts),
      change: 0,
      icon: Package,
      color: 'primary' as const,
    },
    {
      title: 'Total Variants',
      value: formatValue(statsData?.totalVariants),
      change: 0,
      icon: TrendingUp,
      color: 'accent' as const,
    },
    {
      title: 'Total Brands',
      value: formatValue(statsData?.totalBrands),
      change: 0,
      icon: Tags,
      color: 'primary' as const,
    },
    {
      title: 'Total Categories',
      value: formatValue(statsData?.totalCategories),
      change: 0,
      icon: Grid3x3,
      color: 'accent' as const,
    },
    {
      title: 'Low Stock Items',
      value: formatValue(statsData?.lowStock),
      change: 0,
      icon: AlertCircle,
      color: 'accent' as const,
    },
    {
      title: 'Total Inventory',
      value: formatValue(statsData?.totalInventory, ' units'),
      change: 0,
      icon: Package,
      color: 'primary' as const,
    },
  ];

  const storeStats = [
    {
      title: 'Products',
      value: formatValue(statsData?.totalProducts),
      change: 0,
      icon: Package,
      color: 'primary' as const,
    },
    {
      title: 'Variants',
      value: formatValue(statsData?.totalVariants),
      change: 0,
      icon: TrendingUp,
      color: 'accent' as const,
    },
    {
      title: 'Low Stock',
      value: formatValue(statsData?.lowStock),
      change: 0,
      icon: AlertCircle,
      color: 'accent' as const,
    },
    {
      title: 'Total Inventory',
      value: formatValue(statsData?.totalInventory, ' units'),
      change: 0,
      icon: Package,
      color: 'primary' as const,
    },
  ];

  const stats = selectedStore ? storeStats : platformStats;

  return (
    <DashboardLayout
      title={
        selectedStore ? `${selectedStore.name} Dashboard` : 'Platform Dashboard'
      }
    >
      <div className="space-y-6">
        {!selectedStore && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-start gap-3">
            <Building2 size={20} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">
                Multi-tenant Platform Admin
              </p>
              <p className="text-sm text-muted-foreground">
                Manage all stores and view platform-wide analytics. Select a
                store to access its workspace.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? stats.map((stat, index) => (
                <div
                  key={index}
                  className="h-32 bg-card border border-border rounded-lg animate-pulse"
                />
              ))
            : stats.map((stat, index) => (
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
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Quick Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => router.push('/products')}
              >
                Add New Product
              </Button>
              <Button
                variant="outline"
                className="border-border hover:bg-secondary"
                onClick={() => router.push('/inventory')}
              >
                View Inventory
              </Button>
              <Button
                variant="outline"
                className="border-border hover:bg-secondary"
                onClick={() => router.push('/categories')}
              >
                Manage Categories
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Platform Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => router.push('/stores')}
              >
                Create New Store
              </Button>
              <Button
                variant="outline"
                className="border-border hover:bg-secondary"
                onClick={() => router.push('/stores')}
              >
                View All Stores
              </Button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Recent Activity
          </h2>
          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-secondary/50 rounded animate-pulse"
                />
              ))}
            </div>
          ) : statsData?.recentActivity &&
            statsData.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {statsData.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedStore
                        ? `Product "${item.name}" ${item.isNew ? 'added' : 'updated'}`
                        : `Store "${item.name}" ${item.isNew ? 'created' : 'updated'}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(item.at)}
                    </p>
                  </div>
                  <span className="text-xs bg-secondary text-foreground px-2 py-1 rounded">
                    {item.isNew ? 'New' : 'Updated'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {selectedStore
                ? 'No products yet. Add your first product to see activity here.'
                : 'No stores yet. Create your first store to see activity here.'}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
