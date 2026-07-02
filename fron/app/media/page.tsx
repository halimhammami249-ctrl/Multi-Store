'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'
import { AlertCircle, Image, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface MediaItem {
  id: string
  url: string
  position: number
  createdAt: string
  variantId: string
  sku: string
  product: string
}

export default function MediaPage() {
  const { selectedStore } = useStore()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMedia = async () => {
    if (!selectedStore) {
      setMedia([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/media?storeId=${selectedStore.id}`)
      const data = await response.json()
      setMedia(data.data || [])
    } catch (error) {
      console.error('Failed to fetch media:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [selectedStore])

  const handleAddImage = async () => {
    if (!selectedStore) return

    const sku = prompt('Variant SKU?')
    if (!sku) return

    const url = prompt('Image URL?')
    if (!url) return

    await fetch(`/api/media?storeId=${selectedStore.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, url }),
    })

    fetchMedia()
  }

  const handleDeleteImage = async (item: MediaItem) => {
    if (!selectedStore) return
    if (!confirm(`Delete image for ${item.sku}?`)) return

    await fetch(`/api/media?storeId=${selectedStore.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })

    fetchMedia()
  }

  if (!selectedStore) {
    return (
      <DashboardLayout title="Media">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Store Selected</h2>
          <p className="text-muted-foreground mb-6">Select a store from the top navigation to manage its images.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Media">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-muted-foreground">Manage product image URLs attached to variants</p>
          <Button onClick={handleAddImage} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus size={18} />
            Add Image URL
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden h-64 animate-pulse" />
            ))}
          </div>
        ) : media.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all">
                <div className="relative w-full aspect-square bg-secondary">
                  <img
                    src={item.url}
                    alt={`${item.product} ${item.sku}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 border-t border-border space-y-2">
                  <div>
                    <h3 className="font-medium text-foreground text-sm truncate">{item.product}</h3>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">Position {item.position}</span>
                    <Button
                      onClick={() => handleDeleteImage(item)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <Image className="mx-auto text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground mb-4">No product images yet</p>
            <Button onClick={handleAddImage} className="bg-primary hover:bg-primary/90">Add First Image URL</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
