import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, signUp } from './helpers.js';

describe('auth', () => {
  it('registers, keeps the session in a cookie, and returns the user from /me', async () => {
    const user = await signUp('Ada Lovelace', 'ada@example.com');

    const me = await user.agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('ada@example.com');
    expect(me.body.user.name).toBe('Ada Lovelace');
  });

  it('never returns the password hash', async () => {
    const user = await signUp('Ada', 'hash@example.com');
    const me = await user.agent.get('/api/auth/me').expect(200);

    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    expect(me.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email regardless of casing or padding', async () => {
    await signUp('First', 'dupe@example.com');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email: '  DUPE@Example.com ', password: 'Passw0rd!' })
      .expect(409);

    expect(res.body.error).toMatch(/already exists/i);
  });

  it('rejects a password with no number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@example.com', password: 'passwordy' })
      .expect(400);

    expect(res.body.details.map((d: { path: string }) => d.path)).toContain('password');
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    await signUp('Real', 'real@example.com');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'real@example.com', password: 'Wrong123!' })
      .expect(401);

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'Wrong123!' })
      .expect(401);

    // Identical messages, so the endpoint cannot be used to enumerate accounts.
    expect(wrongPassword.body.error).toBe(unknownUser.body.error);
  });

  it('rejects requests with no session', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/projects').expect(401);
  });

  it('clears the session on logout', async () => {
    const user = await signUp('Bye', 'bye@example.com');
    await user.agent.post('/api/auth/logout').expect(204);
    await user.agent.get('/api/auth/me').expect(401);
  });
});
