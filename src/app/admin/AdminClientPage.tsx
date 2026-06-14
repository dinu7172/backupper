'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  getAdminUsers,
  toggleUserRole,
  resetUserPassword,
  deleteUser,
} from './actions';
import {
  Search,
  User,
  Shield,
  Key,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowLeft,
  RefreshCw,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

interface AdminClientPageProps {
  initialUsers: UserItem[];
  currentUserEmail: string;
  currentUserId: string;
}

export default function AdminClientPage({
  initialUsers,
  currentUserEmail,
  currentUserId,
}: AdminClientPageProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const loadUsers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await getAdminUsers(searchQuery);
      if (res.success && res.users) {
        setUsers(res.users as UserItem[]);
      } else {
        setError(res.error || 'Failed to refresh user list.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadUsers(true);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleToggleRole = async (user: UserItem) => {
    if (user.id === currentUserId) {
      setError('You cannot toggle your own admin permissions.');
      return;
    }

    setUpdatingRoleId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const res = await toggleUserRole(user.id);
      if (res.success && res.newRole) {
        setSuccess(`Successfully updated role of ${user.email} to ${res.newRole}.`);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: res.newRole } : u))
        );
      } else {
        setError(res.error || 'Failed to update user role.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    if (newPassword !== passwordConfirm) {
      setResetError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const res = await resetUserPassword(resettingUser.id, newPassword);
      if (res.success) {
        setSuccess(`Password for ${resettingUser.email} reset successfully.`);
        setResettingUser(null);
        setNewPassword('');
        setPasswordConfirm('');
      } else {
        setResetError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingUser) return;

    if (deleteConfirmation.toLowerCase() !== deletingUser.email.toLowerCase()) {
      setDeleteError('Confirmation email does not match.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await deleteUser(deletingUser.id);
      if (res.success) {
        setSuccess(`User account ${deletingUser.email} has been permanently deleted.`);
        setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
        setDeletingUser(null);
        setDeleteConfirmation('');
      } else {
        setDeleteError(res.error || 'Failed to delete user.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative pb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-destructive/5 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-[1px] bg-border"></div>
            <span className="text-sm font-black tracking-wider text-primary">ADMIN CONSOLE</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadUsers(true)}
              disabled={refreshing}
              className="p-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh Users List"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-xs text-muted-foreground">
              Connected as <span className="font-semibold text-foreground">{currentUserEmail}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Platform User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global administrative control panel to manage platform users, authentication credentials, system roles, and account security.
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium flex items-start gap-2 max-w-4xl">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-md bg-success/10 border border-success/20 p-4 text-xs text-success font-medium flex items-start gap-2 max-w-4xl">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Search Control */}
        <div className="glass-card p-4 rounded-lg flex items-center gap-3 max-w-lg border border-border/60">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full bg-transparent border-0 p-0 text-foreground placeholder-muted-foreground focus:ring-0 focus:outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="glass-card border border-border/80 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            {loading && users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Retrieving registered users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground text-center">
                <User className="h-10 w-10 mb-1" />
                <h3 className="font-bold text-sm text-foreground">No users found</h3>
                <p className="text-xs max-w-xs">No records matched your search query. Try typing a different email or name.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/35 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Two-Factor Auth</th>
                    <th className="px-6 py-4">Last Activity</th>
                    <th className="px-6 py-4">Registration Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isUpdating = updatingRoleId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shrink-0 capitalize">
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                                {user.name}
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary uppercase shrink-0">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-bold flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50 font-medium flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                User
                              </span>
                            )}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleRole(user)}
                                disabled={isUpdating}
                                className="text-[10px] font-bold text-primary hover:underline disabled:opacity-50"
                              >
                                {isUpdating ? 'Updating...' : `Set as ${user.role === 'admin' ? 'User' : 'Admin'}`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.mfaEnabled ? (
                            <span className="text-success font-semibold flex items-center gap-1">
                              <ShieldCheck className="h-4 w-4 shrink-0" />
                              Enabled
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <ShieldAlert className="h-4 w-4 shrink-0 text-muted-foreground" />
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {formatDate(user.lastLoginAt)}
                            </span>
                            {user.lastLoginIp && (
                              <p className="text-[9px] text-muted-foreground font-mono pl-4.5">
                                IP: {user.lastLoginIp}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => setResettingUser(user)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded border border-transparent hover:border-border transition-all"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            {!isSelf && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded border border-transparent hover:border-destructive/20 transition-all"
                                title="Delete Account"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-primary" />
                Reset Password
              </h3>
              <button
                onClick={() => {
                  setResettingUser(null);
                  setResetError(null);
                  setNewPassword('');
                  setPasswordConfirm('');
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={resetLoading}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {resetError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-4">
              Enter a new secure password for <span className="font-semibold text-foreground">{resettingUser.email}</span>. Minimum 8 characters.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-pw" className="block text-[10px] font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <input
                  id="new-pw"
                  type="password"
                  required
                  disabled={resetLoading}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none text-xs"
                />
              </div>

              <div>
                <label htmlFor="confirm-pw" className="block text-[10px] font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirm-pw"
                  type="password"
                  required
                  disabled={resetLoading}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading || newPassword.length < 8 || newPassword !== passwordConfirm}
                className="mt-6 flex w-full justify-center items-center gap-2 rounded-md bg-primary py-2 px-3 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50"
              >
                {resetLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4.5 w-4.5" />
                )}
                Save New Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Safety Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-4.5 w-4.5" />
                Permanently Delete User
              </h3>
              <button
                onClick={() => {
                  setDeletingUser(null);
                  setDeleteError(null);
                  setDeleteConfirmation('');
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={deleteLoading}
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold">CRITICAL WARNING</p>
                <p className="leading-relaxed font-normal">
                  This action is irreversible. All organizations owned by this user, their databases configurations, servers connections, and backup setups might be deleted or left orphaned.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              To confirm this action, please type the user's email address <span className="font-bold text-foreground select-all">{deletingUser.email}</span> below:
            </p>

            <form onSubmit={handleDeleteUserSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  disabled={deleteLoading}
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={deletingUser.email}
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-destructive focus:ring-1 focus:ring-destructive focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={deleteLoading || deleteConfirmation.toLowerCase() !== deletingUser.email.toLowerCase()}
                className="mt-6 flex w-full justify-center items-center gap-2 rounded-md bg-destructive py-2 px-3 text-xs font-semibold text-destructive-foreground shadow hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4.5 w-4.5" />
                )}
                Permanently Delete User Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
