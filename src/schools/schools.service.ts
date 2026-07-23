import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('School code already exists');

    const school = await this.prisma.school.create({ data: dto });

    // Create academic year for the school
    const currentYear = new Date().getFullYear();
    await this.prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: `${currentYear}-${(currentYear + 1).toString().slice(2)}`,
        startDate: new Date(`${currentYear}-04-01`),
        endDate: new Date(`${currentYear + 1}-03-31`),
        isCurrent: true,
      },
    });

    // Create school admin user if provided
    if (dto.adminEmail && dto.adminPassword) {
      const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
      await this.prisma.user.create({
        data: {
          schoolId: school.id,
          role: 'SCHOOL_ADMIN',
          firstName: dto.adminFirstName || 'School',
          lastName: dto.adminLastName || 'Admin',
          email: dto.adminEmail,
          phone: dto.adminPhone,
          password: hashedPassword,
        },
      });
    }

    return school;
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { code: { contains: search, mode: 'insensitive' as any } },
            { city: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { users: true, classes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { schools, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        academicYears: { orderBy: { startDate: 'desc' } },
        _count: {
          select: { users: true, classes: true, libraryBooks: true, transports: true },
        },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findOne(id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async toggleStatus(id: string) {
    const school = await this.findOne(id);
    return this.prisma.school.update({
      where: { id },
      data: { isActive: !school.isActive },
    });
  }

  async getStats(id: string) {
    const [students, teachers, revenue, attendance] = await Promise.all([
      this.prisma.student.count({ where: { user: { schoolId: id } } }),
      this.prisma.teacher.count({ where: { user: { schoolId: id } } }),
      this.prisma.feePayment.aggregate({
        where: { invoice: { student: { user: { schoolId: id } } } },
        _sum: { amount: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: { gte: new Date(new Date().setDate(1)) },
          student: { user: { schoolId: id } },
        },
        _count: true,
      }),
    ]);

    return { students, teachers, totalRevenue: revenue._sum.amount || 0, attendance };
  }

  async getDashboardStats() {
    const [totalSchools, activeSchools, totalStudents, totalTeachers, totalRevenue, recentSchools] =
      await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { isActive: true } }),
        this.prisma.student.count(),
        this.prisma.teacher.count(),
        this.prisma.feePayment.aggregate({ _sum: { amount: true } }),
        this.prisma.school.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
      ]);

    return {
      totalSchools,
      activeSchools,
      totalStudents,
      totalTeachers,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentSchools
    };
  }

  async getSchoolAdminStats(schoolId: string) {
    const [totalStudents, totalTeachers, totalClasses, feeStats, recentAnnouncements] = await Promise.all([
      this.prisma.student.count({ where: { user: { schoolId, isActive: true } } }),
      this.prisma.teacher.count({ where: { user: { schoolId, isActive: true } } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.feeInvoice.aggregate({
        where: { student: { user: { schoolId } } },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.announcement.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalRevenue: feeStats._sum?.totalAmount || 0,
      totalCollected: feeStats._sum?.paidAmount || 0,
      pendingAmount: (feeStats._sum?.totalAmount || 0) - (feeStats._sum?.paidAmount || 0),
      recentAnnouncements,
    };
  }
}

