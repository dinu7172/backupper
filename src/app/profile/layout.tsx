import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import { getUserOrganizations } from '@/app/dashboard/members/actions';
import WorkspaceShell from '@/components/WorkspaceShell';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // If no organization, redirect to onboarding
  if (!session.user.activeOrgId) {
    redirect('/onboarding');
  }

  await dbConnect();

  const activeOrg = await Organization.findById(session.user.activeOrgId);
  if (!activeOrg) {
    redirect('/onboarding');
  }

  // Fetch organizations
  const orgsRes = await getUserOrganizations();
  const orgs = orgsRes.success && orgsRes.organizations ? orgsRes.organizations : [];

  // Fetch projects
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
