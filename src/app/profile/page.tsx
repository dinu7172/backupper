'use client';

import { useState, useEffect } from 'react';
import { getUserProfile, updateProfile } from '../dashboard/members/actions';
import {
  User,
  Mail,
  Clock,
  Bell,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [notifyOnBackupFail, setNotifyOnBackupFail] = useState(true);
  const [notifyOnBackupSuccess, setNotifyOnBackupSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUserProfile();
      if (res.success && res.profile) {
        setName(res.profile.name);
        setEmail(res.profile.email);
        setTimezone(res.profile.timezone);
        setNotifyOnBackupFail(res.profile.notifyOnBackupFail);
        setNotifyOnBackupSuccess(res.profile.notifyOnBackupSuccess);
      } else {
        setError(res.error || 'Failed to retrieve profile data.');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred loading profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await updateProfile({
        name,
        timezone,
        notifyOnBackupFail,
        notifyOnBackupSuccess,
      });

      if (res.success) {
        setSuccess('Profile preferences saved successfully.');
        loadData();
      } else {
        setError(res.error || 'Failed to save profile details.');
      }
    } catch (err: any) {
      setError(err.message || 'Saving failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-20 bg-background min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading profile settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-8 space-y-6 relative">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <User className="h-5.5 w-5.5 text-primary" />
            Personal Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Update account information, regional timezones, and email backup notifications.
          </p>
        </div>
      </div>

      {/* Messages */}
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

      {/* Form Card */}
      <div className="relative z-10 glass-card p-6 rounded-lg border border-border">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                required
                disabled={saving}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
              />
            </div>

            {/* Email (Disabled) */}
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 bg-secondary/50 border border-border/80 px-3 py-2 rounded-md text-sm text-muted-foreground select-none">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Linked OAuth/Credentials primary identity (cannot be changed).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/30">
            {/* Timezone */}
            <div>
              <label htmlFor="prof-tz" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Timezone
              </label>
              <select
                id="prof-tz"
                value={timezone}
                disabled={saving}
                onChange={(e) => setTimezone(e.target.value)}
                className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
              >
                <option value="UTC">UTC / Greenwich Mean Time</option>
                <option value="America/New_York">EST / New York Time</option>
                <option value="Europe/London">GMT / London Time</option>
                <option value="Asia/Kolkata">IST / Mumbai, New Delhi Time</option>
                <option value="Asia/Tokyo">JST / Tokyo Time</option>
                <option value="Australia/Sydney">AEST / Sydney Time</option>
              </select>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-3">
              <span className="block text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                Email Notifications
              </span>

              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyOnBackupFail}
                    disabled={saving}
                    onChange={(e) => setNotifyOnBackupFail(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-foreground">Notify on Backup Failure</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Receive instant failure alerts for cron backup execution issues.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-2">
                  <input
                    type="checkbox"
                    checked={notifyOnBackupSuccess}
                    disabled={saving}
                    onChange={(e) => setNotifyOnBackupSuccess(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-foreground">Notify on Backup Success</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Receive verification confirmation emails for successful runs.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name}
            className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Profile Settings
          </button>
        </form>
      </div>
    </div>
  );
}
