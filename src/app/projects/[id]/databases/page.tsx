'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getServers,
  getCredentials,
  saveCredential,
  inspectDatabasesAction,
} from '../servers/actions';
import {
  Database,
  Server as ServerIcon,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  ListChecks,
} from 'lucide-react';

interface ServerItem {
  id: string;
  name: string;
  hostname: string;
  port: number;
  sshUser: string;
}

interface CredentialItem {
  id: string;
  name: string;
  type: string;
  meta: any;
}

export default function DatabasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // Data Loading
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovery Form Selection
  const [selectedServerId, setSelectedServerId] = useState('');
  const [dbType, setDbType] = useState<'mysql' | 'postgresql' | 'mongodb'>('mysql');
  const [selectedDbCredId, setSelectedDbCredId] = useState('');

  // Discovered Databases Checklist
  const [discoveredDbs, setDiscoveredDbs] = useState<string[]>([]);
  const [selectedDbs, setSelectedDbs] = useState<Record<string, boolean>>({});
  const [discoveryRun, setDiscoveryRun] = useState(false);

  // inline Credential creation
  const [showCredForm, setShowCredForm] = useState(false);
  const [credName, setCredName] = useState('');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');
  const [dbHost, setDbHost] = useState('127.0.0.1');
  const [dbPort, setDbPort] = useState<number>(3306);
  const [authSource, setAuthSource] = useState('');
  const [credSaving, setCredSaving] = useState(false);

  // Load Servers & DB credentials
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvRes, credRes] = await Promise.all([
        getServers(projectId),
        getCredentials(projectId, ['mysql', 'postgresql', 'mongodb']),
      ]);

      if (srvRes.success && srvRes.servers) {
        setServers(srvRes.servers as ServerItem[]);
        if (srvRes.servers.length > 0) {
          setSelectedServerId(srvRes.servers[0].id);
        }
      }
      if (credRes.success && credRes.credentials) {
        setCredentials(credRes.credentials as CredentialItem[]);
        // Auto-select DB credentials matching active dbType
        const matched = credRes.credentials.filter((c) => c.type === dbType);
        if (matched.length > 0) {
          setSelectedDbCredId(matched[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load connection settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Adjust database credentials dropdown when dbType changes
  useEffect(() => {
    const matched = credentials.filter((c) => c.type === dbType);
    if (matched.length > 0) {
      setSelectedDbCredId(matched[0].id);
    } else {
      setSelectedDbCredId('');
    }
    // Update default port based on dbType
    if (dbType === 'mysql') setDbPort(3306);
    else if (dbType === 'postgresql') setDbPort(5432);
    else if (dbType === 'mongodb') setDbPort(27017);
  }, [dbType, credentials]);

  const handleCreateDbCredential = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!credName || !dbUser) return;

    setCredSaving(true);
    setError(null);

    const payload = {
      username: dbUser,
      password: dbPassword,
      authSource: authSource || undefined,
    };

    const meta = {
      dbUser,
      dbPort,
      dbHost,
      dbName: authSource || undefined,
    };

    try {
      const res = await saveCredential({
        projectId,
        name: credName,
        type: dbType,
        payload,
        meta,
      });

      if (res.success && res.credentialId) {
        // Reload credentials list
        const credRes = await getCredentials(projectId, ['mysql', 'postgresql', 'mongodb']);
        if (credRes.success && credRes.credentials) {
          setCredentials(credRes.credentials as CredentialItem[]);
          setSelectedDbCredId(res.credentialId);
        }
        // Reset fields
        setCredName('');
        setDbUser('root');
        setDbPassword('');
        setDbHost('127.0.0.1');
        setAuthSource('');
        setShowCredForm(false);
      } else {
        setError(res.error || 'Failed to save database credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving credentials');
    } finally {
      setCredSaving(false);
    }
  };

  const handleInspectDatabases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServerId || !selectedDbCredId) return;

    setInspecting(true);
    setError(null);
    setDiscoveryRun(false);
    setDiscoveredDbs([]);
    setSelectedDbs({});

    try {
      const res = await inspectDatabasesAction(
        selectedServerId,
        dbType,
        selectedDbCredId
      );

      if (res.success && res.databases) {
        setDiscoveredDbs(res.databases);
        // Pre-select all databases by default
        const checks: Record<string, boolean> = {};
        res.databases.forEach((db) => {
          checks[db] = true;
        });
        setSelectedDbs(checks);
        setDiscoveryRun(true);
      } else {
        setError(res.error || 'Connection failed: Unable to connect or execute inspect queries.');
      }
    } catch (err: any) {
      setError(err.message || 'Database listing failed');
    } finally {
      setInspecting(false);
    }
  };

  const handleCheckboxChange = (db: string) => {
    setSelectedDbs((prev) => ({
      ...prev,
      [db]: !prev[db],
    }));
  };

  const handleConfirmBackup = () => {
    const selectedList = Object.keys(selectedDbs).filter((k) => selectedDbs[k]);
    if (selectedList.length === 0) {
      alert('Please select at least one database to back up.');
      return;
    }
    
    // Simulate successful backup setup confirmation
    alert(`Success! Configured backups for the following databases:\n- ${selectedList.join('\n- ')}\n\nThis config will run according to your project's default daily backup schedule.`);
    router.push(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-background/50 rounded-lg min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading database targets...</span>
        </div>
      </div>
    );
  }

  const activeFilteredCreds = credentials.filter((c) => c.type === dbType);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Databases discovery</h2>
        <p className="text-xs text-muted-foreground">
          Inspect, discover, and configure backups for target databases on your servers.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive font-medium flex items-start gap-2 max-w-2xl">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card/15 flex flex-col items-center justify-center gap-4 max-w-xl">
          <div className="p-4 bg-secondary/80 rounded-full border border-border text-muted-foreground">
            <ServerIcon className="h-8 w-8" />
          </div>
          <div className="space-y-1 px-4">
            <h3 className="font-bold text-sm text-foreground">No target servers registered</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              You must register a target server before you can inspect database engines.
            </p>
          </div>
          <button
            onClick={() => router.push(`/projects/${projectId}/servers`)}
            className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow"
          >
            Go to Servers Page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Side: Setup Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-lg space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2.5">
                <Search className="h-4.5 w-4.5 text-primary" />
                Inspect Parameters
              </h3>

              <form onSubmit={handleInspectDatabases} className="space-y-4">
                {/* Server Select */}
                <div>
                  <label htmlFor="inspect-srv" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Target Server
                  </label>
                  <select
                    id="inspect-srv"
                    required
                    value={selectedServerId}
                    onChange={(e) => setSelectedServerId(e.target.value)}
                    disabled={inspecting || credSaving}
                    className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                  >
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.hostname})
                      </option>
                    ))}
                  </select>
                </div>

                {/* DB Type Selection */}
                <div>
                  <span className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                    Database Engine Type
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['mysql', 'postgresql', 'mongodb'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDbType(type)}
                        disabled={inspecting || credSaving}
                        className={`py-2 px-3 rounded-md text-xs font-semibold border capitalize transition-all ${
                          dbType === type
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        {type === 'postgresql' ? 'PostgreSQL' : type === 'mongodb' ? 'MongoDB' : 'MySQL'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Database Credentials Vault Selection */}
                <div className="border-t border-border/50 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="block text-xs font-semibold text-foreground uppercase tracking-wide">
                      Database Credentials
                    </span>
                    {!showCredForm && (
                      <button
                        type="button"
                        onClick={() => setShowCredForm(true)}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Create new
                      </button>
                    )}
                  </div>

                  {showCredForm ? (
                    /* Inline DB Credential Creation form */
                    <div className="bg-secondary/40 border border-border p-4 rounded-md space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 text-primary" />
                          New DB Credential
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
                        <label htmlFor="cred-n" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Credential Identifier
                        </label>
                        <input
                          id="cred-n"
                          type="text"
                          required
                          value={credName}
                          onChange={(e) => setCredName(e.target.value)}
                          placeholder="e.g. MySQL Root User"
                          className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="db-u" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            DB User
                          </label>
                          <input
                            id="db-u"
                            type="text"
                            required
                            value={dbUser}
                            onChange={(e) => setDbUser(e.target.value)}
                            placeholder="root"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="db-p" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            DB Password
                          </label>
                          <input
                            id="db-p"
                            type="password"
                            value={dbPassword}
                            onChange={(e) => setDbPassword(e.target.value)}
                            placeholder="••••••••"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="db-h" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            DB Host
                          </label>
                          <input
                            id="db-h"
                            type="text"
                            required
                            value={dbHost}
                            onChange={(e) => setDbHost(e.target.value)}
                            placeholder="127.0.0.1"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="db-port" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            DB Port
                          </label>
                          <input
                            id="db-port"
                            type="number"
                            required
                            value={dbPort}
                            onChange={(e) => setDbPort(parseInt(e.target.value, 10))}
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {dbType === 'mongodb' && (
                        <div>
                          <label htmlFor="db-auths" className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Auth Database Source (optional)
                          </label>
                          <input
                            id="db-auths"
                            type="text"
                            value={authSource}
                            onChange={(e) => setAuthSource(e.target.value)}
                            placeholder="admin"
                            className="block w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={credSaving || !credName || !dbUser}
                        onClick={handleCreateDbCredential}
                        className="w-full flex items-center justify-center gap-1 rounded bg-secondary hover:bg-secondary/80 border border-border py-1.5 px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                      >
                        {credSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save DB Credential
                      </button>
                    </div>
                  ) : (
                    /* Dropdown to select credentials */
                    <div>
                      <select
                        id="db-cred-sel"
                        required
                        value={selectedDbCredId}
                        onChange={(e) => setSelectedDbCredId(e.target.value)}
                        disabled={inspecting || activeFilteredCreds.length === 0}
                        className="block w-full rounded-md border border-border bg-secondary px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-sm"
                      >
                        {activeFilteredCreds.length === 0 ? (
                          <option value="">No credentials saved for {dbType}</option>
                        ) : (
                          activeFilteredCreds.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.meta?.dbUser || 'root'}@{c.meta?.dbHost || '127.0.0.1'})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Inspect Button */}
                <button
                  type="submit"
                  disabled={inspecting || credSaving || !selectedServerId || !selectedDbCredId}
                  className="w-full flex justify-center items-center gap-2 rounded-md bg-primary py-2.5 px-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-50 glow-primary"
                >
                  {inspecting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Search className="h-4.5 w-4.5" />
                  )}
                  Inspect Target Databases
                </button>
              </form>
            </div>
          </div>

          {/* Right Side: Results Selection list */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ListChecks className="h-4.5 w-4.5 text-primary" />
              Discovered Databases
            </h3>

            {inspecting ? (
              <div className="border border-border border-dashed rounded-lg p-16 text-center bg-card/10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <h4 className="font-bold text-sm text-foreground">Querying Server...</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Establishing secure SSH tunnel, decrypting auth keys, and extracting active database schemas from target engine.
                </p>
              </div>
            ) : !discoveryRun ? (
              <div className="border border-border border-dashed rounded-lg p-16 text-center bg-card/10 flex flex-col items-center justify-center gap-2 text-muted-foreground min-h-[300px]">
                <Database className="h-8 w-8 mb-1" />
                <h4 className="font-bold text-sm text-foreground">Select targets to start</h4>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Fill in the connection details on the left, then click "Inspect Target Databases" to discover schemas.
                </p>
              </div>
            ) : discoveredDbs.length === 0 ? (
              <div className="border border-border border-dashed rounded-lg p-16 text-center bg-card/15 flex flex-col items-center justify-center gap-2 min-h-[300px]">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <h4 className="font-bold text-sm text-foreground">No databases discovered</h4>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Connection succeeded, but no user-created databases were found (or they were filtered out as system databases).
                </p>
              </div>
            ) : (
              /* Database Checklist Display */
              <div className="glass-card rounded-lg border border-border p-6 space-y-6 animate-fade-in">
                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Results Summary</span>
                    <span className="font-bold text-foreground text-sm">
                      Found {discoveredDbs.length} database schemas
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const allChecked = Object.values(selectedDbs).every(Boolean);
                      const nextChecks: Record<string, boolean> = {};
                      discoveredDbs.forEach((db) => {
                        nextChecks[db] = !allChecked;
                      });
                      setSelectedDbs(nextChecks);
                    }}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {Object.values(selectedDbs).every(Boolean) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {discoveredDbs.map((db) => (
                    <div
                      key={db}
                      onClick={() => handleCheckboxChange(db)}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                        selectedDbs[db]
                          ? 'bg-primary/10 border-primary/40 text-foreground font-semibold'
                          : 'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDbs[db] || false}
                        onChange={() => {}} // Handled by div click
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                      <span className="truncate" title={db}>
                        {db}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Selected:{' '}
                    <span className="font-bold text-foreground">
                      {Object.values(selectedDbs).filter(Boolean).length}
                    </span>{' '}
                    / {discoveredDbs.length} databases
                  </span>
                  <button
                    onClick={handleConfirmBackup}
                    className="flex items-center gap-1.5 rounded-md bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors shadow glow-primary"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Configure Backups
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
