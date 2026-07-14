'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Store {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended';
  productsCount: number;
  variantsCount: number;
  categoriesCount: number;
  brandsCount: number;
  created_at: string;
  updated_at: string;
}

interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';
}

interface StoreContextType {
  selectedStoreId: string | null;
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  stores: Store[];
  setStores: (stores: Store[]) => void;
  isSuperAdmin: boolean;
  currentUser: CurrentUser | null;
  canWrite: boolean;
  canDelete: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadStores();
  }, []);

  async function loadCurrentUser() {
    try {
      const response = await fetch('/api/auth/me');
      const result = await response.json();
      setCurrentUser(result.data || null);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadStores() {
    try {
      const response = await fetch('/api/stores');
      const result = await response.json();

      setStores(result.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSetSelectedStore = (store: Store | null) => {
    setSelectedStore(store);
    setSelectedStoreId(store ? store.id : null);
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canWrite =
    isSuperAdmin ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'EDITOR';
  const canDelete = isSuperAdmin || currentUser?.role === 'MANAGER';

  return (
    <StoreContext.Provider
      value={{
        selectedStoreId,
        selectedStore,
        setSelectedStore: handleSetSelectedStore,
        stores,
        setStores,
        isSuperAdmin,
        currentUser,
        canWrite,
        canDelete,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return context;
}
