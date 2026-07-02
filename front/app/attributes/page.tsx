'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Attribute {
  id: string
  name: string
  type: 'text' | 'select' | 'color' | 'size'
  values: string[]
  usedIn: number
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { selectedStore } = useStore()

  const fetchAttributes = async () => {
    if (!selectedStore) {
      setAttributes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/attributes?storeId=${selectedStore.id}`)
      const data = await response.json()
      setAttributes(data.data || [])
    } catch (error) {
      console.error('Failed to fetch attributes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAttributes()
  }, [selectedStore])

  const handleCreateAttribute = async () => {
    if (!selectedStore) return

    const name = prompt('Attribute name?')
    if (!name) return

    const type = prompt('Type: text, select, color, or size?', 'select') || 'select'
    const safeType = ['text', 'select', 'color', 'size'].includes(type) ? type : 'select'

    await fetch(`/api/attributes?storeId=${selectedStore.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: safeType }),
    })

    fetchAttributes()
  }

  const handleDeleteAttribute = async (attribute: Attribute) => {
    if (!selectedStore) return
    if (!confirm(`Delete "${attribute.name}" and all of its values?`)) return

    await fetch(`/api/attributes?storeId=${selectedStore.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: attribute.id }),
    })

    fetchAttributes()
  }

  const handleUpdateAttributeValue = async (attribute: Attribute) => {
    if (!selectedStore) return

    const response = await fetch(`/api/attribute-values?storeId=${selectedStore.id}&attributeId=${attribute.id}`)
    const data = await response.json()
    const values: { id: string; value: string }[] = data.data || []

    if (values.length === 0) {
      alert('This attribute has no assigned values yet. Add values from the product wizard by selecting product, variant, and attribute.')
      return
    }

    const menu = values.map((item, index) => `${index + 1}. ${item.value}`).join('\n')
    const choice = prompt(`Which value do you want to edit?\n${menu}`, '1')
    if (!choice) return

    const selected = values[Number(choice) - 1]
    if (!selected) {
      alert('Choose a valid value number.')
      return
    }

    const nextValue = prompt('New value?', selected.value)
    if (!nextValue) return

    const updateResponse = await fetch(`/api/attribute-values?storeId=${selectedStore.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        value: nextValue,
      }),
    })

    if (!updateResponse.ok) {
      const updateData = await updateResponse.json()
      alert(updateData.error || 'Failed to update attribute value.')
      return
    }

    fetchAttributes()
  }

  return (
    <DashboardLayout title="Attributes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Manage product attributes and variations</p>
          <Button onClick={handleCreateAttribute} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus size={18} />
            Add Attribute
          </Button>
        </div>

        {/* Attributes Table */}
        {isLoading ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Attribute</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Values</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Used In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/50">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Attribute</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Values</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Used In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr) => (
                  <tr key={attr.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{attr.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-secondary text-foreground rounded text-xs">
                        {attr.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {attr.values.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {attr.values.slice(0, 3).map((val, index) => (
                            <span key={`${attr.id}-${val}-${index}`} className="px-2 py-1 bg-secondary/50 text-foreground rounded text-xs">
                              {val}
                            </span>
                          ))}
                          {attr.values.length > 3 && (
                            <span className="px-2 py-1 text-muted-foreground text-xs">
                              +{attr.values.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{attr.usedIn} products</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateAttributeValue(attr)}
                          variant="ghost"
                          size="sm"
                          className="h-8"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteAttribute(attr)}
                          variant="ghost"
                          size="sm"
                          className="h-8 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
