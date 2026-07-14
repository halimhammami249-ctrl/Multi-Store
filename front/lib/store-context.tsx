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
    const saved = localStorage.getItem('selectedStoreId');

    if (saved) {
      setSelectedStoreId(saved);
    }

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

  useEffect(() => {
    if (stores.length === 0) return;

    // Already resolved (e.g. user manually switched stores) - don't stomp it.
    if (selectedStore) return;

    const saved = selectedStoreId
      ? stores.find((s) => s.id === selectedStoreId)
      : undefined;

    handleSetSelectedStore(saved || stores[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  useEffect(() => {
    if (selectedStoreId) {
      localStorage.setItem('selectedStoreId', selectedStoreId);
    } else {
      localStorage.removeItem('selectedStoreId');
    }
  }, [selectedStoreId]);

  const handleSetSelectedStore = (store: Store | null) => {
    setSelectedStore(store);

    if (store) {
      setSelectedStoreId(store.id);
    } else {
      setSelectedStoreId(null);
    }
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
