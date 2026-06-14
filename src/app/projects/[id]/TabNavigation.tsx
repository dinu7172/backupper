'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Database, Calendar, Settings } from 'lucide-react';

interface TabNavigationProps {
  projectId: string;
}

export default function TabNavigation({ projectId }: TabNavigationProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Overview',
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      active: pathname === `/projects/${projectId}`,
    },
    {
      name: 'Servers (Targets)',
      href: `/projects/${projectId}/servers`,
      icon: Server,
      active: pathname.startsWith(`/projects/${projectId}/servers`),
    },
    {
      name: 'Databases',
      href: `/projects/${projectId}/databases`,
      icon: Database,
      active: pathname.startsWith(`/projects/${projectId}/databases`),
    },
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold border transition-all shrink-0 ${
              tab.active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm glow-primary'
                : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
