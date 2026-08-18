import type { Role } from '@pm/shared';
import type { HydratedDocument } from 'mongoose';
import type { IUser } from '../models/User.js';
import type { IList } from '../models/List.js';
import type { ITask } from '../models/Task.js';
import type { IComment } from '../models/Comment.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      user?: HydratedDocument<IUser>;
      userId?: string;
      /** Set by the requireProjectRole / require*Access guards. */
      membership?: { role: Role; projectId: string };
      list?: HydratedDocument<IList>;
      task?: HydratedDocument<ITask>;
      comment?: HydratedDocument<IComment>;
      /**
       * Express 5 exposes req.query through a getter, so validated query data
       * lands here instead of overwriting it.
       */
      validatedQuery?: unknown;
    }
  }
}

export {};
