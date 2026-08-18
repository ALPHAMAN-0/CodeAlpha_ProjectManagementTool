import { Router } from 'express';
import { ROLE_RANK, createCommentSchema, updateCommentSchema } from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { requireCommentAccess, requireTaskAccess } from '../../middleware/projectAccess.js';
import { validateBody } from '../../middleware/validate.js';
import { forbidden } from '../../middleware/error.js';
import { Comment } from '../../models/Comment.js';
import { Task } from '../../models/Task.js';
import { emitToProject, originSocketId } from '../../realtime/emit.js';
import { notifyTaskComment } from '../../services/notify.js';
import { populated, toCommentDTO, type CommentShape } from '../../utils/serialize.js';
import { param } from '../../utils/params.js';

const authorFields = 'name email avatarColor createdAt';

/** Mounted at /api/tasks/:taskId/comments. */
export const taskCommentsRouter = Router({ mergeParams: true });

taskCommentsRouter.use(requireAuth);

taskCommentsRouter.get('/', requireTaskAccess('member'), async (req, res) => {
  const comments = await Comment.find({ task: param(req, 'taskId') })
    .sort({ createdAt: 1 })
    .populate('author', authorFields);

  res.json({ comments: comments.map((c) => toCommentDTO(populated<CommentShape>(c))) });
});

taskCommentsRouter.post(
  '/',
  requireTaskAccess('member'),
  validateBody(createCommentSchema),
  async (req, res) => {
    const task = req.task!;
    const created = await Comment.create({
      task: task._id,
      project: task.project,
      author: req.userId,
      body: req.body.body,
    });

    // Keeps the count on the card correct without a join on every board load.
    const updated = await Task.findByIdAndUpdate(
      task._id,
      { $inc: { commentCount: 1 } },
      { new: true },
    ).select('commentCount');

    await created.populate('author', authorFields);
    const dto = toCommentDTO(populated<CommentShape>(created));
    const commentCount = updated?.commentCount ?? 0;

    emitToProject(String(task.project), originSocketId(req), 'comment:created', {
      comment: dto,
      commentCount,
    });
    await notifyTaskComment({ actorId: req.userId!, comment: dto });

    res.status(201).json({ comment: dto, commentCount });
  },
);

/** Mounted at /api/comments. */
export const commentsRouter = Router();

commentsRouter.use(requireAuth);

/** Editing is the author's alone - an admin may remove a comment, not rewrite it. */
commentsRouter.patch(
  '/:commentId',
  requireCommentAccess('member'),
  validateBody(updateCommentSchema),
  async (req, res) => {
    const comment = req.comment!;
    if (String(comment.author) !== req.userId) {
      throw forbidden('You can only edit your own comments');
    }

    comment.body = req.body.body;
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate('author', authorFields);

    const dto = toCommentDTO(populated<CommentShape>(comment));
    emitToProject(String(comment.project), originSocketId(req), 'comment:updated', { comment: dto });
    res.json({ comment: dto });
  },
);

commentsRouter.delete('/:commentId', requireCommentAccess('member'), async (req, res) => {
  const comment = req.comment!;
  const isAuthor = String(comment.author) === req.userId;
  if (!isAuthor && ROLE_RANK[req.membership!.role] < ROLE_RANK.admin) {
    throw forbidden('You can only delete your own comments');
  }

  const taskId = String(comment.task);
  const commentId = String(comment._id);
  await Comment.deleteOne({ _id: commentId });

  const updated = await Task.findByIdAndUpdate(
    taskId,
    { $inc: { commentCount: -1 } },
    { new: true },
  ).select('commentCount');

  emitToProject(String(comment.project), originSocketId(req), 'comment:deleted', {
    commentId,
    taskId,
    commentCount: Math.max(0, updated?.commentCount ?? 0),
  });
  res.status(204).end();
});
