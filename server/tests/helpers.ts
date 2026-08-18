import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';

export const app: Express = createApp();

export interface TestUser {
  agent: request.Agent;
  id: string;
  email: string;
  name: string;
}

/** Registers a user and returns an agent that carries their auth cookie. */
export async function signUp(name: string, email: string): Promise<TestUser> {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name, email, password: 'Passw0rd!' })
    .expect(201);

  return { agent, id: res.body.user.id, email, name };
}

export async function createProject(user: TestUser, name = 'Test project') {
  const res = await user.agent.post('/api/projects').send({ name }).expect(201);
  return res.body.project as {
    id: string;
    name: string;
    members: Array<{ user: { id: string }; role: string }>;
  };
}

export async function getBoard(user: TestUser, projectId: string) {
  const res = await user.agent.get(`/api/projects/${projectId}`).expect(200);
  return res.body as {
    project: { id: string; members: Array<{ user: { id: string }; role: string }> };
    lists: Array<{ id: string; title: string; position: number }>;
    tasks: Array<{ id: string; list: string; title: string; position: number }>;
  };
}

export async function addMember(
  owner: TestUser,
  projectId: string,
  email: string,
  role: 'admin' | 'member' = 'member',
) {
  return owner.agent
    .post(`/api/projects/${projectId}/members`)
    .send({ email, role })
    .expect(201);
}

export async function createTask(
  user: TestUser,
  listId: string,
  body: Record<string, unknown> = {},
) {
  const res = await user.agent
    .post(`/api/lists/${listId}/tasks`)
    .send({ title: 'A task', ...body })
    .expect(201);
  return res.body.task as { id: string; position: number; list: string };
}
