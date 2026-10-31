import { prisma } from '../../config/prisma.js';
import { demoStore } from '../../storage/demoStore.js';

export class NotificationService {
  static async getUserNotifications(userId: string) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, readAt: null },
      });

      return { notifications, unreadCount };
    } catch {
      const list = demoStore.getNotifications(userId);
      return {
        notifications: list,
        unreadCount: list.filter((n) => !n.read).length,
      };
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { readAt: new Date() },
      });
    } catch {
      demoStore.markNotificationRead(notificationId);
      return { count: 1 };
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    } catch {
      demoStore.getNotifications(userId).forEach((n) => (n.read = true));
      return { count: 1 };
    }
  }
}
