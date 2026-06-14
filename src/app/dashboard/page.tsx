'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getProjects, getOrgStats, createProject } from './actions';
import {
  Plus,
  LogOut,
  Folder,
  Server,
  HardDrive,
  Activity,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  environment: 'production' | 'staging' | 'development';
  color: string;
  status: string;
  stats: {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSizeBytes: number;
    lastBackupAt: string | null;
    lastSuccessAt: string | null;
  };
  createdAt: string;
}

interface OrgStats {
  orgName: string;
  orgSlug: string;
  plan: string;
  projectCount: number;
  maxProjects: number;
  serverCount: number;
  maxServers: number;
  storageUsedBytes: number;
  maxStorageBytes: number;
  healthScore: number;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projSlug, setProjSlug] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const [projRes, statsRes] = await Promise.all([getProjects(), getOrgStats()]);
      if (projRes.success && projRes.projects) {
        setProjects(projRes.projects as ProjectItem[]);
      }
      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats as OrgStats);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setProjName(name);
    setProjSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 64)
    );
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const res = await createProject({
      name: projName,
      slug: projSlug,
      environment,
      color,
      description: description || undefined,
    });

    if (res.success && res.projectId) {
      setIsModalOpen(false);
      // Reset fields
      setProjName('');
      setProjSlug('');
      setEnvironment('production');
      setColor(PRESET_COLORS[0]);
      setDescription('');
      // Reload list
      loadData(true);
    } else {
      setModalError(res.error || 'Failed to create project');
    }
    setModalLoading(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading workspace dashboard...</span>
        </div>
      </div>
    );
  }

  const storagePercent = stats
    ? Math.min(Math.round((stats.storageUsedBytes / stats.maxStorageBytes) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative pb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-success/5 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-primary">BACKUPPER</span>
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-bold text-primary">BDR</span>
            </div>
            <div className="h-5 w-[1px] bg-border hidden sm:block"></div>
            <div className="flex items-center gap-1.5 bg-secondary/80 px-3 py-1 rounded-md text-xs font-semibold border border-border">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{stats?.orgName || 'Workspace'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden md:block">
              Connected as <span className="font-semibold text-foreground">{session?.user?.email}</span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:underline"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Title and Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage projects, server backup scopes, and target configurations.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/95 transition-colors glow-primary self-start sm:self-auto"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Project
          </button>
        </div>

        {/* Dashboard Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Health Score Card */}
          <div className="glass-card p-6 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Backup Health</span>
              <div className="text-2xl font-black text-success">
                {stats?.healthScore}%
              </div>
              <p className="text-[10px] text-muted-foreground">Last 7 days success rate</p>
            </div>
            <div className="p-3 bg-success/10 rounded-md text-success border border-success/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          {/* Storage Used Card */}
          <div className="glass-card p-6 rounded-lg flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Storage Used</span>
                <div className="text-lg font-black text-foreground">
                  {stats ? formatBytes(stats.storageUsedBytes) : '0 GB'}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {stats ? formatBytes(stats.maxStorageBytes) : '5 GB'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-primary/10 rounded-md text-primary border border-primary/20">
                <HardDrive className="h-5 w-5" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${storagePercent}%` }}
              ></div>
            </div>
          </div>

          {/* Active Projects Card */}
          <div className="glass-card p-6 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Active Projects</span>
              <div className="text-xl font-black text-foreground">
                {stats?.projectCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {stats?.maxProjects} Limit
                </span>
              </div>
              <span className="inline-block px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary uppercase">
                {stats?.plan || 'Free'} Plan
              </span>
            </div>
            <div className="p-3 bg-primary/10 rounded-md text-primary border border-primary/20">
              <Folder className="h-6 w-6" />
            </div>
          </div>

          {/* Active Servers Card */}
          <div className="glass-card p-6 rounded-lg flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Connected Servers</span>
              <div className="text-xl font-black text-foreground">
                {stats?.serverCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  / {stats?.maxServers} Limit
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">Active nodes health-checked</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-md text-primary border border-primary/20">
              <Server className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Your Projects
          </h2>

          {projects.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card/25 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
              <div className="p-4 bg-secondary/80 rounded-full border border-border text-muted-foreground">
                <Folder className="h-8 w-8" />
              </div>
              <div className="space-y-1 px-4">
                <h3 className="font-bold text-base text-foreground">No active projects</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Create a project to define environment targets, connect databases, configure credentials, and set up backup cron schedules.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
              >
                <Plus className="h-4 w-4" />
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="glass-card hover:bg-card/85 border border-border rounded-lg flex flex-col justify-between overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                  style={{ borderLeft: `4px solid ${project.color}` }}
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">/{project.slug}</p>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          project.environment === 'production'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : project.environment === 'staging'
                            ? 'bg-accent/30 text-accent-foreground border-accent/40'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {project.environment}
                      </span>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Stats List */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">Backups</span>
                        <span className="font-semibold">{project.stats.totalBackups}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-medium">Backup Size</span>
                        <span className="font-semibold">{formatBytes(project.stats.totalSizeBytes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-secondary/45 border-t border-border px-6 py-3.5 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Last: {formatDate(project.stats.lastBackupAt)}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                Create New Project
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={modalLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Notification */}
            {modalError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label htmlFor="p-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Project Name
                </label>
                <input
                  id="p-name"
                  type="text"
                  required
                  disabled={modalLoading}
                  value={projName}
                  onChange={handleNameChange}
                  placeholder="e.g. Production Web App"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div>
                <label htmlFor="p-slug" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Project URL Slug
                </label>
                <input
                  id="p-slug"
                  type="text"
                  required
                  disabled={modalLoading}
                  value={projSlug}
                  onChange={(e) => setProjSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="production-web-app"
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-env" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Environment
                  </label>
                  <select
                    id="p-env"
                    value={environment}
                    disabled={modalLoading}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Theme Color
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        disabled={modalLoading}
                        className={`h-6 w-full rounded-md border transition-all ${
                          color === c
                            ? 'border-foreground scale-110 shadow'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      ></button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="p-desc" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  id="p-desc"
                  rows={3}
                  disabled={modalLoading}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a brief summary of the services in this project scope."
                  className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading || !projName || !projSlug}
                className="mt-6 flex w-full justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50"
              >
                {modalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4.5 w-4.5" />
                )}
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
