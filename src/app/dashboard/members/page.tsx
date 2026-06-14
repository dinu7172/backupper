'use client';

import { useState, useEffect } from 'react';
import { getOrgMembers, inviteUser, removeMember, revokeInvitation } from './actions';
import {
  Users,
  Plus,
  Mail,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
  Clock,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

interface MemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Form States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'developer' | 'operator' | 'viewer'>('developer');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Action loading states
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getOrgMembers();
      if (res.success && res.members && res.invitations) {
        setMembers(res.members);
        setInvitations(res.invitations);
      } else {
        setError(res.error || 'Failed to retrieve team members');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred while loading team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await inviteUser({
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.success) {
        setSuccessMsg(`Invitation successfully sent to ${inviteEmail}.`);
        setInviteEmail('');
        setIsInviteOpen(false);
        loadData(true);
      } else {
        setError(res.error || 'Failed to send invitation.');
      }
    } catch (err: any) {
      setError(err.message || 'Invitation failed.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this organization?`)) return;

    setActingId(userId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await removeMember(userId);
      if (res.success) {
        setSuccessMsg(`${name} was removed from the organization.`);
        loadData(true);
      } else {
        setError(res.error || 'Failed to remove member.');
      }
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  const handleRevokeInvitation = async (inviteId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the pending invitation for ${email}?`)) return;

    setActingId(inviteId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await revokeInvitation(inviteId);
      if (res.success) {
        setSuccessMsg(`Invitation for ${email} has been revoked.`);
        loadData(true);
      } else {
        setError(res.error || 'Failed to revoke invitation.');
      }
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20 bg-background min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading organization members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6 relative">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]"></div>
      </div>

      {/* Header block */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-primary" />
            Team Members
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage active user roles, memberships, and pending invitations.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow glow-primary self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Message banners */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium flex items-start gap-2 max-w-2xl relative z-10">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-md bg-success/10 border border-success/20 p-4 text-xs text-success font-medium flex items-start gap-2 max-w-2xl relative z-10">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active members grid */}
      <div className="relative z-10 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-success" />
          Active Members ({members.length})
        </h2>

        <div className="glass-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/35 text-muted-foreground uppercase font-bold tracking-wide">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Joined At</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{member.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-secondary text-foreground border border-border/80">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(member.joinedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.name)}
                          disabled={actingId !== null}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/15 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {actingId === member.userId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Invitations list */}
      <div className="relative z-10 space-y-4 pt-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          Pending Invitations ({invitations.length})
        </h2>

        {invitations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic pl-1">No pending invitations.</p>
        ) : (
          <div className="glass-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/35 text-muted-foreground uppercase font-bold tracking-wide">
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Invited Role</th>
                    <th className="px-6 py-3.5">Expires At</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">{invite.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(invite.expiresAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRevokeInvitation(invite.id, invite.email)}
                          disabled={actingId !== null}
                          className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/15 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {actingId === invite.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-primary" />
                Invite Team Member
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={inviteLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="inv-email" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  id="inv-email"
                  type="email"
                  required
                  disabled={inviteLoading}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. engineer@company.com"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="inv-role" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Access Role
                </label>
                <select
                  id="inv-role"
                  value={inviteRole}
                  disabled={inviteLoading}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                >
                  <option value="viewer">Viewer (Read-only logs)</option>
                  <option value="operator">Operator (Trigger backup jobs)</option>
                  <option value="developer">Developer (Add servers, database keys)</option>
                  <option value="admin">Admin (Manage members, vault secrets)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Roles permit granular control over servers connections, backups configuration, and database credentials creation.
                </p>
              </div>

              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail}
                className="mt-6 flex w-full justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50"
              >
                {inviteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4.5 w-4.5" />
                )}
                Send Invitation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
