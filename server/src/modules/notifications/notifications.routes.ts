import { Router } from 'express';
import { NOTIFICATION_PAGE_SIZE, objectId } from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { badRequest, notFound } from '../../middleware/error.js';
import { Notification } from '../../models/Notification.js';
import { unreadCountFor } from '../../services/notify.js';
import { populated, toNotificationDTO, type NotificationShape } from '../../utils/serialize.js';
import { param } from '../../utils/params.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(NOTIFICATION_PAGE_SIZE)
      .populate('actor', 'name email avatarColor createdAt')
      .populate('project', 'name')
      .populate('task', 'title'),
    unreadCountFor(req.userId!),
  ]);

  res.json({
    notifications: notifications.map((n) => toNotificationDTO(populated<NotificationShape>(n))),
    unreadCount,
  });
});

notificationsRouter.patch('/:notificationId/read', async (req, res) => {
  const notificationId = param(req, 'notificationId');
  if (!objectId.safeParse(notificationId).success) throw badRequest('Invalid notification id');

  // Scoped to the recipient, so one user cannot mark another's notifications read.
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.userId },
    { $set: { read: true } },
    { new: true },
  );
  if (!updated) throw notFound('Notification not found');

  res.json({ id: notificationId, unreadCount: await unreadCountFor(req.userId!) });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await Notification.updateMany(
    { recipient: req.userId, read: false },
    { $set: { read: true } },
  );
  res.json({ unreadCount: 0 });
});
