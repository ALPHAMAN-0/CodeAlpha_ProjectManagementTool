import { describe, expect, it } from 'vitest';
import { Comment } from '../src/models/Comment.js';
import { List } from '../src/models/List.js';
import { Notification } from '../src/models/Notification.js';
import { Task } from '../src/models/Task.js';
import { addMember, createProject, createTask, getBoard, signUp } from './helpers.js';

/**
 * MongoDB has no foreign keys, so deleting a parent has to clean up its children
 * explicitly. These check that nothing is orphaned.
 */
describe('cascade deletes', () => {
  it('deleting a project removes its lists, tasks, comments and notifications', async () => {
    const owner = await signUp('Owner', 'cas1@example.com');
    const member = await signUp('Member', 'cas2@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);

    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list, { assignees: [member.id] });
    await owner.agent.post(`/api/tasks/${task.id}/comments`).send({ body: 'note' }).expect(201);

    expect(await Task.countDocuments({ project: project.id })).toBe(1);
    expect(await Comment.countDocuments({ project: project.id })).toBe(1);
    expect(await Notification.countDocuments({ project: project.id })).toBeGreaterThan(0);

    await owner.agent.delete(`/api/projects/${project.id}`).expect(204);

    expect(await List.countDocuments({ project: project.id })).toBe(0);
    expect(await Task.countDocuments({ project: project.id })).toBe(0);
    expect(await Comment.countDocuments({ project: project.id })).toBe(0);
    expect(await Notification.countDocuments({ project: project.id })).toBe(0);
  });

  it('deleting a column removes its cards and their comments', async () => {
    const owner = await signUp('Owner', 'cas3@example.com');
    const project = await createProject(owner);
    const board = await getBoard(owner, project.id);
    const [doomed, keep] = [board.lists[0]!.id, board.lists[1]!.id];

    const a = await createTask(owner, doomed, { title: 'a' });
    await createTask(owner, doomed, { title: 'b' });
    const survivor = await createTask(owner, keep, { title: 'survivor' });
    await owner.agent.post(`/api/tasks/${a.id}/comments`).send({ body: 'doomed' }).expect(201);

    await owner.agent.delete(`/api/lists/${doomed}`).expect(204);

    expect(await Task.countDocuments({ list: doomed })).toBe(0);
    expect(await Comment.countDocuments({ task: a.id })).toBe(0);
    // The neighbouring column is untouched.
    expect(await Task.countDocuments({ _id: survivor.id })).toBe(1);
  });

  it('deleting a card removes its comments', async () => {
    const owner = await signUp('Owner', 'cas4@example.com');
    const project = await createProject(owner);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list);
    await owner.agent.post(`/api/tasks/${task.id}/comments`).send({ body: 'x' }).expect(201);

    await owner.agent.delete(`/api/tasks/${task.id}`).expect(204);
    expect(await Comment.countDocuments({ task: task.id })).toBe(0);
  });

  it('unassigns someone from a project\'s cards when they are removed', async () => {
    const owner = await signUp('Owner', 'cas5@example.com');
    const member = await signUp('Member', 'cas6@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list, { assignees: [member.id, owner.id] });

    await owner.agent.delete(`/api/projects/${project.id}/members/${member.id}`).expect(204);

    // Otherwise the card would keep showing someone who can no longer open it.
    const after = await Task.findById(task.id);
    expect(after!.assignees.map(String)).toEqual([owner.id]);
  });
});
