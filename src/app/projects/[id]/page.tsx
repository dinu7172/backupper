import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Server from '@/models/Server';
import { redirect } from 'next/navigation';
import { ShieldCheck, HardDrive, Server as ServerIcon, Database, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.activeOrgId) {
    redirect('/login');
  }

  const { id } = await params;

  await dbConnect();
  const project = await Project.findOne({
    _id: id,
    orgId: session.user.activeOrgId,
  });

  if (!project) {
    redirect('/dashboard');
  }

  // Fetch metrics
  const serverCount = await Server.countDocuments({
    projectId: project._id,
    orgId: session.user.activeOrgId,
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const successRate = project.stats.totalBackups > 0
    ? Math.round((project.stats.successfulBackups / project.stats.totalBackups) * 100)
    : 100;

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Project Health */}
        <div className="glass-card p-6 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Project Health</span>
            <div className={`text-2xl font-black ${successRate >= 90 ? 'text-success' : 'text-warning'}`}>
              {successRate}%
            </div>
            <p className="text-[10px] text-muted-foreground">Backup success rate</p>
          </div>
          <div className="p-3 bg-success/10 rounded-md text-success border border-success/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Storage Size */}
        <div className="glass-card p-6 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Backup Storage</span>
            <div className="text-xl font-black text-foreground">
              {formatBytes(project.stats.totalSizeBytes)}
            </div>
            <p className="text-[10px] text-muted-foreground">Total compressed size</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-md text-primary border border-primary/20">
            <HardDrive className="h-6 w-6" />
          </div>
        </div>

        {/* Active Servers */}
        <div className="glass-card p-6 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Server Targets</span>
            <div className="text-xl font-black text-foreground">
              {serverCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Configured SSH nodes</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-md text-primary border border-primary/20">
            <ServerIcon className="h-6 w-6" />
          </div>
        </div>

        {/* Backups Count */}
        <div className="glass-card p-6 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Backups</span>
            <div className="text-xl font-black text-foreground">
              {project.stats.totalBackups}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {project.stats.failedBackups} failed backups
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-md text-primary border border-primary/20">
            <Database className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Backups List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-primary" />
            Recent Backup Activity
          </h2>
          
          <div className="glass-card rounded-lg p-8 text-center border border-border bg-card/20 min-h-[300px] flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-secondary rounded-full border border-border text-muted-foreground">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-foreground">No backup history</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Connect a server, map database credentials, and configure a backup schedule to capture data snapshots.
            </p>
            <div className="flex gap-3 mt-2">
              <Link
                href={`/projects/${id}/servers`}
                className="rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
              >
                Connect Server
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Connection Summary */}
        <div className="space-y-4">
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-primary" />
            Workspace Checklist
          </h2>

          <div className="glass-card p-6 rounded-lg space-y-4">
            <div className="flex items-start gap-3 text-sm">
              <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${serverCount > 0 ? 'bg-success/20 text-success border border-success/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                1
              </div>
              <div>
                <h4 className="font-bold text-foreground">Connect a Target Server</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Register an SSH host to establish secure streaming transport.
                </p>
                {serverCount === 0 && (
                  <Link
                    href={`/projects/${id}/servers`}
                    className="inline-block text-xs font-bold text-primary hover:underline mt-1.5"
                  >
                    Setup Server &rarr;
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                2
              </div>
              <div>
                <h4 className="font-bold text-foreground">Configure Database Backups</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Input target database engine keys and select schemas.
                </p>
                <Link
                  href={`/projects/${id}/databases`}
                  className="inline-block text-xs font-bold text-primary hover:underline mt-1.5"
                >
                  Configure Databases &rarr;
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                3
              </div>
              <div>
                <h4 className="font-bold text-foreground">Set Schedule</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define cron expressions and GFS archive retention scopes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
