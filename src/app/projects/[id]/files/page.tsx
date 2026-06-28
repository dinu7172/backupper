'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getServers,
  getCredentials,
} from '../servers/actions';
import {
  getBackupJobs,
  saveBackupJob,
  deleteBackupJob,
  toggleJobStatus,
  listServerDirectoryAction,
  triggerFileBackupAction,
} from './actions';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle,
  HardDrive,
  Cloud,
  Terminal,
  File,
} from 'lucide-react';

interface ServerItem {
  id: string;
  name: string;
  hostname: string;
  status: string;
}

interface CredentialItem {
  id: string;
  name: string;
  type: string;
}

interface BackupJobItem {
  id: string;
  name: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  sourcePath: string;
  destinationId: string;
  destinationName: string;
  destinationType: string;
  destinationPath: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'paused';
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'failed' | null;
  lastRunError: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  children?: TreeNode[];
  loaded?: boolean;
}

export default function FileBackupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // Loading States
  const [jobs, setJobs] = useState<BackupJobItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [destinations, setDestinations] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Executing States
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<{ jobId: string; output: string; success: boolean } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [jobName, setJobName] = useState('');
  const [selectedServerId, setSelectedServerId] = useState('');
  const [selectedDestId, setSelectedDestId] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [destPath, setDestPath] = useState('backups/files/');
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // File Browser State
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [browsingPath, setBrowsingPath] = useState('/');
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [jobRes, srvRes, destRes] = await Promise.all([
        getBackupJobs(projectId),
        getServers(projectId),
        getCredentials(projectId, ['aws_s3', 'cloudflare_r2']),
      ]);

      if (jobRes.success && jobRes.jobs) {
        setJobs(jobRes.jobs as BackupJobItem[]);
      }
      if (srvRes.success && srvRes.servers) {
        setServers(srvRes.servers as ServerItem[]);
        if (srvRes.servers.length > 0 && !selectedServerId) {
          setSelectedServerId(srvRes.servers[0].id);
        }
      }
      if (destRes.success && destRes.credentials) {
        setDestinations(destRes.credentials as CredentialItem[]);
        if (destRes.credentials.length > 0 && !selectedDestId) {
          setSelectedDestId(destRes.credentials[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Load root directory contents when server is selected in modal
  useEffect(() => {
    if (isModalOpen && selectedServerId) {
      loadDirectory('/', null);
    } else {
      setTreeData([]);
      setSourcePath('');
    }
  }, [selectedServerId, isModalOpen]);

  // Fetch subdirectories for directory tree browser
  const loadDirectory = async (path: string, nodeToUpdate: TreeNode | null) => {
    if (!selectedServerId) return;

    // Verify server is connected
    const serverObj = servers.find((s) => s.id === selectedServerId);
    if (serverObj?.status !== 'connected') {
      setExplorerError('Cannot browse files. Selected server is unreachable or pending validation.');
      return;
    }

    setExplorerError(null);
    if (!nodeToUpdate) setExplorerLoading(true);

    try {
      const res = await listServerDirectoryAction(selectedServerId, path);
      if (res.success && res.files) {
        // Map items into TreeNodes
        const childNodes: TreeNode[] = res.files
          .map((f) => ({
            name: f.name,
            path: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
            isDirectory: f.isDirectory,
            size: f.size,
          }))
          .sort((a, b) => {
            // Folders first, alphabetical order
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });

        if (nodeToUpdate) {
          nodeToUpdate.children = childNodes;
          nodeToUpdate.loaded = true;
          // Trigger state update
          setTreeData([...treeData]);
        } else {
          setTreeData(childNodes);
        }
      } else {
        setExplorerError(res.error || 'Failed to read directory');
      }
    } catch (err: any) {
      setExplorerError(err.message || 'Error occurred while fetching files');
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleNodeToggle = async (node: TreeNode) => {
    if (!node.isDirectory) {
      // If it is a file, select it
      setSourcePath(node.path);
      return;
    }

    // Toggle expansion inside a nested tree logic:
    // We can save selected path as source
    setSourcePath(node.path);
    setBrowsingPath(node.path);

    if (node.loaded) {
      node.loaded = false; // collapse if loaded (toggle)
      setTreeData([...treeData]);
    } else {
      await loadDirectory(node.path, node);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName || !selectedServerId || !sourcePath || !selectedDestId) {
      setModalError('Please fill out all required fields and select a backup folder.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const res = await saveBackupJob({
        projectId,
        name: jobName,
        serverId: selectedServerId,
        sourcePath,
        destinationId: selectedDestId,
        destinationPath: destPath,
        schedule,
      });

      if (res.success) {
        setIsModalOpen(false);
        setJobName('');
        setSourcePath('');
        loadData(true);
      } else {
        setModalError(res.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error saving backup job');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleJob = async (job: BackupJobItem) => {
    try {
      const res = await toggleJobStatus(job.id, job.status);
      if (res.success) {
        loadData(true);
      } else {
        alert(res.error || 'Failed to update job status');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating status');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this file backup job?')) return;

    try {
      const res = await deleteBackupJob(jobId);
      if (res.success) {
        loadData(true);
      } else {
        alert(res.error || 'Failed to delete job');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting job');
    }
  };

  const handleRunBackup = async (jobId: string) => {
    setRunningJobId(jobId);
    setRunLog(null);

    try {
      const res = await triggerFileBackupAction(jobId);
      setRunLog({
        jobId,
        output: res.logOutput || 'No output log returned.',
        success: !!res.success,
      });
      loadData(true);
    } catch (err: any) {
      setRunLog({
        jobId,
        output: `Runner failed with exception: ${err.message}`,
        success: false,
      });
    } finally {
      setRunningJobId(null);
    }
  };

  // Directory Tree Renderer
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isExpanded = !!(node.loaded && node.children);
    return (
      <div key={node.path} className="select-none text-xs">
        <div
          onClick={() => handleNodeToggle(node)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`flex items-center gap-1.5 py-1.5 rounded hover:bg-secondary/60 cursor-pointer ${
            sourcePath === node.path ? 'bg-primary/15 text-primary border-l-2 border-primary font-semibold' : 'text-foreground/80'
          }`}
        >
          {node.isDirectory ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3 shrink-0" />
              <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
          {!node.isDirectory && node.size > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto pr-2 font-mono">
              {(node.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        {isExpanded && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-background/50 rounded-lg min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading file backup configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">File Backups</h2>
          <p className="text-xs text-muted-foreground">
            Configure directory archives to stream directly to secure cloud storage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow glow-primary"
          >
            <Plus className="h-4 w-4" />
            Create Backup Job
          </button>
        </div>
      </div>

      {/* Main Jobs Listing */}
      {jobs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card/15 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
          <div className="p-4 bg-secondary/80 rounded-full border border-border text-muted-foreground">
            <HardDrive className="h-8 w-8" />
          </div>
          <div className="space-y-1 px-4">
            <h3 className="font-bold text-sm text-foreground">No file backups configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Schedule automated backups for static uploads, codebase structures, or folder logs.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
          >
            <Plus className="h-4 w-4" />
            Configure First Backup
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => {
            const isRunning = runningJobId === job.id;
            const hasLog = runLog && runLog.jobId === job.id;

            return (
              <div
                key={job.id}
                className="glass-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info block */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${job.status === 'active' ? 'bg-success' : 'bg-muted'}`} />
                      <h3 className="font-bold text-sm text-foreground">{job.name}</h3>
                      <span className="text-[10px] text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded uppercase font-medium">
                        {job.schedule}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5" />
                        Source: <span className="font-mono text-foreground font-semibold truncate max-w-[180px]" title={job.sourcePath}>{job.sourcePath}</span>
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Cloud className="h-3.5 w-3.5" />
                        Target: <span className="text-foreground truncate max-w-[180px]" title={`${job.destinationName}/${job.destinationPath}`}>{job.destinationName} ({job.destinationType})</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground col-span-2">
                        Server: {job.serverName} ({job.serverHost})
                      </p>
                    </div>
                  </div>

                  {/* Actions & Status block */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="text-right text-xs mr-2">
                      <p className="text-muted-foreground text-[10px] uppercase">Last Status</p>
                      {job.lastRunStatus ? (
                        <span className={`font-bold capitalize ${job.lastRunStatus === 'success' ? 'text-success' : 'text-destructive'}`}>
                          {job.lastRunStatus === 'success' ? 'Success' : 'Failed'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic font-normal">Pending first run</span>
                      )}
                    </div>

                    {/* Run now button */}
                    <button
                      onClick={() => handleRunBackup(job.id)}
                      disabled={isRunning || job.status === 'paused'}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary border border-border hover:bg-secondary/70 text-xs font-bold text-foreground disabled:opacity-50"
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-success fill-success/20" />
                      )}
                      Run Now
                    </button>

                    {/* Toggle pause/active */}
                    <button
                      onClick={() => handleToggleJob(job)}
                      className="p-1.5 hover:bg-secondary border border-border rounded text-muted-foreground hover:text-foreground"
                      title={job.status === 'active' ? 'Pause Schedule' : 'Activate Schedule'}
                    >
                      {job.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-1.5 hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded text-muted-foreground hover:text-destructive"
                      title="Delete Config"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Log Terminal output overlay */}
                {hasLog && (
                  <div className="bg-black/95 text-green-400 font-mono text-[10px] p-4 border-t border-border relative animate-fade-in max-h-[200px] overflow-y-auto pr-8">
                    <button
                      onClick={() => setRunLog(null)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-secondary/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1 mb-2 text-xs font-bold border-b border-border/20 pb-1">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      <span>Backup Job Run Logs</span>
                      <span className={`ml-auto text-[10px] px-1.5 rounded ${runLog.success ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                        {runLog.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed">{runLog.output}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Backup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden my-8">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                Configure Directory Backup Job
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={modalLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4">
              {/* Job Name & Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Backup Job Name
                  </label>
                  <input
                    id="b-name"
                    type="text"
                    required
                    disabled={modalLoading}
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="e.g. Staging Uploads Archive"
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="b-sched" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Backup Schedule Frequency
                  </label>
                  <select
                    id="b-sched"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value as any)}
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="daily">Daily Run (00:00 UTC)</option>
                    <option value="weekly">Weekly Run (Sundays)</option>
                    <option value="monthly">Monthly Run (1st of Month)</option>
                  </select>
                </div>
              </div>

              {/* Server select & S3 storage destination */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b-server" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Target Server
                  </label>
                  <select
                    id="b-server"
                    required
                    value={selectedServerId}
                    onChange={(e) => setSelectedServerId(e.target.value)}
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status === 'connected' ? 'Connected' : 'Offline/Unverified'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="b-dest" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Storage Destination (S3/R2 Vault)
                  </label>
                  <select
                    id="b-dest"
                    required
                    value={selectedDestId}
                    onChange={(e) => setSelectedDestId(e.target.value)}
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {destinations.length === 0 ? (
                      <option value="">No S3 credentials stored in project</option>
                    ) : (
                      destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.type === 'aws_s3' ? 'AWS S3' : 'Cloudflare R2'})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Source Path File Browser Explorer */}
              <div className="border-t border-border pt-4">
                <span className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Select Source Folder on Server
                </span>

                <div className="grid grid-cols-5 gap-4">
                  {/* Explorer Pane */}
                  <div className="col-span-3 border border-border bg-secondary/30 rounded-md p-3 max-h-[220px] overflow-y-auto flex flex-col gap-1 min-h-[150px]">
                    {explorerLoading ? (
                      <div className="flex items-center justify-center py-12 gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Connecting SFTP...</span>
                      </div>
                    ) : explorerError ? (
                      <div className="p-3 text-center text-xs text-destructive flex flex-col items-center gap-1">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <span>{explorerError}</span>
                      </div>
                    ) : treeData.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        Empty directory or server unselected.
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {treeData.map((node) => renderTreeNode(node))}
                      </div>
                    )}
                  </div>

                  {/* Configuration Input details */}
                  <div className="col-span-2 space-y-3">
                    <div>
                      <label htmlFor="b-srcpath" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Selected Path (Source)
                      </label>
                      <input
                        id="b-srcpath"
                        type="text"
                        required
                        readOnly
                        value={sourcePath}
                        placeholder="Click folder to select"
                        className="block w-full rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="b-destpath" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Destination Bucket Path
                      </label>
                      <input
                        id="b-destpath"
                        type="text"
                        required
                        value={destPath}
                        onChange={(e) => setDestPath(e.target.value)}
                        placeholder="backups/files/"
                        className="block w-full rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 mt-6 border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={modalLoading || !jobName || !sourcePath || !selectedDestId}
                  className="flex-1 flex justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50 glow-primary"
                >
                  {modalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4.5 w-4.5" />
                  )}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
