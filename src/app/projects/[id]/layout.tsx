import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Project from '@/models/Project';
import WorkspaceShell from '@/components/WorkspaceShell';
import { getUserOrganizations } from '@/app/dashboard/members/actions';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.activeOrgId) {
    redirect('/login');
  }

  const { id: projectId } = await params;

  await dbConnect();

  // 1. Fetch organization details
  const activeOrg = await Organization.findById(session.user.activeOrgId);
  if (!activeOrg) {
    redirect('/onboarding');
  }

  // 2. Fetch project details
  const project = await Project.findOne({
    _id: projectId,
    orgId: session.user.activeOrgId,
  });

  if (!project) {
    redirect('/dashboard');
  }

  // 3. Fetch all user organizations memberships
  const orgsRes = await getUserOrganizations();
  const orgs = orgsRes.success && orgsRes.organizations ? orgsRes.organizations : [];

  // 4. Fetch active projects in this organization
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
      {/* Background gradients scoped to project color */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 h-[300px] w-[300px] rounded-full blur-[100px] opacity-10"
          style={{ backgroundColor: project.color }}
        ></div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Project Header block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className="h-6 w-1.5 rounded"
                style={{ backgroundColor: project.color }}
              ></div>
              <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {project.name}
              </h1>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  project.environment === 'production'
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : project.environment === 'staging'
                    ? 'bg-accent/30 text-accent-foreground border-accent/40'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {project.environment}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                {project.description}
              </p>
            )}
          </div>
          
          <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded border border-border self-start sm:self-auto">
            Slug: /{project.slug}
          </div>
        </div>

        {/* Child components */}
        <div className="flex-1 w-full">
          {children}
        </div>
      </div>
    </WorkspaceShell>
  );
}
