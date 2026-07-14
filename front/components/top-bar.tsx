'use client';

import {
  Bell,
  Settings,
  ChevronDown,
  Building2,
  LogOut,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TopBar() {
  const { selectedStore, stores, setSelectedStore, isSuperAdmin } = useStore();
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left section - Store Switcher */}
        <div className="flex-1 flex items-center gap-4">
          {isSuperAdmin && !selectedStore && (
            <div className="text-sm text-muted-foreground">Platform Admin</div>
          )}
          {selectedStore && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  className="gap-2 hover:bg-secondary"
                  onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                >
                  <Building2 size={16} />
                  <span className="hidden sm:inline">{selectedStore.name}</span>
                  <ChevronDown size={16} />
                </Button>
                {isStoreDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg">
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setSelectedStore(store);
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedStore.id === store.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {store.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border hover:bg-secondary"
                onClick={() => setSelectedStore(null)}
                title="Close this store and return to Platform Admin"
              >
                <X size={14} />
                <span className="hidden sm:inline">Close Store</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right section - actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-secondary"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-secondary"
            onClick={() => router.push('/account')}
            title="Account settings"
          >
            <Settings size={20} />
          </Button>

          {/* User profile */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-secondary"
            onClick={handleLogout}
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
