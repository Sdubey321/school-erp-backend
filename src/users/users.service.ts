import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllGlobal(query: { page?: number; limit?: number; search?: string; role?: string; schoolId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          schoolId: true,
          isActive: true,
          createdAt: true,
          school: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPlatformAnalytics() {
    // Collect stats for super admin
    const [totalSchools, totalUsers, roleGroups, revenue] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.feePayment.aggregate({
        _sum: { amount: true }
      })
    ]);

    // Active vs Inactive schools
    const activeSchools = await this.prisma.school.count({ where: { isActive: true } });

    // Recent schools
    const recentSchools = await this.prisma.school.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalSchools,
      activeSchools,
      totalUsers,
      totalRevenue: revenue._sum.amount || 0,
      roleDistribution: roleGroups.map(r => ({ role: r.role, count: r._count })),
      recentSchools,
    };
  }

  async toggleStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }
}
