'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Server,
  Database,
  Lock,
  Cloud,
  Activity,
  Users,
  Terminal,
  Play,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'server' | 'credentials' | 'schedule' | 'monitor'>('server');

  // Terminal simulation state
  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'success'>('idle');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const simulationSteps = [
    { text: 'Connecting to production-api-node (192.168.100.12) via SSH...', type: 'default' },
    { text: 'Connection established. Auth method: private key (prod_key).', type: 'success' },
    { text: 'Host check: Ubuntu 22.04 LTS · 142 GB free of 250 GB.', type: 'info' },
    { text: 'Fetching database credentials from the encrypted vault...', type: 'default' },
    { text: 'Running pg_dump against postgresql://prod_db:5432/main...', type: 'default' },
    { text: 'Dump complete — 2.85 GB written to a temporary volume.', type: 'default' },
    { text: 'Encrypting archive with AES-256-GCM (key: key_rot_9842a).', type: 'info' },
    { text: 'Uploading encrypted archive to Cloudflare R2 (prod-backups)...', type: 'default' },
    { text: 'Upload complete. Verifying integrity (SHA-256)...', type: 'default' },
    { text: 'Integrity check passed. Closing connection.', type: 'success' },
    { text: 'Job daily_production_backup completed successfully.', type: 'success' },
  ];

  const startSimulation = () => {
    if (simStatus === 'running') return;
    setSimStatus('running');
    setTerminalLogs([]);

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < simulationSteps.length) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const step = simulationSteps[currentStep];
        setTerminalLogs((prev) => [...prev, `[${timestamp}] ${step.text}`]);
        currentStep++;
      } else {
        clearInterval(interval);
        setSimStatus('success');
      }
    }, 750);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How are my database and server credentials secured?',
      a: 'Every credential is encrypted client-side with a per-record data encryption key, which is itself wrapped under a master key using AES-256-GCM. Decryption only happens in memory, for the duration of a job run. BackUpper never stores or logs your raw keys or passwords.',
    },
    {
      q: 'Which databases and storage backends are supported?',
      a: 'PostgreSQL, MySQL, MongoDB, and Redis are supported as sources today. For destinations, you can connect any S3-compatible bucket, Cloudflare R2, or a remote server over SFTP.',
    },
    {
      q: 'Can I manage backups across multiple clients or environments?',
      a: 'Yes. Organizations separate billing and membership, and projects underneath them — Development, Staging, Production — keep targets, schedules, and permissions isolated from one another.',
    },
    {
      q: 'What happens before a backup actually runs?',
      a: 'The agent checks the target host first: OS, architecture, and free disk space. If there isn\u2019t enough room to safely write a dump, the job is held and you\u2019re notified instead of risking a failed run.',
    },
  ];

  const tabs = [
    { id: 'server' as const, label: 'Add a server' },
    { id: 'credentials' as const, label: 'Store credentials' },
    { id: 'schedule' as const, label: 'Set a schedule' },
    { id: 'monitor' as const, label: 'Watch it run' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Server className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="text-[16px] font-bold tracking-tight text-slate-900">BackUpper</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-[13.5px] font-medium text-slate-600">
            {[
              { href: '#features', label: 'Capabilities' },
              { href: '#simulator', label: 'Live demo' },
              { href: '#workflow', label: 'How it works' },
              { href: '#security', label: 'Security' },
              { href: '#faq', label: 'FAQ' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md hover:text-slate-900 hover:bg-slate-100/80 transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {status === 'loading' ? (
              <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-lg" />
            ) : session ? (
              <div className="flex items-center gap-4">
                <span className="text-[13px] text-slate-500">
                  Signed in as <span className="text-slate-800 font-semibold">{session.user.name || session.user.email}</span>
                </span>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[13px] font-semibold transition-all shadow-sm hover:shadow-md"
                >
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-[13px] text-slate-400 hover:text-slate-700 font-medium transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13.5px] text-slate-600 hover:text-slate-900 font-semibold px-3 py-2 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-[13px] font-semibold transition-all shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 flex flex-col gap-1">
            {[
              { href: '#features', label: 'Capabilities' },
              { href: '#simulator', label: 'Live demo' },
              { href: '#workflow', label: 'How it works' },
              { href: '#security', label: 'Security' },
              { href: '#faq', label: 'FAQ' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[14px] font-semibold text-slate-700 hover:text-indigo-600 py-2.5"
              >
                {item.label}
              </a>
            ))}
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex flex-col gap-2 pt-1">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex justify-center items-center gap-1.5 px-4 py-3 bg-slate-900 text-white rounded-lg text-[13px] font-semibold"
                  >
                    Go to dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="text-[13px] text-slate-400 py-1.5"
                  >
                    Log out ({session.user.email})
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex justify-center items-center py-3 text-[13.5px] text-slate-700 border border-slate-200 rounded-lg font-semibold"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex justify-center items-center gap-1.5 px-4 py-3 bg-gradient-to-b from-indigo-600 to-indigo-700 text-white rounded-lg text-[13px] font-semibold shadow-md shadow-indigo-600/25"
                  >
                    Get started — it&apos;s free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient backdrop — subtle, not a glowing orb wall */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-50 via-indigo-50/40 to-transparent rounded-full blur-3xl pointer-events-none opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b08_1px,transparent_1px),linear-gradient(to_bottom,#64748b08_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)] pointer-events-none" />

        <div className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-6 max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-[12.5px] font-semibold text-indigo-700 mb-8 shadow-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
                <Sparkles className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </span>
              Multi-tenant backups, generally available
            </div>

            <h1 className="text-[42px] sm:text-[56px] md:text-[66px] font-bold tracking-tight text-slate-900 leading-[1.05] mb-7">
              Backups that run<br />
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                without anyone watching.
              </span>
            </h1>

            <p className="text-[17px] sm:text-[19px] text-slate-500 leading-relaxed mb-10 max-w-xl">
              Connect a server, point it at a database, and schedule the rest. BackUpper encrypts every credential, dumps on a schedule you set, and tells you the moment something goes wrong — not after.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-20">
              {session ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5"
                >
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/35 hover:-translate-y-0.5"
                  >
                    Start free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#simulator"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[15px] font-semibold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    See it run
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Product preview — the signature element */}
          <div className="relative w-full rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(79,70,229,0.18)] overflow-hidden">
            <div className="h-12 px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                </div>
                <span className="text-[11.5px] text-slate-400 font-mono ml-2">app.backupper.io/dashboard</span>
              </div>
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] min-h-[400px] text-left">
              <div className="border-r border-slate-100 bg-slate-50/60 p-4 space-y-5">
                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide px-1">Workspace</p>
                  <div className="flex items-center justify-between px-2.5 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-800 text-[13px] shadow-sm">
                    <span className="font-semibold truncate">Acme Inc.</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-semibold">Owner</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide px-1">Active schedules</p>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-slate-700 hover:bg-white transition-colors">
                      <Database className="h-3.5 w-3.5 text-indigo-500 shrink-0" strokeWidth={1.75} />
                      <span className="truncate font-medium">prod_postgresql</span>
                      <span className="text-[10px] text-emerald-600 font-semibold ml-auto">Daily</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-slate-700 hover:bg-white transition-colors">
                      <Server className="h-3.5 w-3.5 text-indigo-500 shrink-0" strokeWidth={1.75} />
                      <span className="truncate font-medium">core_linux_vm</span>
                      <span className="text-[10px] text-slate-500 font-semibold ml-auto">Weekly</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide px-1">Last run</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11.5px] space-y-1.5 shadow-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status</span>
                      <span className="text-emerald-600 font-semibold">Success</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transferred</span>
                      <span className="text-slate-700 font-mono font-medium">24.5 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-slate-700 font-mono font-medium">12m 42s</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-7 flex flex-col justify-between">
                <div>
                  <h3 className="text-[13.5px] font-bold text-slate-700 mb-4">Resource overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-sm">
                      <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Storage</p>
                      <p className="text-[21px] font-bold text-slate-900 mt-1">2.4 TB</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">R2 bucket bound</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-sm">
                      <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Health</p>
                      <p className="text-[21px] font-bold text-emerald-600 mt-1">100%</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">All nodes responding</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-sm col-span-2 sm:col-span-1">
                      <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Credentials</p>
                      <p className="text-[21px] font-bold text-slate-900 mt-1">16 keys</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">AES-256 encrypted</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12.5px] font-semibold text-slate-600">Disk usage — core_linux_vm</span>
                      <span className="text-[11px] text-slate-400">Checked 4m ago</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: '42%' }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>105 GB of 250 GB used</span>
                      <span>145 GB free</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[12.5px] text-slate-400 text-center sm:text-left">
                    Connected to 4 servers across 2 projects.
                  </p>
                  <Link
                    href="/dashboard"
                    className="text-[12.5px] text-indigo-600 font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
                  >
                    Open dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section id="simulator" className="py-20 md:py-28 border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-[12.5px] font-bold text-indigo-600 uppercase tracking-wide">Live demo</span>
            <h2 className="text-[30px] sm:text-[38px] font-bold text-slate-900 mt-3 mb-3 tracking-tight">
              Watch a backup job run
            </h2>
            <p className="text-slate-500 text-[16px] leading-relaxed">
              This is the exact sequence a real job follows: connect, check disk space, dump the database, encrypt the archive, and upload it — with a verified integrity check at the end.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-12px_rgba(15,23,42,0.1)]">
            <div className="h-12 px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <Terminal className="h-4 w-4 text-indigo-500" strokeWidth={1.75} />
                <span className="text-[12.5px] font-semibold text-slate-600">daily_production_backup</span>
              </div>
              <div>
                {simStatus === 'idle' && (
                  <button
                    onClick={startSimulation}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-[12px] font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    <Play className="h-3 w-3 fill-current" /> Run job
                  </button>
                )}
                {simStatus === 'running' && (
                  <span className="flex items-center gap-1.5 px-3.5 py-1.5 text-indigo-600 text-[12px] font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running…
                  </span>
                )}
                {simStatus === 'success' && (
                  <button
                    onClick={startSimulation}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[12px] font-semibold transition-all shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3" /> Run again
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 font-mono text-[12.5px] sm:text-[13px] text-slate-600 h-80 overflow-y-auto bg-white space-y-2.5">
              {terminalLogs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center font-sans">
                  <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3 ring-1 ring-indigo-100">
                    <Play className="h-4.5 w-4.5 text-indigo-500 fill-current" />
                  </div>
                  <p className="text-[14px] text-slate-600 font-medium">Click &quot;Run job&quot; to start the simulation.</p>
                  <p className="text-[12.5px] text-slate-400 mt-1">Every line mirrors what a real job reports.</p>
                </div>
              )}
              {terminalLogs.map((log, index) => {
                const step = simulationSteps[index];
                const color =
                  step?.type === 'success' ? 'text-emerald-600 font-semibold' :
                    step?.type === 'info' ? 'text-indigo-600' :
                      'text-slate-600';
                return (
                  <div key={index} className={`leading-relaxed ${color}`}>
                    {log}
                  </div>
                );
              })}
              {simStatus === 'running' && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-3.5 bg-indigo-300 inline-block animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <span className="text-[12.5px] font-bold text-indigo-600 uppercase tracking-wide">Capabilities</span>
          <h2 className="text-[30px] sm:text-[38px] font-bold text-slate-900 mt-3 mb-3 tracking-tight">
            Everything an ops team actually needs
          </h2>
          <p className="text-slate-500 text-[16px] leading-relaxed">
            No agents to babysit, no plaintext secrets, no surprises when a disk fills up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Server,
              title: 'Remote server targets',
              desc: 'Register a host with its hostname, port, and an SSH key. BackUpper connects on demand — no background daemon left running on your machine.',
            },
            {
              icon: Lock,
              title: 'Encrypted credential vault',
              desc: 'Database passwords, SSH keys, and storage secrets are encrypted with AES-256-GCM before they ever reach the database.',
            },
            {
              icon: Database,
              title: 'Native database connectors',
              desc: 'Direct support for PostgreSQL, MySQL, MongoDB, and Redis, using each engine\u2019s own dump tooling under the hood.',
            },
            {
              icon: Cloud,
              title: 'Bring your own storage',
              desc: 'Send completed backups to Cloudflare R2, any S3-compatible bucket, or a remote host over SFTP.',
            },
            {
              icon: Activity,
              title: 'Pre-flight disk checks',
              desc: 'Before a job runs, the agent confirms there\u2019s enough free disk space to finish safely — and holds the job if there isn\u2019t.',
            },
            {
              icon: Users,
              title: 'Organizations and projects',
              desc: 'Group servers and schedules by client or environment, and invite teammates with Owner, Admin, or Member roles.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-[15.5px] font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-[13.5px] text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-20 md:py-28 border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-[12.5px] font-bold text-indigo-600 uppercase tracking-wide">How it works</span>
            <h2 className="text-[30px] sm:text-[38px] font-bold text-slate-900 mt-3 mb-3 tracking-tight">
              Set up in four steps
            </h2>
            <p className="text-slate-500 text-[16px] leading-relaxed">
              No agent installation, no manual cron jobs. Most teams are running their first backup in under five minutes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-[13px] font-semibold rounded-lg border transition-all ${activeTab === tab.id
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-600/25'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-7 md:p-10 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-12px_rgba(15,23,42,0.1)]">
            {activeTab === 'server' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-4">
                  <h3 className="text-[20px] font-bold text-slate-900">Point BackUpper at a server</h3>
                  <p className="text-[14.5px] text-slate-500 leading-relaxed">
                    Give it a hostname, a port, and a private key. The connection is tested immediately, so you know it works before you schedule anything against it.
                  </p>
                  <ul className="space-y-2.5 text-[13.5px] text-slate-600 pt-1">
                    {['Hostname or IP address', 'Custom SSH port (defaults to 22)', 'Connection verified on save'].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" strokeWidth={1.75} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-900 p-5 rounded-xl font-mono text-[12px] text-slate-300 space-y-1.5 shadow-lg">
                  <div className="text-slate-500">{'// server'}</div>
                  <div><span className="text-indigo-400">name</span>: &quot;production-api-node&quot;</div>
                  <div><span className="text-indigo-400">hostname</span>: &quot;192.168.100.12&quot;</div>
                  <div><span className="text-indigo-400">port</span>: 22</div>
                  <div><span className="text-indigo-400">authMethod</span>: &quot;key&quot;</div>
                  <div><span className="text-indigo-400">status</span>: <span className="text-emerald-400">&quot;connected&quot;</span></div>
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-4">
                  <h3 className="text-[20px] font-bold text-slate-900">Store credentials, encrypted</h3>
                  <p className="text-[14.5px] text-slate-500 leading-relaxed">
                    SSH keys, database passwords, and storage secrets are each wrapped in their own encryption key before they\u2019re written anywhere.
                  </p>
                  <ul className="space-y-2.5 text-[13.5px] text-slate-600 pt-1">
                    {['SSH, database, and storage secrets', 'Per-record encryption key', 'No plaintext ever written to disk'].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" strokeWidth={1.75} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-900 p-5 rounded-xl font-mono text-[12px] text-slate-300 space-y-1.5 shadow-lg">
                  <div className="text-slate-500">{'// credential'}</div>
                  <div><span className="text-indigo-400">type</span>: &quot;postgresql&quot;</div>
                  <div><span className="text-indigo-400">encryptedPayload</span>: {'{'}</div>
                  <div className="pl-4"><span className="text-indigo-400">ciphertext</span>: &quot;a5d7c8e9…&quot;</div>
                  <div className="pl-4"><span className="text-indigo-400">authTag</span>: &quot;gcm-tag&quot;</div>
                  <div>{'}'}</div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-4">
                  <h3 className="text-[20px] font-bold text-slate-900">Set how often it runs</h3>
                  <p className="text-[14.5px] text-slate-500 leading-relaxed">
                    Pick a source, a destination, and a cadence. The scheduler takes it from there and keeps a record of every run.
                  </p>
                  <ul className="space-y-2.5 text-[13.5px] text-slate-600 pt-1">
                    {['Daily, weekly, or monthly cadence', 'Custom source and destination paths', 'Scoped to a single project'].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" strokeWidth={1.75} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-900 p-5 rounded-xl font-mono text-[12px] text-slate-300 space-y-1.5 shadow-lg">
                  <div className="text-slate-500">{'// schedule'}</div>
                  <div><span className="text-indigo-400">name</span>: &quot;daily_db_postgres_dump&quot;</div>
                  <div><span className="text-indigo-400">sourcePath</span>: &quot;/var/lib/postgresql/data&quot;</div>
                  <div><span className="text-indigo-400">destination</span>: &quot;r2://backups/postgresql/&quot;</div>
                  <div><span className="text-indigo-400">cadence</span>: &quot;daily&quot;</div>
                </div>
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-4">
                  <h3 className="text-[20px] font-bold text-slate-900">See exactly what happened</h3>
                  <p className="text-[14.5px] text-slate-500 leading-relaxed">
                    Every run leaves a trace. When something fails — a timeout, a bad credential, a missing path — you see the real reason, not a generic error.
                  </p>
                  <ul className="space-y-2.5 text-[13.5px] text-slate-600 pt-1">
                    {['Success, failed, or pending state per run', 'Full output for failed jobs', 'Host metrics checked on every run'].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" strokeWidth={1.75} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-900 p-5 rounded-xl font-mono text-[12px] text-slate-300 space-y-1.5 shadow-lg">
                  <div className="text-slate-500">{'// run report'}</div>
                  <div><span className="text-indigo-400">lastRunAt</span>: &quot;2026-06-21T18:00:00Z&quot;</div>
                  <div><span className="text-indigo-400">status</span>: <span className="text-emerald-400">&quot;success&quot;</span></div>
                  <div><span className="text-indigo-400">error</span>: null</div>
                  <div><span className="text-indigo-400">host</span>: &quot;Ubuntu 22.04 · 5.15.0&quot;</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 md:py-28 max-w-6xl mx-auto px-6">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-12px_rgba(15,23,42,0.08)]">
          <div className="lg:col-span-2 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-[12.5px] font-semibold text-indigo-700">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" strokeWidth={1.75} /> Zero-knowledge by design
            </div>
            <h2 className="text-[26px] md:text-[34px] font-bold text-slate-900 tracking-tight">
              We can&apos;t read your credentials. That&apos;s the point.
            </h2>
            <p className="text-[15px] text-slate-500 leading-relaxed">
              Every secret is encrypted in the application layer before it reaches the database, using a per-record key wrapped under a rotating master key. Your raw credentials are decrypted only in memory, only for the length of a job run.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800">AES-256-GCM encryption</h4>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">Authenticated ciphertext with a verified integrity tag.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800">Isolated environments</h4>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">Development keys never share scope with production.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl h-full flex flex-col justify-between min-h-[220px] shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono uppercase tracking-wide">
                <Lock className="h-3.5 w-3.5" strokeWidth={1.75} /> Encryption envelope
              </div>
              <div className="space-y-3.5 text-[12.5px]">
                <div>
                  <span className="font-semibold text-indigo-300">1. Master key</span>
                  <p className="text-slate-400 mt-0.5">Held in memory by the application</p>
                </div>
                <div>
                  <span className="font-semibold text-indigo-300">2. Data encryption key</span>
                  <p className="text-slate-400 mt-0.5">One per record, wrapped under the master key</p>
                </div>
                <div>
                  <span className="font-semibold text-indigo-300">3. Credential ciphertext</span>
                  <p className="text-slate-400 mt-0.5">Decrypted only while a job is running</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <span className="text-[12.5px] font-bold text-indigo-600 uppercase tracking-wide">FAQ</span>
            <h2 className="text-[30px] sm:text-[38px] font-bold text-slate-900 mt-3 tracking-tight">
              Common questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`rounded-xl border transition-all ${activeFaq === index ? 'border-indigo-200 bg-white shadow-md shadow-indigo-500/5' : 'border-slate-200 bg-white shadow-sm'
                  }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between px-5 py-4.5 text-left group"
                >
                  <span className="flex items-center gap-3 text-[14.5px] font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0" strokeWidth={1.75} />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${activeFaq === index ? 'rotate-180 text-indigo-500' : ''}`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-5 pb-5 pl-12 text-[13.5px] text-slate-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 max-w-6xl mx-auto px-6 text-center border-t border-slate-100">
        <h2 className="text-[30px] sm:text-[42px] font-bold text-slate-900 tracking-tight mb-4">
          Set up your first backup today
        </h2>
        <p className="text-slate-500 text-[16px] max-w-xl mx-auto leading-relaxed mb-9">
          Free to start. No credit card, no agent install, no plaintext secrets sitting in a config file somewhere.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5"
            >
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5"
              >
                Create a free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[15px] font-semibold transition-all shadow-sm hover:-translate-y-0.5"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 px-6 text-[12.5px] text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center">
              <Server className="h-3 w-3 text-white" strokeWidth={2.25} />
            </div>
            <span className="font-semibold text-slate-600">BackUpper</span>
            <span className="text-slate-300 mx-1">·</span>
            <span>Backup and disaster recovery</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-700 transition-colors">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} BackUpper Inc.</p>
        </div>
      </footer>
    </div>
  );
}