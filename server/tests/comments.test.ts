import { describe, expect, it } from 'vitest';
import { addMember, createProject, createTask, getBoard, signUp } from './helpers.js';

describe('comments', () => {
  it('posts a comment and keeps the card count in step', async () => {
    const user = await signUp('Author', 'c1@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;
    const task = await createTask(user, list);

    const res = await user.agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: 'First!' })
      .expect(201);

    expect(res.body.comment.body).toBe('First!');
    expect(res.body.comment.author.email).toBe('c1@example.com');
    expect(res.body.commentCount).toBe(1);

    // The denormalized count is what the board card renders.
    const board = await getBoard(user, project.id);
    expect(board.tasks.find((t) => t.id === task.id)).toMatchObject({ commentCount: 1 });
  });

  it('decrements the count on delete, and never goes negative', async () => {
    const user = await signUp('Author', 'c2@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;
    const task = await createTask(user, list);

    const created = await user.agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: 'temp' })
      .expect(201);

    await user.agent.delete(`/api/comments/${created.body.comment.id}`).expect(204);

    const board = await getBoard(user, project.id);
    expect(board.tasks.find((t) => t.id === task.id)!).toMatchObject({ commentCount: 0 });
  });

  it('lets only the author edit, while an admin may delete', async () => {
    const owner = await signUp('Owner', 'c3@example.com');
    const member = await signUp('Member', 'c4@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list);

    const comment = (
      await member.agent.post(`/api/tasks/${task.id}/comments`).send({ body: 'mine' }).expect(201)
    ).body.comment;

    // The owner is an admin here, and still cannot rewrite someone's words.
    await owner.agent.patch(`/api/comments/${comment.id}`).send({ body: 'edited' }).expect(403);

    const edited = await member.agent
      .patch(`/api/comments/${comment.id}`)
      .send({ body: 'mine, edited' })
      .expect(200);
    expect(edited.body.comment.editedAt).not.toBeNull();

    // But an admin may remove it.
    await owner.agent.delete(`/api/comments/${comment.id}`).expect(204);
  });

  it('keeps non-members out of a task thread', async () => {
    const owner = await signUp('Owner', 'c5@example.com');
    const outsider = await signUp('Outsider', 'c6@example.com');
    const project = await createProject(owner);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list);

    await outsider.agent.get(`/api/tasks/${task.id}/comments`).expect(404);
    await outsider.agent.post(`/api/tasks/${task.id}/comments`).send({ body: 'hi' }).expect(404);
  });

  it('rejects an empty comment', async () => {
    const user = await signUp('Author', 'c7@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;
    const task = await createTask(user, list);

    await user.agent.post(`/api/tasks/${task.id}/comments`).send({ body: '   ' }).expect(400);
  });
});
