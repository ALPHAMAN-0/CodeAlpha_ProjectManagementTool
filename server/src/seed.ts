/**
 * Fills an empty database with a believable board so the app is never a blank
 * shell for a reviewer or a fresh clone.
 *
 * Destructive: it clears the collections it owns first. Refuses to run against a
 * production database unless --force is passed.
 */
import bcrypt from 'bcryptjs';
import { POSITION_STEP } from '@pm/shared';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './db/connect.js';
import { Comment } from './models/Comment.js';
import { List } from './models/List.js';
import { Notification } from './models/Notification.js';
import { Project } from './models/Project.js';
import { Task } from './models/Task.js';
import { User } from './models/User.js';

const DEMO_PASSWORD = 'Demo1234';

const PEOPLE = [
  { name: 'Demo User', email: 'demo@example.com', avatarColor: '#3b82f6' },
  { name: 'Priya Raman', email: 'priya@example.com', avatarColor: '#ec4899' },
  { name: 'Marcus Webb', email: 'marcus@example.com', avatarColor: '#22c55e' },
  { name: 'Aisha Karim', email: 'aisha@example.com', avatarColor: '#f97316' },
];

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  const force = process.argv.includes('--force');
  if (env.isProd && !force) {
    throw new Error('Refusing to seed a production database. Re-run with --force if you mean it.');
  }

  await connectDb();
  console.log('[seed] clearing existing data');
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    List.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = await User.insertMany(PEOPLE.map((p) => ({ ...p, passwordHash })));
  const [demo, priya, marcus, aisha] = users;
  console.log(`[seed] ${users.length} users`);

  /* ------------------------------------------------------- project one ---- */

  const apollo = await Project.create({
    name: 'Website redesign',
    description: 'Ship the new marketing site before the launch announcement.',
    owner: demo!._id,
    members: [
      { user: demo!._id, role: 'owner', joinedAt: new Date() },
      { user: priya!._id, role: 'admin', joinedAt: new Date() },
      { user: marcus!._id, role: 'member', joinedAt: new Date() },
      { user: aisha!._id, role: 'member', joinedAt: new Date() },
    ],
  });

  const apolloLists = await List.insertMany(
    ['Backlog', 'In progress', 'In review', 'Done'].map((title, i) => ({
      project: apollo._id,
      title,
      position: (i + 1) * POSITION_STEP,
    })),
  );
  const [backlog, inProgress, inReview, done] = apolloLists;

  const apolloTasks = await Task.insertMany([
    {
      project: apollo._id, list: backlog!._id, position: 1000,
      title: 'Audit the current site for dead pages',
      description: 'Crawl everything and list what should not survive the move.',
      assignees: [marcus!._id], priority: 'low', labels: ['docs'],
      createdBy: demo!._id, dueDate: daysFromNow(9),
    },
    {
      project: apollo._id, list: backlog!._id, position: 2000,
      title: 'Write copy for the pricing page',
      description: '', assignees: [aisha!._id], priority: 'medium', labels: ['feature'],
      createdBy: priya!._id, dueDate: daysFromNow(6),
    },
    {
      project: apollo._id, list: backlog!._id, position: 3000,
      title: 'Pick a font pairing',
      description: 'Two options, one for headings and one for body.',
      assignees: [], priority: 'low', labels: ['design'], createdBy: demo!._id, dueDate: null,
    },
    {
      project: apollo._id, list: inProgress!._id, position: 1000,
      title: 'Build the responsive navigation',
      description: 'Collapses to a drawer under 768px. Keyboard accessible.',
      assignees: [demo!._id, marcus!._id], priority: 'high', labels: ['feature'],
      createdBy: priya!._id, dueDate: daysFromNow(2),
    },
    {
      project: apollo._id, list: inProgress!._id, position: 2000,
      title: 'Fix the layout shift on the hero image',
      description: 'Reserve the space so the page stops jumping on load.',
      assignees: [priya!._id], priority: 'high', labels: ['bug', 'urgent'],
      createdBy: marcus!._id, dueDate: daysFromNow(-1), // deliberately overdue
    },
    {
      project: apollo._id, list: inReview!._id, position: 1000,
      title: 'Migrate the blog to the new template',
      description: '', assignees: [aisha!._id], priority: 'medium', labels: ['feature'],
      createdBy: demo!._id, dueDate: daysFromNow(1),
    },
    {
      project: apollo._id, list: inReview!._id, position: 2000,
      title: 'Contrast check every button state',
      description: 'Hover and disabled are the ones that usually fail.',
      assignees: [demo!._id], priority: 'medium', labels: ['design', 'docs'],
      createdBy: aisha!._id, dueDate: daysFromNow(0), // due today
    },
    {
      project: apollo._id, list: done!._id, position: 1000,
      title: 'Agree the sitemap',
      description: '', assignees: [priya!._id, demo!._id], priority: 'low', labels: [],
      createdBy: demo!._id, dueDate: daysFromNow(-6),
    },
    {
      project: apollo._id, list: done!._id, position: 2000,
      title: 'Set up staging deploys',
      description: 'Every push to main lands on staging.',
      assignees: [marcus!._id], priority: 'low', labels: ['docs'],
      createdBy: marcus!._id, dueDate: daysFromNow(-3),
    },
  ]);

  /* ------------------------------------------------------- project two ---- */

  const mobile = await Project.create({
    name: 'Mobile app v2',
    description: 'Offline support and a rebuilt onboarding flow.',
    owner: priya!._id,
    members: [
      { user: priya!._id, role: 'owner', joinedAt: new Date() },
      { user: demo!._id, role: 'admin', joinedAt: new Date() },
      { user: aisha!._id, role: 'member', joinedAt: new Date() },
    ],
  });

  const mobileLists = await List.insertMany(
    ['To do', 'In progress', 'Done'].map((title, i) => ({
      project: mobile._id,
      title,
      position: (i + 1) * POSITION_STEP,
    })),
  );

  const mobileTasks = await Task.insertMany([
    {
      project: mobile._id, list: mobileLists[0]!._id, position: 1000,
      title: 'Cache the feed for offline reading',
      description: 'Stale-while-revalidate, with a visible "last updated" line.',
      assignees: [demo!._id], priority: 'high', labels: ['feature'],
      createdBy: priya!._id, dueDate: daysFromNow(4),
    },
    {
      project: mobile._id, list: mobileLists[0]!._id, position: 2000,
      title: 'Reduce cold start time',
      description: '', assignees: [], priority: 'medium', labels: ['bug'],
      createdBy: priya!._id, dueDate: null,
    },
    {
      project: mobile._id, list: mobileLists[1]!._id, position: 1000,
      title: 'Rebuild the sign-up screens',
      description: 'Three steps instead of one long form.',
      assignees: [aisha!._id, demo!._id], priority: 'high', labels: ['design', 'feature'],
      createdBy: aisha!._id, dueDate: daysFromNow(3),
    },
    {
      project: mobile._id, list: mobileLists[2]!._id, position: 1000,
      title: 'Upgrade the crash reporter',
      description: '', assignees: [priya!._id], priority: 'low', labels: [],
      createdBy: demo!._id, dueDate: daysFromNow(-2),
    },
  ]);

  console.log(`[seed] 2 projects, ${apolloLists.length + mobileLists.length} columns, ${apolloTasks.length + mobileTasks.length} cards`);

  /* ---------------------------------------------------------- comments ---- */

  const nav = apolloTasks[3]!;
  const hero = apolloTasks[4]!;
  const onboarding = mobileTasks[2]!;

  const conversation = [
    { task: nav, author: priya!, body: 'Drawer or full-screen overlay on mobile? The overlay tested better last time.' },
    { task: nav, author: demo!, body: 'Drawer for now - it keeps the header visible, which reviewers kept asking for.' },
    { task: nav, author: marcus!, body: 'Works for me. I will wire the focus trap so tabbing cannot escape it while open.' },
    { task: hero, author: marcus!, body: 'It is shifting by about 40px on a slow connection. Width and height are missing on the img.' },
    { task: hero, author: priya!, body: 'Picking this up now. Setting explicit dimensions and an aspect-ratio box.' },
    { task: onboarding, author: aisha!, body: 'First pass is in Figma. Step two needs a way back without losing what was typed.' },
  ];

  for (const entry of conversation) {
    await Comment.create({
      task: entry.task._id,
      project: entry.task.project,
      author: entry.author._id,
      body: entry.body,
    });
  }

  // Keep the denormalized counts honest.
  for (const task of [nav, hero, onboarding]) {
    const count = await Comment.countDocuments({ task: task._id });
    await Task.updateOne({ _id: task._id }, { $set: { commentCount: count } });
  }
  console.log(`[seed] ${conversation.length} comments`);

  /* ----------------------------------------------------- notifications ---- */

  await Notification.insertMany([
    {
      recipient: demo!._id, actor: priya!._id, type: 'task_comment',
      project: apollo._id, task: nav._id, read: false,
    },
    {
      recipient: demo!._id, actor: priya!._id, type: 'task_assigned',
      project: mobile._id, task: mobileTasks[0]!._id, read: false,
    },
    {
      recipient: demo!._id, actor: aisha!._id, type: 'task_comment',
      project: mobile._id, task: onboarding._id, read: false,
    },
    {
      recipient: demo!._id, actor: priya!._id, type: 'project_member_added',
      project: mobile._id, task: null, read: true,
    },
  ]);
  console.log('[seed] 4 notifications (3 unread) for the demo account');

  console.log('\n  Sign in with:');
  console.log(`    email     ${PEOPLE[0]!.email}`);
  console.log(`    password  ${DEMO_PASSWORD}`);
  console.log(`\n  Everyone else uses the same password: ${PEOPLE.slice(1).map((p) => p.email).join(', ')}\n`);

  await disconnectDb();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
