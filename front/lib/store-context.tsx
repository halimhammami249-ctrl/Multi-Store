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

interface StoreContextType {
  selectedStoreId: string | null;
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  stores: Store[];
  setStores: (stores: Store[]) => void;
  isSuperAdmin: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('selectedStoreId');

    if (saved) {
      setSelectedStoreId(saved);
    }

    // FIX: this used to read `selectedStoreId` here, but that's a stale
    // closure over the value from the render that scheduled this effect
    // (always null on mount) - setSelectedStoreId(saved) above doesn't
    // apply until the next render. So loadStores() always overwrote the
    // saved selection with stores[0], and it did so by calling the raw
    // setSelectedStore() instead of handleSetSelectedStore(), which meant
    // selectedStoreId (the string) never got updated to match
    // selectedStore (the object) - the two fell out of sync, and the
    // "remember last store" localStorage effect ended up deleting the
    // saved id on every load.
    //
    // Fix: loadStores() no longer decides the fallback itself. It just
    // loads stores; a separate effect below decides the initial selection
    // once both `stores` and `saved` are known, and always goes through
    // handleSetSelectedStore so both pieces of state stay in sync.
    loadStores();
  }, []);

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

  return (
    <StoreContext.Provider
      value={{
        selectedStoreId,
        selectedStore,
        setSelectedStore: handleSetSelectedStore,
        stores,
        setStores,
        isSuperAdmin: true,
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
