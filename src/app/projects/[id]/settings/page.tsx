'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { updateProject, deleteProject } from '../../../dashboard/members/actions';
import { getProjects } from '../../../dashboard/actions';
import {
  Settings,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Trash2,
  Save,
  Folder,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  environment: 'production' | 'staging' | 'development';
}

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // Load States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getProjects();
      if (res.success && res.projects) {
        const myProj = (res.projects as ProjectItem[]).find((p) => p.id === projectId);
        if (myProj) {
          setProjectName(myProj.name);
          setProjectSlug(myProj.slug);
          setEnvironment(myProj.environment);
        } else {
          setError('Project not found in your workspace.');
        }
      } else {
        setError(res.error || 'Failed to load project details.');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred loading project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await updateProject(projectId, {
        name: projectName,
        slug: projectSlug,
        environment,
      });

      if (res.success) {
        setSuccess('Project details updated successfully.');
        loadData();
      } else {
        setError(res.error || 'Failed to update project details.');
      }
    } catch (err: any) {
      setError(err.message || 'Saving failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm !== projectName) {
      setError('Confirmation name mismatch. Project deletion aborted.');
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await deleteProject(projectId);
      if (res.success) {
        alert('Project deleted successfully.');
        router.push('/dashboard');
        // Force refresh to update sidebar projects list
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        setError(res.error || 'Failed to delete project.');
      }
    } catch (err: any) {
      setError(err.message || 'Deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-background/50 rounded-lg min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading project settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Left Column: Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/30 pb-2">
              <Folder className="h-4.5 w-4.5 text-primary" />
              Project Parameters
            </h3>

            <form onSubmit={handleUpdateProject} className="space-y-4">
              <div>
                <label htmlFor="p-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Project Name
                </label>
                <input
                  id="p-name"
                  type="text"
                  required
                  disabled={saving}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Production Web App"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="p-slug" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  URL Slug
                </label>
                <input
                  id="p-slug"
                  type="text"
                  required
                  disabled={saving}
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="production-web-app"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="p-env" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Target Environment
                </label>
                <select
                  id="p-env"
                  value={environment}
                  disabled={saving}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving || !projectName || !projectSlug}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Project Details
              </button>
            </form>
          </div>

          {/* Delete Project card */}
          <div className="glass-card p-6 rounded-lg border border-destructive/20 bg-destructive/5 space-y-4">
            <h3 className="font-bold text-sm text-destructive flex items-center gap-2 border-b border-destructive/10 pb-2">
              <Trash2 className="h-4.5 w-4.5 text-destructive" />
              Danger Zone
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting this project will permanently remove its details, connected server targets Connection configurations, and configuration schedules. This cannot be undone.
            </p>

            <form onSubmit={handleDeleteProject} className="space-y-3 pt-2">
              <div>
                <label htmlFor="confirm-p-del" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Type <span className="font-mono text-foreground font-bold">{projectName}</span> to confirm deletion:
                </label>
                <input
                  id="confirm-p-del"
                  type="text"
                  required
                  disabled={deleting}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type project name..."
                  className="block w-full rounded-md border border-border bg-secondary/80 px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={deleting || deleteConfirm !== projectName}
                className="flex items-center justify-center gap-1.5 rounded-md bg-destructive py-2 px-4 text-xs font-semibold text-destructive-foreground hover:bg-destructive/95 transition-colors shadow disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Project Permanently
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scoped details */}
        <div className="space-y-6 text-xs text-muted-foreground">
          <div className="glass-card p-6 rounded-lg border border-border space-y-3">
            <h4 className="font-bold text-foreground">Project Specs</h4>
            <div className="border-t border-border/30 pt-2 flex justify-between">
              <span>Project ID</span>
              <span className="font-mono">{projectId}</span>
            </div>
            <div className="border-t border-border/30 pt-2 flex justify-between">
              <span>Security Level</span>
              <span className="font-bold text-success flex items-center gap-1">
                Zero Trust
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
