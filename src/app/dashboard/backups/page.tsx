'use client';

import { useState } from 'react';
import {
  Database,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface BackupLogItem {
  id: string;
  projectName: string;
  projectSlug: string;
  sourceType: 'mysql' | 'postgresql' | 'mongodb' | 'files';
  targetHost: string;
  sizeBytes: number;
  compressionRatio: string;
  status: 'completed' | 'failed' | 'running';
  startedAt: string;
  completedAt: string | null;
  checksum: string | null;
}

export default function BackupsLogPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'running'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'db' | 'files'>('all');

  // Mock backup run records
  const backupLogs: BackupLogItem[] = [
    {
      id: 'job-98a0c21b',
      projectName: 'Acme Web Portal',
      projectSlug: 'acme-web-portal',
      sourceType: 'mysql',
      targetHost: 'prod-web-server-01',
      sizeBytes: 156489000, // ~149MB
      compressionRatio: '4.8:1',
      status: 'completed',
      startedAt: '2026-06-14T03:00:00Z',
      completedAt: '2026-06-14T03:00:18Z',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'job-67b12d5f',
      projectName: 'Acme Web Portal',
      projectSlug: 'acme-web-portal',
      sourceType: 'files',
      targetHost: 'prod-web-server-01',
      sizeBytes: 4294967000, // ~4GB
      compressionRatio: '2.1:1',
      status: 'completed',
      startedAt: '2026-06-14T02:00:00Z',
      completedAt: '2026-06-14T02:04:12Z',
      checksum: '8a5da52ed1264c4d0092c4cd71d1822a18921b6b553e1a0f8b89e3a6fa6a6f66',
    },
    {
      id: 'job-32e9124a',
      projectName: 'Acme Analytics Engine',
      projectSlug: 'acme-analytics-engine',
      sourceType: 'postgresql',
      targetHost: 'staging-app-02',
      sizeBytes: 524288000, // 500MB
      compressionRatio: '5.2:1',
      status: 'completed',
      startedAt: '2026-06-13T23:30:00Z',
      completedAt: '2026-06-13T23:31:05Z',
      checksum: '5a4da51ef1264c4d0092c4cd71d1822a18921b6b553e1a0f8b89e3a6fa6a6f66',
    },
    {
      id: 'job-89f41a02',
      projectName: 'Acme Web Portal',
      projectSlug: 'acme-web-portal',
      sourceType: 'mongodb',
      targetHost: 'backup-mirror-target',
      sizeBytes: 0,
      compressionRatio: '0:0',
      status: 'failed',
      startedAt: '2026-06-13T22:00:00Z',
      completedAt: null,
      checksum: null,
    },
    {
      id: 'job-12f5a01b',
      projectName: 'Staging Sandbox',
      projectSlug: 'staging-sandbox',
      sourceType: 'postgresql',
      targetHost: 'dev-sandbox-01',
      sizeBytes: 12450000, // 11.8MB
      compressionRatio: '3.9:1',
      status: 'completed',
      startedAt: '2026-06-13T12:00:00Z',
      completedAt: '2026-06-13T12:00:04Z',
      checksum: 'f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
  ];

  // Helper formats
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter logs
  const filteredLogs = backupLogs.filter((log) => {
    const matchesSearch =
      log.projectName.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.targetHost.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'db' && log.sourceType !== 'files') ||
      (sourceFilter === 'files' && log.sourceType === 'files');

    return matchesSearch && matchesStatus && matchesSource;
  });

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
            <Database className="h-5.5 w-5.5 text-primary" />
            Backups Collection
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse and download historical backup snapshots, verify checksum hashes, or trigger restores.
          </p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="relative z-10 glass-card p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job ID, host, or project..."
            className="w-full bg-secondary rounded border border-border pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-muted-foreground"
          />
        </div>

        {/* Dropdowns filters */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-secondary border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">In Progress</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Type:</span>
            <select
              value={sourceFilter}
              onChange={(e: any) => setSourceFilter(e.target.value)}
              className="bg-secondary border border-border rounded px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="db">Databases only</option>
              <option value="files">Files only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table list */}
      <div className="relative z-10 glass-card rounded-lg border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/35 text-muted-foreground uppercase font-bold tracking-wide">
                <th className="px-6 py-3.5">Job ID</th>
                <th className="px-6 py-3.5">Project Scope</th>
                <th className="px-6 py-3.5">Source Target</th>
                <th className="px-6 py-3.5">Size / Ratio</th>
                <th className="px-6 py-3.5">Execution Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground italic">
                    No backup runs match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let statusBadge = '';
                  let statusText = '';
                  if (log.status === 'completed') {
                    statusBadge = 'bg-success/20 text-success border-success/30';
                    statusText = 'Success';
                  } else if (log.status === 'failed') {
                    statusBadge = 'bg-destructive/10 text-destructive border-destructive/20';
                    statusText = 'Failed';
                  } else {
                    statusBadge = 'bg-primary/20 text-primary border-primary/30';
                    statusText = 'Running';
                  }

                  return (
                    <tr key={log.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-foreground">{log.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{log.projectName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">/{log.projectSlug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px] uppercase tracking-wide font-bold">
                            {log.sourceType}
                          </span>
                          <span className="truncate max-w-[130px]">{log.targetHost}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.status === 'failed' ? (
                          <span className="text-muted-foreground italic">—</span>
                        ) : (
                          <>
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <HardDrive className="h-3 w-3 text-muted-foreground" />
                              <span>{formatBytes(log.sizeBytes)}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Ratio: {log.compressionRatio}</div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(log.startedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {log.status === 'completed' && (
                          <div className="flex items-center justify-end gap-3">
                            {log.checksum && (
                              <button
                                onClick={() => alert(`SHA-256 Checksum Hash:\n${log.checksum}`)}
                                className="text-muted-foreground hover:text-foreground text-[10px] font-semibold border border-border/80 px-2 py-1 rounded bg-secondary/40 hover:bg-secondary flex items-center gap-1"
                                title="Verify SHA-256 Checksum Integrity"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                                Verify
                              </button>
                            )}
                            <button
                              onClick={() => alert(`Triggering download stream for snapshot archive ${log.id}.tar.zst`)}
                              className="text-primary hover:underline font-bold flex items-center gap-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                          </div>
                        )}
                        {log.status === 'failed' && (
                          <span className="text-destructive font-semibold">Errors checked</span>
                        )}
                        {log.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
