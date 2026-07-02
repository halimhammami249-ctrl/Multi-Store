'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { StatCard } from '@/components/stat-card'
import { DataTable } from '@/components/data-table'
import { AlertCircle, Package, TrendingDown, TrendingUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store-context'

interface Variant {
  id: string
  productId: string
  sku: string
  product: string
  attributes: string
  price: number
  stock: number
  status: string
}

export default function InventoryPage() {
  const { selectedStore } = useStore()
  const [variants, setVariants] = useState<Variant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchVariants = async () => {
    if (!selectedStore) {
      setVariants([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/inventory?storeId=${selectedStore.id}`)
      const data = await response.json()
      setVariants(data.data || [])
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVariants()
  }, [selectedStore])

  const handleUpdateStock = async (variant: Variant) => {
    if (!selectedStore) return

    const nextStock = prompt(`New stock for ${variant.sku}?`, String(variant.stock))
    if (nextStock === null) return

    const stock = Number(nextStock)
    if (!Number.isInteger(stock) || stock < 0) {
      alert('Stock must be a non-negative whole number.')
      return
    }

    await fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId: selectedStore.id,
        variantId: variant.id,
        stock,
      }),
    })

    fetchVariants()
  }

  const handleUpdateVariant = async (variant: Variant) => {
    if (!selectedStore) return

    const sku = prompt(`SKU for ${variant.product}?`, variant.sku || '')
    if (sku === null) return

    const nextPrice = prompt(`Price for ${variant.sku || variant.product}?`, String(variant.price))
    if (nextPrice === null) return

    const nextStock = prompt(`Stock for ${variant.sku || variant.product}?`, String(variant.stock))
    if (nextStock === null) return

    const price = Number(nextPrice)
    const stock = Number(nextStock)

    if (!Number.isFinite(price) || price < 0) {
      alert('Price must be a non-negative number.')
      return
    }

    if (!Number.isInteger(stock) || stock < 0) {
      alert('Stock must be a non-negative whole number.')
      return
    }

    const response = await fetch(`/api/variants?storeId=${selectedStore.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: variant.id,
        sku: sku || null,
        price,
        stock,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      alert(data.error || 'Failed to update variant.')
      return
    }

    fetchVariants()
  }

  const inStock = variants.filter(v => v.stock > 50).length
  const lowStock = variants.filter(v => v.stock > 0 && v.stock <= 50).length
  const outOfStock = variants.filter(v => v.stock === 0).length

  const stats = [
    { title: 'Total Variants', value: variants.length.toString(), icon: Package, color: 'primary' as const },
    { title: 'In Stock', value: inStock.toString(), icon: TrendingUp, color: 'primary' as const },
    { title: 'Low Stock', value: lowStock.toString(), icon: AlertCircle, color: 'accent' as const },
    { title: 'Out of Stock', value: outOfStock.toString(), icon: TrendingDown, color: 'destructive' as const },
  ]

  // Apply filters
  let filteredVariants = variants.filter(v =>
    v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.attributes.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (filterStatus === 'low') {
    filteredVariants = filteredVariants.filter(v => v.stock > 0 && v.stock <= 50)
  } else if (filterStatus === 'out') {
    filteredVariants = filteredVariants.filter(v => v.stock === 0)
  }

  const columns = [
    { key: 'sku' as const, label: 'SKU', width: '12%' },
    { key: 'product' as const, label: 'Product', width: '20%' },
    { key: 'attributes' as const, label: 'Variant Attributes', width: '18%' },
    {
      key: 'price' as const,
      label: 'Price',
      render: (value: number) => `$${value.toFixed(2)}`,
      width: '12%',
    },
    {
      key: 'stock' as const,
      label: 'Stock',
      render: (value: number, row: Variant) => (
        <button
          onClick={() => handleUpdateStock(row)}
          className={value > 50 ? 'text-green-400 hover:underline' : value > 0 ? 'text-yellow-400 hover:underline' : 'text-red-400 hover:underline'}
        >
          {value} units
        </button>
      ),
      width: '12%',
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string, row: Variant) => {
        let status = 'In Stock'
        let color = 'bg-green-900/30 text-green-400'
        
        if (row.stock === 0) {
          status = 'Out of Stock'
          color = 'bg-red-900/30 text-red-400'
        } else if (row.stock <= 50) {
          status = 'Low Stock'
          color = 'bg-yellow-900/30 text-yellow-400'
        }
        
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
            {status}
          </span>
        )
      },
      width: '14%',
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (_value: string, row: Variant) => (
        <Button variant="outline" size="sm" onClick={() => handleUpdateVariant(row)}>
          Edit
        </Button>
      ),
      width: '12%',
    },
  ]

  if (!selectedStore) {
    return (
      <DashboardLayout title="Inventory">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Store Selected</h2>
          <p className="text-muted-foreground mb-6">Select a store from the top navigation to manage its inventory.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by SKU, product, or attributes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setFilterStatus('all')}
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              className={filterStatus === 'all' ? 'bg-primary hover:bg-primary/90' : 'border-border hover:bg-secondary'}
            >
              All
            </Button>
            <Button
              onClick={() => setFilterStatus('low')}
              variant={filterStatus === 'low' ? 'default' : 'outline'}
              className={filterStatus === 'low' ? 'bg-accent hover:bg-accent/90' : 'border-border hover:bg-secondary'}
            >
              Low Stock
            </Button>
            <Button
              onClick={() => setFilterStatus('out')}
              variant={filterStatus === 'out' ? 'default' : 'outline'}
              className={filterStatus === 'out' ? 'bg-destructive hover:bg-destructive/90' : 'border-border hover:bg-secondary'}
            >
              Out of Stock
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Variant Inventory</h2>
            <p className="text-sm text-muted-foreground">All product variants with stock levels</p>
          </div>
          <DataTable columns={columns} data={filteredVariants} isLoading={isLoading} />
        </div>

        {/* Low Stock Alert */}
        {(lowStock > 0 || outOfStock > 0) && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-destructive flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Inventory Alert</h3>
                <p className="text-sm text-muted-foreground">
                  {lowStock} variants on low stock - {outOfStock} variants out of stock
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
