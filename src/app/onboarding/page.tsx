'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createOrganization, getPendingInvitations, acceptInvitation } from './actions';
import { Plus, Users, Check, Loader2, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface InvitationItem {
  id: string;
  role: string;
  orgName: string;
  orgSlug: string;
}

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'create' | 'invites'>('create');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-generate slug from organization name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setOrgName(name);
    setOrgSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Deduplicate hyphens
        .substring(0, 64)
    );
  };

  useEffect(() => {
    async function loadInvitations() {
      try {
        const res = await getPendingInvitations();
        if (res.success && res.invitations) {
          setInvitations(res.invitations);
          if (res.invitations.length > 0) {
            setActiveTab('invites');
          }
        }
      } catch (err) {
        console.error('Failed to load invitations:', err);
      } finally {
        setInvitesLoading(false);
      }
    }
    loadInvitations();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createOrganization({ name: orgName, slug: orgSlug });
    if (res.success && res.orgId) {
      setSuccess('Organization created successfully! Redirecting...');
      // Update NextAuth token/session with activeOrgId
      await update({ activeOrgId: res.orgId });
      router.replace('/dashboard');
    } else {
      setError(res.error || 'Failed to create organization');
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setLoading(true);
    setError(null);

    const res = await acceptInvitation(inviteId);
    if (res.success && res.orgId) {
      setSuccess('Invitation accepted! Redirecting...');
      // Update NextAuth token/session with activeOrgId
      await update({ activeOrgId: res.orgId });
      router.replace('/dashboard');
    } else {
      setError(res.error || 'Failed to accept invitation');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background abstract gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px]"></div>
        <div className="absolute bottom-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-success/10 blur-[80px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 glass-panel p-8 rounded-lg glow-primary">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-wider text-primary">BACKUPPER</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-xs font-semibold text-primary">BDR</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Setup your Workspace
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome, {session?.user?.name || 'Developer'}. To get started, join or create a workspace organization.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-md bg-secondary p-1 border border-border">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'create'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Create Org
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all relative ${
              activeTab === 'invites'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            disabled={loading}
          >
            <Users className="h-4 w-4" />
            Invitations
            {invitations.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">
                {invitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-success/10 border border-success/20 p-4 text-sm text-success font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-success" />
            {success}
          </div>
        )}

        {/* Create Organization Form */}
        {activeTab === 'create' && !success && (
          <form className="space-y-6" onSubmit={handleCreateOrg}>
            <div className="space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  disabled={loading}
                  value={orgName}
                  onChange={handleNameChange}
                  placeholder="e.g. Acme Corp"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="org-slug" className="block text-sm font-medium text-foreground mb-1.5">
                  Workspace URL Slug
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-secondary px-3 text-muted-foreground text-xs select-none">
                    backupper.io/
                  </span>
                  <input
                    id="org-slug"
                    type="text"
                    required
                    disabled={loading}
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme-corp"
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Lowercase letters, numbers, and hyphens only.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !orgName || !orgSlug}
              className="flex w-full justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Organization
            </button>
          </form>
        )}

        {/* Invitations List */}
        {activeTab === 'invites' && !success && (
          <div className="space-y-4">
            {invitesLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Checking invitations...</span>
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg bg-secondary/30">
                <p className="text-sm text-muted-foreground">No pending invitations for your email.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Create an organization instead
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border gap-3"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{invite.orgName}</h4>
                      <p className="text-xs text-muted-foreground">
                        Role: <span className="capitalize text-primary font-medium">{invite.role}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-md bg-success py-1.5 px-3 text-xs font-semibold text-success-foreground hover:bg-success/90 transition-all disabled:opacity-50 w-full sm:w-auto justify-center shadow"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logout utility */}
        <div className="border-t border-border pt-4 flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Logged in as {session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 text-destructive hover:underline font-semibold"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
