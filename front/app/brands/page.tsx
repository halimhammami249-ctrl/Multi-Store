'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store-context';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Brand {
  id: string;
  name: string;
  productCount: number;
  isActive: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedStore } = useStore();

  const fetchBrands = async () => {
    if (!selectedStore) {
      setBrands([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/brands?storeId=${selectedStore.id}`);
      const data = await res.json();
      setBrands(data.data || []);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [selectedStore]);

  const handleCreateBrand = async () => {
    if (!selectedStore) return;

    const name = prompt('Brand name?');
    if (!name) return;

    try {
      await fetch(`/api/brands?storeId=${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          isActive: true,
        }),
      });

      fetchBrands();
    } catch (err) {
      console.error('Failed to create brand:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedStore) return;
    if (!confirm('Delete this brand?')) return;

    try {
      await fetch(`/api/brands?storeId=${selectedStore.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      fetchBrands();
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
  };

  const handleUpdateBrand = async (brand: Brand) => {
    if (!selectedStore) return;

    const name = prompt('Brand name?', brand.name);
    if (!name) return;

    const status = confirm('Should this brand be active?');
    const response = await fetch(`/api/brands?storeId=${selectedStore.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: brand.id,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        is_active: status,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || 'Failed to update brand.');
      return;
    }

    fetchBrands();
  };

  return (
    <DashboardLayout title="Brands">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Manage product brands</p>

          <Button
            onClick={handleCreateBrand}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus size={18} />
            Add Brand
          </Button>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Brand Name</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-muted w-24 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-muted w-12 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-muted w-16 animate-pulse rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-muted w-20 animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                : brands.map((brand) => (
                    <tr
                      key={brand.id}
                      className="border-b hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-medium">{brand.name}</td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {brand.productCount}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            brand.isActive
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-gray-900/30 text-gray-400'
                          }`}
                        >
                          {brand.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-4 py-3 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateBrand(brand)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand.id)}
                          className="hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
