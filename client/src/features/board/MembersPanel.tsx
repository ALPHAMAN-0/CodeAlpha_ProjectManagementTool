import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ROLE_RANK, type MemberDTO, type ProjectDTO, type Role } from '@pm/shared';
import { api, ApiError } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { Avatar, Button, Field, Input } from '../../components/ui';
import { Modal } from '../../components/Modal';

/** Add, promote, demote and remove people. Visible to everyone; acts by role. */
export function MembersPanel({
  open,
  onOpenChange,
  project,
  myRole,
  myUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDTO;
  myRole: Role;
  myUserId: string;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.board(project.id) });
    void qc.invalidateQueries({ queryKey: queryKeys.projects });
  };

  const addMember = useMutation({
    mutationFn: () => api.post(`/projects/${project.id}/members`, { email, role }),
    onSuccess: () => {
      toast.success(`Invited ${email}`);
      setEmail('');
      refresh();
    },
    onError: (e) => toast.error("Couldn't add that person", { description: e.message }),
  });

  const changeRole = useMutation({
    mutationFn: (vars: { userId: string; role: 'admin' | 'member' }) =>
      api.patch(`/projects/${project.id}/members/${vars.userId}`, { role: vars.role }),
    onSuccess: refresh,
    onError: (e) => toast.error("Couldn't change that role", { description: e.message }),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.del(`/projects/${project.id}/members/${userId}`),
    onSuccess: refresh,
    onError: (e) => toast.error("Couldn't remove that person", { description: e.message }),
  });

  const canManage = ROLE_RANK[myRole] >= ROLE_RANK.admin;
  const fieldError = addMember.error instanceof ApiError ? addMember.error.message : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="People"
      description={`${project.members.length} in ${project.name}`}
    >
      {canManage && (
        <form
          className="mb-5 space-y-3 rounded-lg bg-slate-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) addMember.mutate();
          }}
        >
          <Field label="Add someone by email" error={fieldError} hint="They need an account already.">
            <Input
              type="email"
              value={email}
              placeholder="teammate@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="rounded-md bg-white px-2.5 py-2 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" loading={addMember.isPending} disabled={!email.trim()}>
              Add to project
            </Button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100">
        {project.members.map((member) => (
          <MemberRow
            key={member.user.id}
            member={member}
            myRole={myRole}
            isMe={member.user.id === myUserId}
            onChangeRole={(next) => changeRole.mutate({ userId: member.user.id, role: next })}
            onRemove={() => {
              const label = member.user.id === myUserId ? 'Leave this project?' : `Remove ${member.user.name}?`;
              if (window.confirm(label)) removeMember.mutate(member.user.id);
            }}
          />
        ))}
      </ul>
    </Modal>
  );
}

function MemberRow({
  member,
  myRole,
  isMe,
  onChangeRole,
  onRemove,
}: {
  member: MemberDTO;
  myRole: Role;
  isMe: boolean;
  onChangeRole: (role: 'admin' | 'member') => void;
  onRemove: () => void;
}) {
  const isOwner = member.role === 'owner';
  // Mirrors the server rule: you can only act on someone you outrank.
  const canAct = !isOwner && ROLE_RANK[myRole] > ROLE_RANK[member.role];

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={member.user.name} color={member.user.avatarColor} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {member.user.name}
          {isMe && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}
        </p>
        <p className="truncate text-xs text-slate-500">{member.user.email}</p>
      </div>

      {canAct ? (
        <select
          value={member.role}
          onChange={(e) => onChangeRole(e.target.value as 'admin' | 'member')}
          className="rounded-md bg-white px-2 py-1 text-xs ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
          {member.role}
        </span>
      )}

      {(canAct || isMe) && !isOwner && (
        <Button size="sm" variant="ghost" className="text-red-600" onClick={onRemove}>
          {isMe ? 'Leave' : 'Remove'}
        </Button>
      )}
    </li>
  );
}
