'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'
import { Plus, Trash2, ChevronRight, Pencil } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  parentId?: string
  productCount: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { selectedStore } = useStore()

  const fetchCategories = async () => {
    if (!selectedStore) {
      setCategories([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/categories?storeId=${selectedStore.id}`)
      const data = await response.json()
      setCategories(data.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [selectedStore])

  const handleCreateCategory = async () => {
    if (!selectedStore) return

    const name = prompt('Category name?')
    if (!name) return

    await fetch(`/api/categories?storeId=${selectedStore.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      }),
    })

    fetchCategories()
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!selectedStore) return
    if (!confirm(`Delete "${category.name}"? Products in this category will become uncategorized.`)) return

    await fetch(`/api/categories?storeId=${selectedStore.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: category.id }),
    })

    fetchCategories()
  }

  const handleUpdateCategory = async (category: Category) => {
    if (!selectedStore) return

    const name = prompt('Category name?', category.name)
    if (!name) return

    const parentName = prompt('Parent category name? Leave empty for none.', '')
    const parent = parentName
      ? categories.find((item) => item.name.toLowerCase() === parentName.toLowerCase())
      : undefined

    if (parentName && !parent) {
      alert('Parent category must already exist in this store.')
      return
    }

    if (parent?.id === category.id) {
      alert('A category cannot be its own parent.')
      return
    }

    const response = await fetch(`/api/categories?storeId=${selectedStore.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: category.id,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        parent_id: parent?.id || null,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      alert(data.error || 'Failed to update category.')
      return
    }

    fetchCategories()
  }

  return (
    <DashboardLayout title="Categories">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Manage your product categories</p>
          <Button onClick={handleCreateCategory} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus size={18} />
            Add Category
          </Button>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                  </div>
                  {cat.parentId && (
                    <ChevronRight size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{cat.productCount} products</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleUpdateCategory(cat)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCategory(cat)}
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
        )}

        {!isLoading && categories.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No categories yet</p>
            <Button onClick={handleCreateCategory} className="bg-primary hover:bg-primary/90">Create First Category</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
