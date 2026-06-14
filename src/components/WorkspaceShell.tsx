'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Home,
  Users,
  Database,
  Server,
  Layers,
  ChevronDown,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Folder,
  Plus,
  Activity,
  ShieldAlert,
} from 'lucide-react';

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  environment: string;
}

interface WorkspaceShellProps {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  activeOrgId: string | null;
  activeOrgName: string;
  organizations: OrgItem[];
  projects: ProjectItem[];
}

export default function WorkspaceShell({
  children,
  userEmail,
  userName,
  activeOrgId,
  activeOrgName,
  organizations,
  projects,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update } = useSession();
  const isPlatformAdmin = session?.user?.platformRole === 'admin';

  // Mobile navigation drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [projDropdownOpen, setProjDropdownOpen] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null);

  // Extract active project ID from URL if inside a project path
  const projectPathMatch = pathname.match(/\/projects\/([a-f0-9]{24})/);
  const activeProjectId = projectPathMatch ? projectPathMatch[1] : null;
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Switch organizations action
  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setSwitchingOrg(orgId);
    setOrgDropdownOpen(false);
    try {
      // Refresh next-auth session and JWT activeOrgId
      const updateSession = await update({ activeOrgId: orgId });
      if (updateSession) {
        router.push('/dashboard');
        // Force full page reload to reset states
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (e) {
      console.error('Failed to switch workspace:', e);
      setSwitchingOrg(null);
    }
  };

  // Switch active project within the active route scope
  const handleProjectSwitch = (newProjectId: string) => {
    setProjDropdownOpen(false);
    if (!activeProjectId) {
      router.push(`/projects/${newProjectId}`);
      return;
    }

    // Preserve active sub-tab (e.g. /servers or /databases)
    const activeSubTab = pathname.replace(`/projects/${activeProjectId}`, '');
    router.push(`/projects/${newProjectId}${activeSubTab}`);
  };

  // Nav Items
  const orgNavItems = [
    { name: 'Dashboard Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard' },
    { name: 'Team Members', href: '/dashboard/members', icon: Users, active: pathname === '/dashboard/members' },
    { name: 'Backups Log', href: '/dashboard/backups', icon: Database, active: pathname === '/dashboard/backups' },
    { name: 'Telemetry Analytics', href: '/dashboard/analytics', icon: Activity, active: pathname === '/dashboard/analytics' },
    { name: 'Workspace Settings', href: '/dashboard/settings', icon: Settings, active: pathname === '/dashboard/settings' },
  ];

  const projectNavItems = activeProjectId
    ? [
        { name: 'Project Overview', href: `/projects/${activeProjectId}`, icon: Folder, active: pathname === `/projects/${activeProjectId}` },
        { name: 'Target Servers', href: `/projects/${activeProjectId}/servers`, icon: Server, active: pathname.startsWith(`/projects/${activeProjectId}/servers`) },
        { name: 'Databases', href: `/projects/${activeProjectId}/databases`, icon: Database, active: pathname.startsWith(`/projects/${activeProjectId}/databases`) },
        { name: 'Project Settings', href: `/projects/${activeProjectId}/settings`, icon: Settings, active: pathname.startsWith(`/projects/${activeProjectId}/settings`) },
      ]
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/90 backdrop-blur-md text-foreground">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-wider text-primary">BACKUPPER</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary">BDR</span>
        </div>
      </div>

      {/* Organization Switcher Dropdown */}
      <div className="px-4 py-3 border-b border-border/40 relative">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          disabled={switchingOrg !== null}
          className="w-full flex items-center justify-between gap-2 bg-secondary/70 hover:bg-secondary border border-border px-3 py-2 rounded-md text-xs font-semibold transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{switchingOrg ? 'Switching...' : activeOrgName}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {orgDropdownOpen && (
          <div className="absolute left-4 right-4 mt-1 bg-card border border-border rounded-md shadow-2xl z-50 py-1.5 animate-fade-in max-h-[200px] overflow-y-auto">
            <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Select Workspace
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrgSwitch(org.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/60 ${
                  org.id === activeOrgId ? 'text-primary font-bold bg-primary/5' : 'text-foreground'
                }`}
              >
                <span className="truncate">{org.name}</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-bold shrink-0 ml-2">
                  {org.role}
                </span>
              </button>
            ))}
            <div className="border-t border-border/40 mt-1 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setOrgDropdownOpen(false)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Workspace
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {/* Workspace Links */}
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
            General
          </span>
          {orgNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
                  item.active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm glow-primary'
                    : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Platform Admin Link */}
        {isPlatformAdmin && (
          <div className="space-y-1 pt-2 border-t border-border/40">
            <span className="px-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Platform Admin
            </span>
            <Link
              href="/admin"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
                pathname.startsWith('/admin')
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm glow-primary'
                  : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-destructive animate-pulse" />
              <span>Platform Admin</span>
            </Link>
          </div>
        )}

        {/* Project Selector dropdown */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex justify-between items-center px-3">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
              Active Project
            </span>
          </div>

          <div className="px-3 relative">
            <button
              onClick={() => setProjDropdownOpen(!projDropdownOpen)}
              disabled={projects.length === 0}
              className="w-full flex items-center justify-between gap-2 bg-secondary/40 hover:bg-secondary/70 border border-border/60 px-3 py-1.5 rounded text-xs font-medium transition-all"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {activeProject ? (
                  <>
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: activeProject.color }}
                    ></div>
                    <span className="truncate">{activeProject.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground italic truncate">Select project...</span>
                )}
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>

            {projDropdownOpen && (
              <div className="absolute left-3 right-3 mt-1 bg-card border border-border rounded-md shadow-2xl z-50 py-1 animate-fade-in max-h-[200px] overflow-y-auto">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleProjectSwitch(proj.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-secondary/60 ${
                      proj.id === activeProjectId ? 'text-primary font-bold bg-primary/5' : 'text-foreground'
                    }`}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color }}
                    ></div>
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scoped Project Links */}
          {activeProjectId && (
            <div className="space-y-1 pt-1">
              {projectNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
                      item.active
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm glow-primary'
                        : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Profile and Logout footer */}
      <div className="p-4 border-t border-border/40 bg-card/60 flex flex-col gap-2">
        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
            pathname === '/profile'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          <User className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate font-normal">{userEmail}</p>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground relative">
      {/* Desktop Persistent Sidebar (w-64) */}
      <aside className="hidden lg:block w-64 border-r border-border shrink-0 h-screen sticky top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 w-full">
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-wider text-primary">BACKUPPER</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary">BDR</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile Sidebar overlay Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop close */}
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            ></div>

            {/* Sidebar window */}
            <div className="relative w-64 max-w-xs flex-1 flex flex-col h-full bg-card border-r border-border shadow-2xl animate-slide-in">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors z-50"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* View contents */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
