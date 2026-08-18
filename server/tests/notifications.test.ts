import { describe, expect, it } from 'vitest';
import { addMember, createProject, createTask, getBoard, signUp } from './helpers.js';

/** Adding someone to a project notifies them, so tests clear that setup noise
 *  first and then measure only the trigger they are about. */
const clearInbox = (user: Awaited<ReturnType<typeof signUp>>) =>
  user.agent.post('/api/notifications/read-all').expect(200);

const unreadFor = async (user: Awaited<ReturnType<typeof signUp>>) => {
  const res = await user.agent.get('/api/notifications').expect(200);
  return res.body as {
    unreadCount: number;
    notifications: Array<{ id: string; type: string; actor: { id: string } }>;
  };
};

describe('notifications', () => {
  it('notifies the person assigned, and nobody else', async () => {
    const owner = await signUp('Owner', 'n1@example.com');
    const member = await signUp('Member', 'n2@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    await clearInbox(member);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;

    await createTask(owner, list, { title: 'For you', assignees: [member.id] });

    const theirs = await unreadFor(member);
    expect(theirs.unreadCount).toBe(1);
    expect(theirs.notifications[0]!.type).toBe('task_assigned');

    // The actor is never told about their own action.
    expect((await unreadFor(owner)).unreadCount).toBe(0);
  });

  it('does not notify you for assigning yourself', async () => {
    const owner = await signUp('Owner', 'n3@example.com');
    const project = await createProject(owner);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;

    await createTask(owner, list, { assignees: [owner.id] });
    expect((await unreadFor(owner)).unreadCount).toBe(0);
  });

  it('notifies assignees and the creator when a comment lands', async () => {
    const creator = await signUp('Creator', 'n4@example.com');
    const assignee = await signUp('Assignee', 'n5@example.com');
    const commenter = await signUp('Commenter', 'n6@example.com');
    const project = await createProject(creator);
    await addMember(creator, project.id, assignee.email);
    await addMember(creator, project.id, commenter.email);
    const list = (await getBoard(creator, project.id)).lists[0]!.id;

    const task = await createTask(creator, list, { assignees: [assignee.id] });
    await commenter.agent.post(`/api/tasks/${task.id}/comments`).send({ body: 'hello' }).expect(201);

    // Creator and assignee both have a stake in the card.
    const creatorNotifs = await unreadFor(creator);
    expect(creatorNotifs.notifications.some((n) => n.type === 'task_comment')).toBe(true);

    const assigneeNotifs = await unreadFor(assignee);
    expect(assigneeNotifs.notifications.some((n) => n.type === 'task_comment')).toBe(true);

    // The commenter hears nothing about their own comment.
    const commenterNotifs = await unreadFor(commenter);
    expect(commenterNotifs.notifications.filter((n) => n.actor.id === commenter.id)).toHaveLength(0);
  });

  it('raises exactly one notification when someone is assigned twice over', async () => {
    const owner = await signUp('Owner', 'n7@example.com');
    const member = await signUp('Member', 'n8@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    await clearInbox(member);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;

    const task = await createTask(owner, list, { assignees: [member.id] });
    // Re-sending the same assignee list must not notify again.
    await owner.agent.patch(`/api/tasks/${task.id}`).send({ assignees: [member.id] }).expect(200);

    expect((await unreadFor(member)).unreadCount).toBe(1);
  });

  it('notifies on being added to a project', async () => {
    const owner = await signUp('Owner', 'n9@example.com');
    const member = await signUp('Member', 'n10@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);

    const theirs = await unreadFor(member);
    expect(theirs.notifications[0]!.type).toBe('project_member_added');
  });

  it('scopes read state to the recipient', async () => {
    const owner = await signUp('Owner', 'n11@example.com');
    const member = await signUp('Member', 'n12@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);

    const theirs = await unreadFor(member);
    const id = theirs.notifications[0]!.id;

    // Someone else's notification is simply not found.
    await owner.agent.patch(`/api/notifications/${id}/read`).expect(404);

    const res = await member.agent.patch(`/api/notifications/${id}/read`).expect(200);
    expect(res.body.unreadCount).toBe(0);
  });

  it('marks everything read at once', async () => {
    const owner = await signUp('Owner', 'n13@example.com');
    const member = await signUp('Member', 'n14@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    await createTask(owner, list, { assignees: [member.id] });

    expect((await unreadFor(member)).unreadCount).toBe(2);
    await member.agent.post('/api/notifications/read-all').expect(200);
    expect((await unreadFor(member)).unreadCount).toBe(0);
  });
});
