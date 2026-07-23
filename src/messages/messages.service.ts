import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getInbox(userId: string) {
    return this.prisma.message.findMany({
      where: { toId: userId },
      include: {
        from: { select: { firstName: true, lastName: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSent(userId: string) {
    return this.prisma.message.findMany({
      where: { fromId: userId },
      include: {
        to: { select: { firstName: true, lastName: true, role: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async send(fromId: string, schoolId: string, data: { toId: string; subject?: string; content: string }) {
    return this.prisma.message.create({
      data: {
        fromId,
        toId: data.toId,
        schoolId,
        subject: data.subject,
        content: data.content,
      },
      include: {
        from: { select: { firstName: true, lastName: true } },
        to: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async markRead(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.message.count({
      where: { toId: userId, isRead: false },
    });
  }

  async getRecipients(schoolId: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        id: { not: currentUserId },
        role: { in: ['SCHOOL_ADMIN', 'TEACHER'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
