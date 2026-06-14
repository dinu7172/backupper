'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationAction, deleteOrganizationAction } from '../members/actions';
import { getOrgStats } from '../actions';
import {
  Settings,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
  Trash2,
  Save,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function OrgSettingsPage() {
  const router = useRouter();

  // Load States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orgStats, setOrgStats] = useState<any>(null);

  // Form Fields
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getOrgStats();
      if (res.success && res.stats) {
        setOrgStats(res.stats);
        setOrgName(res.stats.orgName);
        setOrgSlug(res.stats.orgSlug);
      } else {
        setError(res.error || 'Failed to load organization settings');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred loading settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await updateOrganizationAction({
        name: orgName,
        slug: orgSlug,
      });

      if (res.success) {
        setSuccess('Organization details updated successfully.');
        loadData();
      } else {
        setError(res.error || 'Failed to update organization details.');
      }
    } catch (err: any) {
      setError(err.message || 'Saving failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm !== orgStats?.orgName) {
      setError('Confirmation name mismatch. Organization deletion aborted.');
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await deleteOrganizationAction();
      if (res.success) {
        alert('Organization deleted successfully.');
        router.push('/onboarding');
      } else {
        setError(res.error || 'Failed to delete organization.');
      }
    } catch (err: any) {
      setError(err.message || 'Deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20 bg-background min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading workspace settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 space-y-6 relative">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Settings className="h-5.5 w-5.5 text-primary" />
            Workspace Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Rename organizations, change slugs, inspect subscription quotas, or delete workspaces.
          </p>
        </div>
      </div>

      {/* Message Banners */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium flex items-start gap-2 relative z-10">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-success/10 border border-success/20 p-4 text-xs text-success font-medium flex items-start gap-2 relative z-10">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Settings Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Left Column: Rename workspace */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-2">
              <Layers className="h-4.5 w-4.5 text-primary" />
              General Parameters
            </h3>

            <form onSubmit={handleUpdateOrg} className="space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  disabled={saving}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="org-slug" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  URL Slug
                </label>
                <input
                  id="org-slug"
                  type="text"
                  required
                  disabled={saving}
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="acme-corp"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  Access path: /dashboard
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !orgName || !orgSlug}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Workspace Details
              </button>
            </form>
          </div>

          {/* Delete workspace card */}
          <div className="glass-card p-6 rounded-lg border border-destructive/20 bg-destructive/5 space-y-4">
            <h3 className="font-bold text-sm text-destructive flex items-center gap-2 border-b border-destructive/10 pb-2">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
              Danger Zone
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting this organization will permanently remove all nested projects, connected servers credentials vault, backup collections logs, and revoked user memberships. This action is irreversible.
            </p>

            <form onSubmit={handleDeleteOrg} className="space-y-3 pt-2">
              <div>
                <label htmlFor="confirm-del" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Type <span className="font-mono text-foreground font-bold">{orgStats?.orgName}</span> to confirm deletion:
                </label>
                <input
                  id="confirm-del"
                  type="text"
                  required
                  disabled={deleting}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type organization name..."
                  className="block w-full rounded-md border border-border bg-secondary/80 px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={deleting || deleteConfirm !== orgStats?.orgName}
                className="flex items-center justify-center gap-1.5 rounded-md bg-destructive py-2 px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/95 transition-colors shadow disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Workspace Permanently
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Limits and Plan stats */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-2">
              <HelpCircle className="h-4.5 w-4.5 text-primary" />
              Plan Limits
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Active Subscription</span>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary uppercase tracking-wider">
                  {orgStats?.plan} Plan
                </span>
              </div>

              <div className="border-t border-border/30 pt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Projects Quota</span>
                  <span className="font-semibold">{orgStats?.projectCount} / {orgStats?.maxProjects}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-primary h-1 rounded-full"
                    style={{ width: `${Math.min((orgStats?.projectCount / orgStats?.maxProjects) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-t border-border/30 pt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Servers Quota</span>
                  <span className="font-semibold">{orgStats?.serverCount} / {orgStats?.maxServers}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-primary h-1 rounded-full"
                    style={{ width: `${Math.min((orgStats?.serverCount / orgStats?.maxServers) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-t border-border/30 pt-2 text-center">
                <p className="text-[10px] text-muted-foreground italic">
                  Need more capacity? Contact billing to upgrade subscription limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
