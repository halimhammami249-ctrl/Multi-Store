'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store-context';
import { Plus, Trash2, KeyRound, Shield, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AdminStore {
  id: string;
  name: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';
  is_active: boolean;
  created_at: string;
  stores: AdminStore[];
}

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<AdminUser['role'], string> = {
  SUPER_ADMIN: 'Full access to everything, including managing other admins.',
  MANAGER: 'Full control within their assigned store(s), including deleting.',
  EDITOR: 'Can create and edit within assigned store(s), but not delete.',
  VIEWER: 'Read-only access within assigned store(s).',
};

const ROLE_BADGE: Record<AdminUser['role'], string> = {
  SUPER_ADMIN: 'bg-primary/20 text-primary',
  MANAGER: 'bg-accent/20 text-accent',
  EDITOR: 'bg-blue-900/30 text-blue-400',
  VIEWER: 'bg-gray-700/40 text-gray-300',
};

export default function AdminUsersPage() {
  const { isSuperAdmin, stores, currentUser } = useStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AdminUser['role']>('EDITOR');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin-users');
      const data = await response.json();
      setAdmins(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchAdmins();
  }, [isSuperAdmin]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setRole('EDITOR');
    setSelectedStoreIds([]);
    setFormError('');
  };

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds((prev: string[]) =>
      prev.includes(storeId)
        ? prev.filter((id: string) => id !== storeId)
        : [...prev, storeId],
    );
  };

  const handleCreate = async () => {
    setFormError('');

    if (!email || !password || !fullName) {
      setFormError('Email, password, and full name are required.');
      return;
    }
    if (role !== 'SUPER_ADMIN' && selectedStoreIds.length === 0) {
      setFormError('Select at least one store for this role.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role,
          storeIds: selectedStoreIds,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Failed to create admin');
        return;
      }

      resetForm();
      setShowCreateForm(false);
      fetchAdmins();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    await fetch('/api/admin-users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id, isActive: !admin.is_active }),
    });
    fetchAdmins();
  };

  const handleDelete = async (admin: AdminUser) => {
    if (
      !confirm(
        `Delete ${admin.full_name} (${admin.email})? This can't be undone.`,
      )
    )
      return;

    const response = await fetch('/api/admin-users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Failed to delete admin');
      return;
    }

    fetchAdmins();
  };

  const handleResetPassword = async (admin: AdminUser) => {
    const newPassword = prompt(
      `New password for ${admin.email} (min 8 characters):`,
    );
    if (!newPassword) return;

    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset_password',
        id: admin.id,
        password: newPassword,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Failed to reset password');
      return;
    }

    alert(`Password updated for ${admin.email}.`);
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Admins">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Shield className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-foreground font-medium">
            Super admin access required
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Only super admins can manage admin accounts.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admins">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Create and manage accounts for your team. Only super admins can
            create new accounts.
          </p>
          <Button
            onClick={() => setShowCreateForm((v: boolean) => !v)}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            {showCreateForm ? <X size={18} /> : <Plus size={18} />}
            {showCreateForm ? 'Cancel' : 'New Admin'}
          </Button>
        </div>

        {showCreateForm && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground">
              Create admin account
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Temporary password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminUser['role'])}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="MANAGER">Manager</option>
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </div>

            {role !== 'SUPER_ADMIN' && (
              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  Stores this admin can manage
                </label>
                <div className="flex flex-wrap gap-2">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => toggleStore(store.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedStoreIds.includes(store.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {store.name}
                    </button>
                  ))}
                  {stores.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No stores exist yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button
              onClick={handleCreate}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? 'Creating...' : 'Create admin'}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="bg-card border border-border rounded-lg p-6 animate-pulse h-40" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Stores</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-4">
                      <p className="text-foreground font-medium">
                        {admin.full_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {admin.email}
                      </p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[admin.role]}`}
                      >
                        {ROLE_LABELS[admin.role]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {admin.role === 'SUPER_ADMIN'
                        ? 'All stores'
                        : admin.stores.map((s) => s.name).join(', ') || '—'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(admin)}
                        disabled={admin.id === currentUser?.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                          admin.is_active
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-gray-700/40 text-gray-300'
                        }`}
                        title={
                          admin.id === currentUser?.id
                            ? "You can't deactivate yourself"
                            : 'Toggle active status'
                        }
                      >
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          onClick={() => handleResetPassword(admin)}
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                        >
                          <KeyRound size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(admin)}
                          disabled={admin.id === currentUser?.id}
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                          title={
                            admin.id === currentUser?.id
                              ? "You can't delete yourself"
                              : 'Delete'
                          }
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
  );
}
