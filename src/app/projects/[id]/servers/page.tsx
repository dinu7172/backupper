'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getServers,
  getCredentials,
  saveCredential,
  saveServer,
  deleteServer,
  testConnectionAction,
} from './actions';
import {
  Plus,
  Server as ServerIcon,
  HardDrive,
  Cpu,
  RefreshCw,
  Trash2,
  Key,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  X,
  Wifi,
  WifiOff,
  CheckCircle,
  Terminal,
} from 'lucide-react';

interface ServerItem {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string | null;
  port: number;
  sshUser: string;
  authMethod: 'key' | 'password';
  credentialId: string;
  fingerprint: string | null;
  status: 'connected' | 'unreachable' | 'auth_failed' | 'pending';
  lastPingAt: string | null;
  lastPingStatus: 'ok' | 'fail' | null;
  osInfo: {
    distro: string | null;
    arch: string | null;
    kernel: string | null;
  };
  diskInfo: {
    totalGB: number | null;
    freeGB: number | null;
    lastCheckedAt: string | null;
  };
}

interface CredentialItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  meta: any;
}

export default function ServersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // Lists
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Connection Testing States (per Server ID)
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    serverId: string;
    success: boolean;
    error?: string;
    fingerprint?: string;
    osInfo?: any;
    diskInfo?: any;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields - Server
  const [serverName, setServerName] = useState('');
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState(22);
  const [sshUser, setSshUser] = useState('root');
  const [authMethod, setAuthMethod] = useState<'key' | 'password'>('key');
  const [selectedCredId, setSelectedCredId] = useState('');

  // Form Fields - New Credential Sub-form
  const [showCredForm, setShowCredForm] = useState(false);
  const [credName, setCredName] = useState('');
  const [credType, setCredType] = useState<'ssh_key' | 'ssh_password'>('ssh_key');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [password, setPassword] = useState('');
  const [credDesc, setCredDesc] = useState('');
  const [credSaving, setCredSaving] = useState(false);

  // Load Servers and Credentials
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [srvRes, credRes] = await Promise.all([
        getServers(projectId),
        getCredentials(projectId, ['ssh_key', 'ssh_password']),
      ]);

      if (srvRes.success && srvRes.servers) {
        setServers(srvRes.servers as ServerItem[]);
      }
      if (credRes.success && credRes.credentials) {
        setCredentials(credRes.credentials as CredentialItem[]);
        // Auto-select first credential if available
        if (credRes.credentials.length > 0 && !selectedCredId) {
          setSelectedCredId(credRes.credentials[0].id);
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

  const handleTestConnection = async (server: ServerItem) => {
    setTestingId(server.id);
    setTestResult(null);
    try {
      const res = await testConnectionAction({
        serverId: server.id,
        hostname: server.hostname,
        port: server.port,
        sshUser: server.sshUser,
        authMethod: server.authMethod,
        credentialId: server.credentialId,
      });

      setTestResult({
        serverId: server.id,
        success: res.success,
        error: res.error,
        fingerprint: res.fingerprint,
        osInfo: res.osInfo,
        diskInfo: res.diskInfo,
      });

      // Reload list to get updated statuses from database update
      loadData(true);
    } catch (err: any) {
      setTestResult({
        serverId: server.id,
        success: false,
        error: err.message || 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateCredential = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!credName) return;

    setCredSaving(true);
    setModalError(null);

    const payload: Record<string, any> = {};
    const meta: Record<string, any> = {};

    if (credType === 'ssh_key') {
      payload.privateKey = privateKey;
      if (passphrase) payload.passphrase = passphrase;
      
      // Basic client side extraction of key type if possible (RSA, ED25519)
      if (privateKey.includes('OPENSSH PRIVATE KEY')) meta.sshKeyType = 'openssh';
      else if (privateKey.includes('RSA PRIVATE KEY')) meta.sshKeyType = 'rsa';
      else meta.sshKeyType = 'key';
    } else {
      payload.password = password;
    }

    try {
      const res = await saveCredential({
        projectId,
        name: credName,
        type: credType,
        description: credDesc || undefined,
        payload,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
      });

      if (res.success && res.credentialId) {
        // Refresh credentials list
        const credRes = await getCredentials(projectId, ['ssh_key', 'ssh_password']);
        if (credRes.success && credRes.credentials) {
          setCredentials(credRes.credentials as CredentialItem[]);
          setSelectedCredId(res.credentialId);
        }
        // Reset credential form
        setCredName('');
        setPrivateKey('');
        setPassphrase('');
        setPassword('');
        setCredDesc('');
        setShowCredForm(false);
      } else {
        setModalError(res.error || 'Failed to save credential');
      }
    } catch (err: any) {
      setModalError(err.message || 'Credential saving failed');
    } finally {
      setCredSaving(false);
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      const res = await saveServer({
        projectId,
        name: serverName,
        hostname,
        port,
        sshUser,
        authMethod,
        credentialId: selectedCredId,
      });

      if (res.success) {
        setIsModalOpen(false);
        // Reset fields
        setServerName('');
        setHostname('');
        setPort(22);
        setSshUser('root');
        setAuthMethod('key');
        // Reload
        loadData(true);
        silentTestResultClear();
      } else {
        setModalError(res.error || 'Failed to register server');
      }
    } catch (err: any) {
      setModalError(err.message || 'Server saving failed');
    } finally {
      setModalLoading(false);
    }
  };

  const silentTestResultClear = () => {
    setTestResult(null);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to remove this target server? This does not delete actual backup artifacts but will remove connection configurations.')) {
      return;
    }

    try {
      const res = await deleteServer(serverId);
      if (res.success) {
        loadData(true);
      } else {
        alert(res.error || 'Failed to delete server');
      }
    } catch (e: any) {
      alert(e.message || 'Server deletion failed');
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-background/50 rounded-lg min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading registered servers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Target Servers</h2>
          <p className="text-xs text-muted-foreground">
            Configure target systems to run backup routines.
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
            Add Server
          </button>
        </div>
      </div>

      {/* Main Grid list */}
      {servers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card/15 flex flex-col items-center justify-center gap-4 max-w-xl mx-auto">
          <div className="p-4 bg-secondary/80 rounded-full border border-border text-muted-foreground">
            <ServerIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1 px-4">
            <h3 className="font-bold text-sm text-foreground">No target servers</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Connect a server using SSH key or password authentication to configure database and application file backups.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
          >
            <Plus className="h-4 w-4" />
            Connect First Server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {servers.map((server) => {
            const isTesting = testingId === server.id;
            const myResult = testResult && testResult.serverId === server.id ? testResult : null;

            // Status styles
            let statusColor = 'bg-muted text-muted-foreground';
            let statusText = 'Pending check';
            if (server.status === 'connected') {
              statusColor = 'bg-success/20 text-success border border-success/30';
              statusText = 'Connected';
            } else if (server.status === 'unreachable') {
              statusColor = 'bg-destructive/10 text-destructive border-destructive/20';
              statusText = 'Unreachable';
            } else if (server.status === 'auth_failed') {
              statusColor = 'bg-warning/20 text-warning border-warning/30';
              statusText = 'Auth Failed';
            }

            // Disk percentage calculate
            const diskUsedGB = server.diskInfo.totalGB && server.diskInfo.freeGB 
              ? parseFloat((server.diskInfo.totalGB - server.diskInfo.freeGB).toFixed(2))
              : 0;
            const diskPercent = server.diskInfo.totalGB 
              ? Math.round((diskUsedGB / server.diskInfo.totalGB) * 100)
              : 0;

            return (
              <div
                key={server.id}
                className="glass-card border border-border rounded-lg flex flex-col justify-between overflow-hidden shadow-sm"
              >
                <div className="p-6 space-y-4">
                  {/* Title & Actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-4.5 w-4.5 text-primary" />
                        <h3 className="font-bold text-base text-foreground">{server.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {server.sshUser}@{server.hostname}:{server.port}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestConnection(server)}
                        disabled={isTesting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-secondary/80 text-[11px] font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                      >
                        {isTesting ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Test Connection
                      </button>
                      <button
                        onClick={() => handleDeleteServer(server.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded border border-transparent hover:border-destructive/20 transition-colors"
                        title="Remove Server"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick stats & spec row */}
                  <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-border/40 text-xs">
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">OS Specification</span>
                      {server.osInfo.distro ? (
                        <div className="space-y-1 font-semibold text-foreground">
                          <div className="flex items-center gap-1">
                            <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[150px]" title={server.osInfo.distro}>{server.osInfo.distro}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono font-normal">
                            {server.osInfo.arch} ({server.osInfo.kernel})
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Pending diagnostic sync</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Root Disk Space</span>
                      {server.diskInfo.totalGB ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 font-semibold text-foreground">
                            <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{server.diskInfo.freeGB} GB free <span className="font-normal text-muted-foreground">/ {server.diskInfo.totalGB} GB</span></span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${diskPercent > 90 ? 'bg-destructive' : diskPercent > 75 ? 'bg-warning' : 'bg-success'}`}
                              style={{ width: `${diskPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Pending diagnostic sync</span>
                      )}
                    </div>
                  </div>

                  {/* Fingerprint section */}
                  {server.fingerprint && (
                    <div className="bg-secondary/50 rounded p-2.5 border border-border/30 text-[10px]">
                      <div className="font-semibold text-muted-foreground uppercase tracking-wide">Pinned Fingerprint</div>
                      <code className="text-foreground block truncate mt-0.5 select-all">{server.fingerprint}</code>
                    </div>
                  )}

                  {/* Ping tracking */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${server.lastPingStatus === 'ok' ? 'bg-success' : server.lastPingStatus === 'fail' ? 'bg-destructive' : 'bg-muted'}`}></span>
                      <span>Last check: {formatDate(server.lastPingAt)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Connection Test Diagnostics overlay */}
                {myResult && (
                  <div className="bg-secondary/80 border-t border-border p-4 text-xs font-mono space-y-2 relative animate-fade-in">
                    <button
                      onClick={silentTestResultClear}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-secondary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {myResult.success ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-success font-bold">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>CONNECTION TEST OK</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                          <p>Resolved IP: {myResult.fingerprint ? 'Matches pinned key' : 'N/A'}</p>
                          <p>Handshake fingerprint: {myResult.fingerprint}</p>
                          <p>OS: {myResult.osInfo?.distro} ({myResult.osInfo?.arch})</p>
                          <p>Disk free: {myResult.diskInfo?.freeGB} GB / {myResult.diskInfo?.totalGB} GB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-destructive font-bold">
                          <WifiOff className="h-3.5 w-3.5" />
                          <span>CONNECTION FAILED</span>
                        </div>
                        <p className="text-[10px] text-destructive leading-relaxed font-sans">{myResult.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl p-6 overflow-hidden my-8">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ServerIcon className="h-5 w-5 text-primary" />
                Register Backup Target
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                disabled={modalLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error message */}
            {modalError && (
              <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveServer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="s-name" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Server Name
                  </label>
                  <input
                    id="s-name"
                    type="text"
                    required
                    disabled={modalLoading || credSaving}
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="e.g. staging-web-01"
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="s-host" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Hostname or IP Address
                  </label>
                  <input
                    id="s-host"
                    type="text"
                    required
                    disabled={modalLoading || credSaving}
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. app.staging.com or IP"
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="s-port" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    SSH Port
                  </label>
                  <input
                    id="s-port"
                    type="number"
                    required
                    disabled={modalLoading || credSaving}
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10))}
                    placeholder="22"
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="s-user" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    SSH Username
                  </label>
                  <input
                    id="s-user"
                    type="text"
                    required
                    disabled={modalLoading || credSaving}
                    value={sshUser}
                    onChange={(e) => setSshUser(e.target.value)}
                    placeholder="root"
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="block text-xs font-semibold text-foreground uppercase tracking-wide">
                    Authentication Credentials
                  </span>
                  {!showCredForm && (
                    <button
                      type="button"
                      onClick={() => setShowCredForm(true)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Create SSH Credential
                    </button>
                  )}
                </div>

                {/* Sub-form to Create Credential Inline */}
                {showCredForm ? (
                  <div className="bg-secondary/40 border border-border p-4 rounded-md space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-primary" />
                        Create New SSH Key/Password
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCredForm(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label htmlFor="c-name" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Credential Identifier Name
                      </label>
                      <input
                        id="c-name"
                        type="text"
                        disabled={credSaving}
                        value={credName}
                        onChange={(e) => setCredName(e.target.value)}
                        placeholder="e.g. Staging Server SSH Key"
                        className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground placeholder-muted-foreground text-xs focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="c-type" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Auth Type
                        </label>
                        <select
                          id="c-type"
                          value={credType}
                          onChange={(e) => setCredType(e.target.value as any)}
                          className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                        >
                          <option value="ssh_key">SSH Private Key</option>
                          <option value="ssh_password">SSH Password</option>
                        </select>
                      </div>

                      {credType === 'ssh_key' ? (
                        <div>
                          <label htmlFor="c-passphrase" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Key Passphrase (optional)
                          </label>
                          <input
                            id="c-passphrase"
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Key passphrase"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground placeholder-muted-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="c-password" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            SSH Password
                          </label>
                          <input
                            id="c-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="SSH password"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground placeholder-muted-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {credType === 'ssh_key' && (
                      <div>
                        <label htmlFor="c-pkey" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Private Key Content
                        </label>
                        <textarea
                          id="c-pkey"
                          rows={4}
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                          className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground placeholder-muted-foreground text-[10px] font-mono focus:border-primary focus:outline-none resize-none"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={credSaving || !credName || (credType === 'ssh_key' && !privateKey) || (credType === 'ssh_password' && !password)}
                      onClick={handleCreateCredential}
                      className="w-full flex items-center justify-center gap-1 rounded bg-secondary hover:bg-secondary/80 border border-border py-1.5 px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                    >
                      {credSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save Credential
                    </button>
                  </div>
                ) : (
                  /* Credential Select Dropdown */
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="s-auth" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                        SSH Auth Method
                      </label>
                      <select
                        id="s-auth"
                        value={authMethod}
                        disabled={modalLoading}
                        onChange={(e) => setAuthMethod(e.target.value as any)}
                        className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                      >
                        <option value="key">SSH Private Key</option>
                        <option value="password">SSH Password</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="s-cred" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                        Select Credential Key
                      </label>
                      <select
                        id="s-cred"
                        value={selectedCredId}
                        disabled={modalLoading || credentials.length === 0}
                        onChange={(e) => setSelectedCredId(e.target.value)}
                        className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                      >
                        {credentials.length === 0 ? (
                          <option value="">No credentials saved yet</option>
                        ) : (
                          credentials
                            .filter((c) => (authMethod === 'key' ? c.type === 'ssh_key' : c.type === 'ssh_password'))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 mt-6 border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={modalLoading || credSaving || !serverName || !hostname || !selectedCredId}
                  className="flex-1 flex justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50 glow-primary"
                >
                  {modalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4.5 w-4.5" />
                  )}
                  Save Target Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
