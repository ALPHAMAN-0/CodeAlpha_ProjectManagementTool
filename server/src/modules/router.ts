import { Router } from 'express';
import { authRouter } from './auth/auth.routes.js';
import { commentsRouter, taskCommentsRouter } from './comments/comments.routes.js';
import { listsRouter, projectListsRouter } from './lists/lists.routes.js';
import { notificationsRouter } from './notifications/notifications.routes.js';
import { projectsRouter } from './projects/projects.routes.js';
import { listTasksRouter, tasksRouter } from './tasks/tasks.routes.js';
import { usersRouter } from './users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);

// Creation routes are nested under their parent; everything else addresses the
// resource directly, so a client never needs to know a task's ancestry to edit it.
apiRouter.use('/projects/:projectId/lists', projectListsRouter);
apiRouter.use('/lists/:listId/tasks', listTasksRouter);
apiRouter.use('/tasks/:taskId/comments', taskCommentsRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/lists', listsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/notifications', notificationsRouter);
