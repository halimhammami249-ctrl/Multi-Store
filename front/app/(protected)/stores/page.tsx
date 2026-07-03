'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useStore, type Store } from '@/lib/store-context'
import { Plus, Trash2, ExternalLink, Search, Copy, Code2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface StoreWithStats extends Store {
  ordersCount?: number
}

const publicEndpoints = [
  { method: 'GET', path: '/products', examplePath: '/products' },
  { method: 'GET', path: '/products/:slug', examplePath: '/products/sample-product' },
  { method: 'GET', path: '/categories', examplePath: '/categories' },
  { method: 'GET', path: '/brands', examplePath: '/brands' },
  { method: 'GET', path: '/store', examplePath: '/store' },
]

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function configuredApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')

  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin

  return ''
}

function storeApiBaseUrl(store: Store) {
  const identifier = slugify(store.domain || store.name)
  return `${configuredApiBase()}/api/public/${identifier}`
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export default function StoresPage() {
  const { stores, setStores, setSelectedStore } = useStore()
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchStores = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/stores')
      const data = await response.json()
      setStores(data.data || [])
    } catch (error) {
      console.error('Failed to fetch stores:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [setStores])

  const handleCreateStore = async () => {
    const name = prompt('Store name?')
    if (!name) return

    const domain = prompt('Store domain?', `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.local`)
    if (!domain) return

    await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain, status: 'active' }),
    })

    fetchStores()
  }

  const handleDeleteStore = async (store: Store) => {
    if (!confirm(`Delete "${store.name}" and all of its products?`)) return

    await fetch('/api/stores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: store.id }),
    })

    setSelectedStore(null)
    fetchStores()
  }

  const handleOpenApi = (store: Store) => {
    window.open(`${storeApiBaseUrl(store)}/store`, '_blank', 'noopener,noreferrer')
  }

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout title="Stores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={handleCreateStore} className="bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto">
            <Plus size={18} />
            Create Store
          </Button>
        </div>

        {/* Stores Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
                <div className="h-12 bg-secondary rounded mb-4" />
                <div className="h-4 bg-secondary rounded mb-2" />
                <div className="h-4 bg-secondary rounded mb-4 w-2/3" />
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 bg-secondary rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => (
              <div key={store.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                {/* Logo and Name */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{store.name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    store.status === 'active' ? 'bg-green-900/30 text-green-400' : 
                    store.status === 'suspended' ? 'bg-gray-900/30 text-gray-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {store.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border text-sm">
                  <div>
                    <p className="text-muted-foreground">Products</p>
                    <p className="text-lg font-semibold text-foreground">{store.productsCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variants</p>
                    <p className="text-lg font-semibold text-foreground">{store.variantsCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categories</p>
                    <p className="text-lg font-semibold text-foreground">{store.categoriesCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Brands</p>
                    <p className="text-lg font-semibold text-foreground">{store.brandsCount}</p>
                  </div>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-muted-foreground mb-4">
                  Last updated: {new Date(store.updated_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedStore(store)}
                    variant="outline"
                    className="flex-1 gap-2 border-border hover:bg-secondary"
                  >
                    <ExternalLink size={16} />
                    Open
                  </Button>
                  <Button
                    onClick={() => handleDeleteStore(store)}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>

                {/* Developer API */}
                <div className="mt-5 pt-5 border-t border-border space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Developer API</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Public storefront endpoints for this store.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenApi(store)}
                      className="gap-1"
                    >
                      <ExternalLink size={14} />
                      Open API
                    </Button>
                  </div>

                  <div className="bg-secondary/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">Public API Base URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-foreground break-all">{storeApiBaseUrl(store)}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyText(storeApiBaseUrl(store))}
                        title="Copy URL"
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {publicEndpoints.map((endpoint) => {
                      const url = `${storeApiBaseUrl(store)}${endpoint.examplePath}`
                      const displayUrl = `${storeApiBaseUrl(store)}${endpoint.path}`
                      const example = `fetch('${url}')`

                      return (
                        <div key={endpoint.path} className="border border-border rounded-lg p-3 bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs font-semibold">
                              {endpoint.method}
                            </span>
                            <code className="text-xs text-foreground break-all">{displayUrl}</code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyText(displayUrl)}
                              title="Copy endpoint"
                              className="ml-auto"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                          <div className="flex items-start gap-2 bg-secondary/40 rounded p-2">
                            <code className="flex-1 text-xs text-muted-foreground break-all">{example}</code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyText(example)}
                              title="Copy example request"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">No stores found</p>
            <Button onClick={handleCreateStore} className="bg-primary hover:bg-primary/90 gap-2">
              <Plus size={18} />
              Create Your First Store
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
