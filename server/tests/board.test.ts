import { describe, expect, it } from 'vitest';
import { MIN_POSITION_GAP } from '@pm/shared';
import { addMember, createProject, createTask, getBoard, signUp } from './helpers.js';

describe('board ordering', () => {
  it('appends new cards with a gap, rather than 0/1/2', async () => {
    const user = await signUp('Test User', 'ord1@example.com');
    const project = await createProject(user);
    const board = await getBoard(user, project.id);
    const list = board.lists[0]!.id;

    const a = await createTask(user, list, { title: 'A' });
    const b = await createTask(user, list, { title: 'B' });

    expect(a.position).toBe(1000);
    expect(b.position).toBe(2000);
  });

  it('drops a card at the midpoint of its neighbours', async () => {
    const user = await signUp('Test User', 'ord2@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;

    const a = await createTask(user, list, { title: 'A' }); // 1000
    const b = await createTask(user, list, { title: 'B' }); // 2000
    const c = await createTask(user, list, { title: 'C' }); // 3000

    const res = await user.agent
      .patch(`/api/tasks/${c.id}/move`)
      .send({ list, prevTaskId: a.id, nextTaskId: b.id })
      .expect(200);

    expect(res.body.task.position).toBe(1500);
  });

  it('halves the position to reach the head of a column', async () => {
    const user = await signUp('Test User', 'ord3@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;

    const a = await createTask(user, list, { title: 'A' }); // 1000
    const b = await createTask(user, list, { title: 'B' });

    const res = await user.agent
      .patch(`/api/tasks/${b.id}/move`)
      .send({ list, prevTaskId: null, nextTaskId: a.id })
      .expect(200);

    expect(res.body.task.position).toBe(500);
  });

  it('ignores a stale neighbour instead of failing the move', async () => {
    const user = await signUp('Test User', 'ord4@example.com');
    const project = await createProject(user);
    const board = await getBoard(user, project.id);
    const [first, second] = [board.lists[0]!.id, board.lists[1]!.id];

    const a = await createTask(user, first, { title: 'A' });
    const elsewhere = await createTask(user, second, { title: 'Elsewhere' });

    // `elsewhere` is not in `first`, as a stale client might believe.
    const res = await user.agent
      .patch(`/api/tasks/${a.id}/move`)
      .send({ list: first, prevTaskId: elsewhere.id, nextTaskId: null })
      .expect(200);

    // Treated as "no previous neighbour" and appended, not rejected.
    expect(typeof res.body.task.position).toBe('number');
  });

  it('renormalizes the column once the gap collapses, preserving order', async () => {
    const user = await signUp('Test User', 'ord5@example.com');
    const project = await createProject(user);
    const list = (await getBoard(user, project.id)).lists[0]!.id;

    const anchor = await createTask(user, list, { title: 'anchor' });
    let x = await createTask(user, list, { title: 'x' });
    let y = await createTask(user, list, { title: 'y' });

    let renormalized: Array<{ id: string; position: number }> | undefined;
    let moves = 0;

    // Alternating the two cards into the slot after the anchor halves the gap
    // each time, which is what exhausts float precision in practice.
    for (let i = 0; i < 60; i += 1) {
      moves += 1;
      const res = await user.agent
        .patch(`/api/tasks/${x.id}/move`)
        .send({ list, prevTaskId: anchor.id, nextTaskId: y.id })
        .expect(200);

      if (res.body.renormalized) {
        renormalized = res.body.renormalized;
        break;
      }
      [x, y] = [y, x];
    }

    expect(renormalized, `no renormalization after ${moves} moves`).toBeDefined();
    // Rewritten to clean multiples...
    expect(renormalized!.map((p) => p.position)).toEqual([1000, 2000, 3000]);

    // ...and every card still has a distinct position.
    const after = await getBoard(user, project.id);
    const positions = after.tasks.filter((t) => t.list === list).map((t) => t.position);
    expect(new Set(positions).size).toBe(positions.length);
    expect(Math.min(...positions)).toBeGreaterThan(MIN_POSITION_GAP);
  });
});

describe('board permissions', () => {
  it('refuses to move a card into another project', async () => {
    const user = await signUp('Test User', 'perm1@example.com');
    const projectA = await createProject(user, 'A');
    const projectB = await createProject(user, 'B');
    const listA = (await getBoard(user, projectA.id)).lists[0]!.id;
    const listB = (await getBoard(user, projectB.id)).lists[0]!.id;

    const task = await createTask(user, listA);
    const res = await user.agent
      .patch(`/api/tasks/${task.id}/move`)
      .send({ list: listB, prevTaskId: null, nextTaskId: null })
      .expect(404);

    expect(res.body.error).toMatch(/not found in this project/i);
  });

  it('only assigns people who are in the project', async () => {
    const owner = await signUp('Owner', 'perm2@example.com');
    const stranger = await signUp('Stranger', 'perm3@example.com');
    const project = await createProject(owner);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;
    const task = await createTask(owner, list);

    const res = await owner.agent
      .patch(`/api/tasks/${task.id}`)
      .send({ assignees: [stranger.id] })
      .expect(400);
    expect(res.body.error).toMatch(/only assign/i);

    // The owner is a member, so assigning them is fine.
    await owner.agent.patch(`/api/tasks/${task.id}`).send({ assignees: [owner.id] }).expect(200);
  });

  it('lets members delete their own cards but not other people\'s', async () => {
    const owner = await signUp('Owner', 'perm4@example.com');
    const member = await signUp('Member', 'perm5@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;

    const ownersCard = await createTask(owner, list, { title: "owner's" });
    const membersCard = await createTask(member, list, { title: "member's" });

    await member.agent.delete(`/api/tasks/${ownersCard.id}`).expect(403);
    await member.agent.delete(`/api/tasks/${membersCard.id}`).expect(204);
    // An admin may remove anyone's card.
    await owner.agent.delete(`/api/tasks/${membersCard.id}`).expect(404);
  });

  it('requires admin to delete a column', async () => {
    const owner = await signUp('Owner', 'perm6@example.com');
    const member = await signUp('Member', 'perm7@example.com');
    const project = await createProject(owner);
    await addMember(owner, project.id, member.email);
    const list = (await getBoard(owner, project.id)).lists[0]!.id;

    await member.agent.delete(`/api/lists/${list}`).expect(403);
    await owner.agent.delete(`/api/lists/${list}`).expect(204);
  });
});
