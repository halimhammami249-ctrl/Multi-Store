'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store-context'
import { AlertCircle, Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface Brand {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

interface Attribute {
  id: string
  name: string
  type: 'text' | 'select' | 'color' | 'size'
}

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  brandId: string
  categoryId: string
  brand: string
  category: string
  variantCount: number
  priceRange: string
  totalStock: number
  status: 'active' | 'draft' | 'archived'
  createdDate: string
}

interface VariantDraft {
  sku: string
  price: string
  stock: string
}

interface CreatedVariant {
  id: string
  sku: string
}

const steps = ['Brand', 'Category', 'Product', 'Variants', 'Attributes']

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function ProductsPage() {
  const { selectedStore } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active')
  const [variants, setVariants] = useState<VariantDraft[]>([
    { sku: '', price: '', stock: '0' },
  ])
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)
  const [createdVariants, setCreatedVariants] = useState<CreatedVariant[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedAttributeId, setSelectedAttributeId] = useState('')
  const [attributeValue, setAttributeValue] = useState('')
  const [assignedCount, setAssignedCount] = useState(0)
  const [wizardError, setWizardError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchProducts = async () => {
    if (!selectedStore) {
      setProducts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/products?storeId=${selectedStore.id}${searchTerm ? `&search=${searchTerm}` : ''}`)
      const data = await response.json()
      setProducts(data.data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWorkflowOptions = async () => {
    if (!selectedStore) return { brands: [], categories: [], attributes: [] }

    const [brandResponse, categoryResponse, attributeResponse] = await Promise.all([
      fetch(`/api/brands?storeId=${selectedStore.id}`),
      fetch(`/api/categories?storeId=${selectedStore.id}`),
      fetch(`/api/attributes?storeId=${selectedStore.id}`),
    ])
    const [brandData, categoryData, attributeData] = await Promise.all([
      brandResponse.json(),
      categoryResponse.json(),
      attributeResponse.json(),
    ])

    setBrands(brandData.data || [])
    setCategories(categoryData.data || [])
    setAttributes(attributeData.data || [])

    return {
      brands: brandData.data || [],
      categories: categoryData.data || [],
      attributes: attributeData.data || [],
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedStore, searchTerm])

  useEffect(() => {
    fetchWorkflowOptions()
  }, [selectedStore])

  const resetWizard = () => {
    setStep(0)
    setSelectedBrandId('')
    setSelectedCategoryId('')
    setProductName('')
    setDescription('')
    setStatus('active')
    setVariants([{ sku: '', price: '', stock: '0' }])
    setCreatedProductId(null)
    setCreatedVariants([])
    setSelectedVariantId('')
    setSelectedAttributeId('')
    setAttributeValue('')
    setAssignedCount(0)
    setWizardError('')
    setIsSaving(false)
  }

  const openWizard = () => {
    resetWizard()
    fetchWorkflowOptions()
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    resetWizard()
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!selectedStore) return
    if (!confirm(`Delete "${product.name}" and its variants/images?`)) return

    await fetch(`/api/products?storeId=${selectedStore.id}&id=${product.id}`, {
      method: 'DELETE',
    })

    fetchProducts()
  }

  const handleEditProduct = async (product: Product) => {
    if (!selectedStore) return

    const options = await fetchWorkflowOptions()

    const name = prompt('Product name?', product.name)
    if (!name) return

    const brandList = options.brands.map((brand: Brand) => brand.name).join(', ')
    const brandName = prompt(`Brand name? Available: ${brandList}`, product.brand)
    if (!brandName) return

    const categoryList = options.categories.map((category: Category) => category.name).join(', ')
    const categoryName = prompt(`Category name? Available: ${categoryList}`, product.category)
    if (!categoryName) return

    const nextStatus = prompt('Status: active, draft, or archived?', product.status) || product.status
    const safeStatus = ['active', 'draft', 'archived'].includes(nextStatus) ? nextStatus : product.status
    const brand = options.brands.find((item: Brand) => item.name.toLowerCase() === brandName.toLowerCase())
    const category = options.categories.find((item: Category) => item.name.toLowerCase() === categoryName.toLowerCase())

    if (!brand || !category) {
      alert('Brand and category must already exist in this store.')
      return
    }

    const response = await fetch(`/api/products?storeId=${selectedStore.id}&id=${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: slugify(name),
        description: product.description || '',
        brand_id: brand.id,
        category_id: category.id,
        status: safeStatus,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      alert(data.error || 'Failed to update product.')
      return
    }

    fetchProducts()
  }

  const handleCreateProduct = async () => {
    if (!selectedStore || createdProductId) return createdProductId

    setWizardError('')
    setIsSaving(true)

    try {
      const response = await fetch(`/api/products?storeId=${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          slug: slugify(productName),
          description,
          brand_id: selectedBrandId,
          category_id: selectedCategoryId,
          status,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to create product')
      }

      setCreatedProductId(data.id)
      return data.id as string
    } catch (error) {
      setWizardError(error instanceof Error ? error.message : 'Unable to create product')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateVariants = async () => {
    if (!selectedStore) return false

    const productId = createdProductId || await handleCreateProduct()
    if (!productId) return false

    const validVariants = variants.filter((variant) => variant.price !== '' && variant.stock !== '')

    if (validVariants.length === 0) {
      setWizardError('Create at least one variant with price and stock')
      return false
    }

    setWizardError('')
    setIsSaving(true)

    try {
      const created: CreatedVariant[] = []

      for (const variant of validVariants) {
        const response = await fetch(`/api/variants?storeId=${selectedStore.id}&productId=${productId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku: variant.sku || null,
            price: Number(variant.price),
            stock: Number(variant.stock),
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to create variant')
        }

        created.push({ id: data.id, sku: data.sku || 'No SKU' })
      }

      setCreatedVariants(created)
      setSelectedVariantId(created[0]?.id || '')
      return true
    } catch (error) {
      setWizardError(error instanceof Error ? error.message : 'Unable to create variants')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignAttribute = async () => {
    if (!selectedStore || !selectedVariantId || !selectedAttributeId || !attributeValue) return

    setWizardError('')
    setIsSaving(true)

    try {
      const valueResponse = await fetch(`/api/attribute-values?storeId=${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute_id: selectedAttributeId,
          value: attributeValue,
        }),
      })
      const valueData = await valueResponse.json()

      if (!valueResponse.ok) {
        throw new Error(valueData.error || 'Unable to create attribute value')
      }

      const linkResponse = await fetch(`/api/variant-attributes?storeId=${selectedStore.id}&variantId=${selectedVariantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute_value_id: valueData.data.id,
        }),
      })
      const linkData = await linkResponse.json()

      if (!linkResponse.ok) {
        throw new Error(linkData.error || 'Unable to assign attribute')
      }

      setAssignedCount((count) => count + 1)
      setAttributeValue('')
    } catch (error) {
      setWizardError(error instanceof Error ? error.message : 'Unable to assign attribute')
    } finally {
      setIsSaving(false)
    }
  }

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(selectedBrandId)
    if (step === 1) return Boolean(selectedCategoryId)
    if (step === 2) return Boolean(productName.trim())
    if (step === 3) return variants.some((variant) => variant.price !== '' && variant.stock !== '')
    return true
  }, [step, selectedBrandId, selectedCategoryId, productName, variants])

  const handleNext = async () => {
    if (!canContinue || isSaving) return

    if (step === 2) {
      const productId = await handleCreateProduct()
      if (!productId) return
    }

    if (step === 3) {
      const ok = await handleCreateVariants()
      if (!ok) return
    }

    setWizardError('')
    setStep((current) => Math.min(current + 1, steps.length - 1))
  }

  const handleFinish = () => {
    closeWizard()
    fetchProducts()
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'name' as const, label: 'Product Name', width: '22%' },
    { key: 'brand' as const, label: 'Brand', width: '15%' },
    { key: 'category' as const, label: 'Category', width: '15%' },
    { key: 'variantCount' as const, label: 'Variants', width: '10%' },
    { key: 'priceRange' as const, label: 'Price Range', width: '12%' },
    {
      key: 'totalStock' as const,
      label: 'Total Stock',
      render: (value: number) => (
        <span className={value > 100 ? 'text-green-400' : value > 0 ? 'text-yellow-400' : 'text-red-400'}>
          {value} units
        </span>
      ),
      width: '10%',
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string, row: Product) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            value === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-900/30 text-gray-400'
          }`}>
            {value === 'active' ? 'Active' : value}
          </span>
          <button
            onClick={() => handleEditProduct(row)}
            className="p-1 hover:bg-secondary rounded transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDeleteProduct(row)}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      width: '16%',
    },
  ]

  if (!selectedStore) {
    return (
      <DashboardLayout title="Products">
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Store Selected</h2>
          <p className="text-muted-foreground mb-6">Select a store from the top navigation to manage its products.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Products">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={openWizard} className="bg-primary hover:bg-primary/90 gap-2 w-full md:w-auto">
            <Plus size={18} />
            Add Product
          </Button>
        </div>

        <DataTable columns={columns} data={filteredProducts} isLoading={isLoading} />

        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>
      </div>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-lg">
            <div className="sticky top-0 bg-card border-b border-border p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create Connected Product</h2>
                <p className="text-sm text-muted-foreground">Store - Brand - Category - Product - Variant - Attributes</p>
              </div>
              <button onClick={closeWizard} className="p-1 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-5 gap-2">
                {steps.map((label, index) => (
                  <div
                    key={label}
                    className={`rounded border px-2 py-2 text-center text-xs ${
                      index === step
                        ? 'border-primary text-primary'
                        : index < step
                          ? 'border-green-500/40 text-green-400'
                          : 'border-border text-muted-foreground'
                    }`}
                  >
                    {index < step ? <Check className="mx-auto mb-1" size={14} /> : null}
                    {label}
                  </div>
                ))}
              </div>

              {wizardError && (
                <div className="border border-destructive/40 bg-destructive/10 text-destructive rounded p-3 text-sm">
                  {wizardError}
                </div>
              )}

              {step === 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Step 1: Select Brand</h3>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="">Choose a brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Step 2: Select Category</h3>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Step 3: Product Details</h3>
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Product name"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground min-h-24"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'draft' | 'archived')}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Step 4: Create Variants</h3>
                  {variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={variant.sku}
                        onChange={(e) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, sku: e.target.value } : item))}
                        placeholder="SKU optional"
                        className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, price: e.target.value } : item))}
                        placeholder="Price"
                        className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                      />
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, stock: e.target.value } : item))}
                        placeholder="Stock"
                        className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVariants((items) => [...items, { sku: '', price: '', stock: '0' }])}
                  >
                    Add Variant Row
                  </Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Step 5: Assign Attributes To Variant</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    >
                      <option value="">Select variant</option>
                      {createdVariants.map((variant) => (
                        <option key={variant.id} value={variant.id}>{variant.sku}</option>
                      ))}
                    </select>
                    <select
                      value={selectedAttributeId}
                      onChange={(e) => setSelectedAttributeId(e.target.value)}
                      className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    >
                      <option value="">Select attribute</option>
                      {attributes.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>{attribute.name}</option>
                      ))}
                    </select>
                    <input
                      value={attributeValue}
                      onChange={(e) => setAttributeValue(e.target.value)}
                      placeholder="Value"
                      className="px-3 py-2 bg-secondary border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAssignAttribute}
                      disabled={!selectedVariantId || !selectedAttributeId || !attributeValue || isSaving}
                    >
                      Assign Attribute
                    </Button>
                    <span className="text-sm text-muted-foreground">{assignedCount} assignments added</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((current) => Math.max(current - 1, 0))}
                  disabled={step === 0 || isSaving || Boolean(createdProductId && step <= 2)}
                >
                  Back
                </Button>
                {step < steps.length - 1 ? (
                  <Button onClick={handleNext} disabled={!canContinue || isSaving}>
                    {isSaving ? 'Saving...' : 'Continue'}
                  </Button>
                ) : (
                  <Button onClick={handleFinish}>
                    Finish
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
