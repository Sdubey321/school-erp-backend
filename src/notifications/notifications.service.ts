import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates an in-app notification for a user whose password was reset
   * by an admin or class teacher.
   */
  async createPasswordResetNotification(
    userId: string,
    schoolId: string,
    changedByName: string,
    changedByRole: string,
  ) {
    const roleLabel =
      changedByRole === 'TEACHER' ? 'your class teacher' : 'an administrator';

    return this.prisma.notification.create({
      data: {
        userId,
        schoolId,
        type: 'GENERAL',
        title: '🔐 Password Changed by ' + (changedByRole === 'TEACHER' ? 'Class Teacher' : 'Administrator'),
        body: `Your account password was reset by ${changedByName} (${roleLabel}). Please log in and change your password as soon as possible.`,
        isRead: false,
      },
    });
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}

