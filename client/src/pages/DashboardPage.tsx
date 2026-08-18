import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectSummaryDTO } from '@pm/shared';
import { AppShell } from '../components/AppShell';
import { Avatar, Button, EmptyState, FullPageSpinner } from '../components/ui';
import { CreateProjectDialog } from '../features/projects/CreateProjectDialog';
import { useProjects } from '../features/projects/hooks';
import { useMe } from '../features/auth/hooks';

export default function DashboardPage() {
  const { user } = useMe();
  const { data: projects, isPending, error } = useProjects();
  const [creating, setCreating] = useState(false);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {projects?.length
              ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
              : 'Your projects will show up here.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New project</Button>
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="h-64">
            <FullPageSpinner label="Loading projects" />
          </div>
        ) : error ? (
          <EmptyState
            title="We couldn't load your projects"
            description={error.message}
            action={<Button onClick={() => window.location.reload()}>Try again</Button>}
          />
        ) : projects && projects.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} currentUserId={user?.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No projects yet"
            description="Create your first board, then invite the people you work with."
            action={<Button onClick={() => setCreating(true)}>Create a project</Button>}
          />
        )}
      </div>

      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
    </AppShell>
  );
}

function ProjectCard({
  project,
  currentUserId,
}: {
  project: ProjectSummaryDTO;
  currentUserId?: string;
}) {
  const myRole = project.members.find((m) => m.user.id === currentUserId)?.role;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-slate-900 group-hover:text-indigo-700">{project.name}</h2>
        {myRole && myRole !== 'member' && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            {myRole}
          </span>
        )}
      </div>

      <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-slate-500">
        {project.description || 'No description'}
      </p>

      <dl className="mt-4 flex gap-5 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Tasks</dt>
          <dd className="font-medium text-slate-800">{project.taskCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Assigned to me</dt>
          <dd className="font-medium text-slate-800">{project.myTaskCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Columns</dt>
          <dd className="font-medium text-slate-800">{project.listCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <div className="flex -space-x-1.5">
          {project.members.slice(0, 4).map((m) => (
            <Avatar key={m.user.id} name={m.user.name} color={m.user.avatarColor} size="sm" />
          ))}
        </div>
        {project.members.length > 4 && (
          <span className="text-xs text-slate-500">+{project.members.length - 4}</span>
        )}
      </div>
    </Link>
  );
}
