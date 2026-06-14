import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import { getUserOrganizations } from '@/app/dashboard/members/actions';
import WorkspaceShell from '@/components/WorkspaceShell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Force onboarding if user doesn't have an active workspace
  if (!session.user.activeOrgId) {
    redirect('/onboarding');
  }

  await dbConnect();

  // 1. Fetch organization details
  const activeOrg = await Organization.findById(session.user.activeOrgId);
  if (!activeOrg) {
    // Session org not found (e.g. deleted), redirect to onboarding
    redirect('/onboarding');
  }

  // 2. Fetch all user organizations memberships
  const orgsRes = await getUserOrganizations();
  const orgs = orgsRes.success && orgsRes.organizations ? orgsRes.organizations : [];

  // 3. Fetch active projects in this organization
  const projects = await Project.find({ orgId: session.user.activeOrgId }).sort({ name: 1 });
  const projectList = projects.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    color: p.color,
    environment: p.environment,
  }));

  return (
    <WorkspaceShell
      userEmail={session.user.email!}
      userName={session.user.name || 'User'}
      activeOrgId={session.user.activeOrgId}
      activeOrgName={activeOrg.name}
      organizations={orgs}
      projects={projectList}
    >
      {children}
    </WorkspaceShell>
  );
}
