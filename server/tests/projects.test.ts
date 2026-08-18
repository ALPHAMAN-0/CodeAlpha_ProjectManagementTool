import { describe, expect, it } from 'vitest';
import { addMember, createProject, getBoard, signUp } from './helpers.js';

describe('projects and membership', () => {
  it('creates a project with the creator as owner and starter columns', async () => {
    const owner = await signUp('Owner', 'owner@example.com');
    const project = await createProject(owner, 'Apollo');

    expect(project.members).toHaveLength(1);
    expect(project.members[0]!.role).toBe('owner');

    const board = await getBoard(owner, project.id);
    expect(board.lists.map((l) => l.title)).toEqual(['To do', 'In progress', 'Done']);
    // Sparse ordering, not 0/1/2.
    expect(board.lists.map((l) => l.position)).toEqual([1000, 2000, 3000]);
  });

  it('hides a project from non-members with 404, not 403', async () => {
    const owner = await signUp('Owner', 'o2@example.com');
    const outsider = await signUp('Outsider', 'out@example.com');
    const project = await createProject(owner);

    // 403 would confirm the project exists to anyone guessing ids.
    await outsider.agent.get(`/api/projects/${project.id}`).expect(404);
    await outsider.agent.patch(`/api/projects/${project.id}`).send({ name: 'x' }).expect(404);
    await outsider.agent.delete(`/api/projects/${project.id}`).expect(404);
  });

  it('lets members read but not administer', async () => {
    const owner = await signUp('Owner', 'o3@example.com');
    const member = await signUp('Member', 'm3@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);

    await member.agent.get(`/api/projects/${project.id}`).expect(200);
    await member.agent.patch(`/api/projects/${project.id}`).send({ name: 'Renamed' }).expect(403);
    await member.agent.delete(`/api/projects/${project.id}`).expect(403);
  });

  it('only the owner can delete the project', async () => {
    const owner = await signUp('Owner', 'o4@example.com');
    const admin = await signUp('Admin', 'a4@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, admin.email, 'admin');

    await admin.agent.delete(`/api/projects/${project.id}`).expect(403);
    await owner.agent.delete(`/api/projects/${project.id}`).expect(204);
  });

  it('refuses to add someone who has no account', async () => {
    const owner = await signUp('Owner', 'o5@example.com');
    const project = await createProject(owner);

    const res = await owner.agent
      .post(`/api/projects/${project.id}/members`)
      .send({ email: 'nobody@example.com' })
      .expect(404);
    expect(res.body.error).toMatch(/sign up/i);
  });

  it('refuses to add the same person twice', async () => {
    const owner = await signUp('Owner', 'o6@example.com');
    const member = await signUp('Member', 'm6@example.com');
    const project = await createProject(owner);

    await addMember(owner, project.id, member.email);
    await owner.agent
      .post(`/api/projects/${project.id}/members`)
      .send({ email: member.email })
      .expect(409);
  });

  it('will not let an admin touch the owner or a fellow admin', async () => {
    const owner = await signUp('Owner', 'o7@example.com');
    const adminA = await signUp('Admin A', 'a7@example.com');
    const adminB = await signUp('Admin B', 'b7@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, adminA.email, 'admin');
    await addMember(owner, project.id, adminB.email, 'admin');

    // The owner is off limits entirely.
    await adminA.agent
      .patch(`/api/projects/${project.id}/members/${owner.id}`)
      .send({ role: 'member' })
      .expect(400);
    await adminA.agent.delete(`/api/projects/${project.id}/members/${owner.id}`).expect(400);

    // Equal rank is not enough to act.
    await adminA.agent.delete(`/api/projects/${project.id}/members/${adminB.id}`).expect(403);
  });

  it('lets a member leave, and the owner cannot', async () => {
    const owner = await signUp('Owner', 'o8@example.com');
    const member = await signUp('Member', 'm8@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);

    await member.agent.delete(`/api/projects/${project.id}/members/${member.id}`).expect(204);
    await member.agent.get(`/api/projects/${project.id}`).expect(404);

    const res = await owner.agent
      .delete(`/api/projects/${project.id}/members/${owner.id}`)
      .expect(400);
    expect(res.body.error).toMatch(/owner cannot leave/i);
  });

  it('stops a member from removing someone else', async () => {
    const owner = await signUp('Owner', 'o9@example.com');
    const m1 = await signUp('M1', 'm9a@example.com');
    const m2 = await signUp('M2', 'm9b@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, m1.email);
    await addMember(owner, project.id, m2.email);

    await m1.agent.delete(`/api/projects/${project.id}/members/${m2.id}`).expect(403);
  });
});
