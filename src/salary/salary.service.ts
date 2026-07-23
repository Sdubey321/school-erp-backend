import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  /** Get all teachers with salary info for a given month/year */
  async getAllTeachersSalary(schoolId: string, month: number, year: number) {
    const teachers = await this.prisma.teacher.findMany({
      where: { user: { schoolId, isActive: true } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        salaryRecords: {
          where: { month, year },
          take: 1,
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });

    return teachers.map((t) => ({
      teacherId: t.id,
      userId: t.userId,
      employeeCode: t.employeeCode,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      email: t.user.email,
      baseSalary: t.salary ?? 0,
      record: t.salaryRecords[0] ?? null,
    }));
  }

  /** Generate salary records for all active teachers for a month */
  async generatePayroll(schoolId: string, month: number, year: number) {
    const teachers = await this.prisma.teacher.findMany({
      where: { user: { schoolId, isActive: true } },
      include: {
        leaves: {
          where: {
            status: 'APPROVED',
            fromDate: { gte: new Date(year, month - 1, 1) },
            toDate: { lte: new Date(year, month, 0) },
          },
        },
      },
    });

    let created = 0;
    let skipped = 0;

    for (const teacher of teachers) {
      const exists = await this.prisma.salaryRecord.findUnique({
        where: { teacherId_month_year: { teacherId: teacher.id, month, year } },
      });
      if (exists) { skipped++; continue; }

      const basic = teacher.salary ?? 0;
      // Calculate leave deduction: (salary / 30) * leave_days
      const leaveDays = teacher.leaves.reduce((acc, l) => {
        const from = new Date(l.fromDate);
        const to = new Date(l.toDate);
        const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return acc + diff;
      }, 0);
      const leaveDeduction = basic > 0 ? Math.round((basic / 30) * leaveDays) : 0;

      await this.prisma.salaryRecord.create({
        data: {
          teacherId: teacher.id,
          month,
          year,
          basicSalary: basic,
          allowances: 0,
          deductions: leaveDeduction,
          netSalary: basic - leaveDeduction,
          status: 'DRAFT',
        },
      });
      created++;
    }

    return { message: `Generated ${created} records, skipped ${skipped} existing`, created, skipped };
  }

  /** Create or update a single salary record */
  async upsertRecord(dto: {
    teacherId: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances?: number;
    deductions?: number;
    remarks?: string;
  }) {
    const net = dto.basicSalary + (dto.allowances ?? 0) - (dto.deductions ?? 0);
    return this.prisma.salaryRecord.upsert({
      where: { teacherId_month_year: { teacherId: dto.teacherId, month: dto.month, year: dto.year } },
      create: {
        teacherId: dto.teacherId,
        month: dto.month,
        year: dto.year,
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        netSalary: net,
        remarks: dto.remarks,
        status: 'DRAFT',
      },
      update: {
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        netSalary: net,
        remarks: dto.remarks,
      },
      include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
  }

  /** Mark a salary record as paid */
  async markPaid(id: string) {
    const record = await this.prisma.salaryRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Salary record not found');
    return this.prisma.salaryRecord.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  /** Get salary history for a teacher (self or admin view) */
  async getTeacherHistory(teacherId: string) {
    return this.prisma.salaryRecord.findMany({
      where: { teacherId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /** Get salary record for current teacher (self) */
  async getMyHistory(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.getTeacherHistory(teacher.id);
  }

  /** Get slip data for PDF generation */
  async getSlipData(id: string) {
    const record = await this.prisma.salaryRecord.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: {
              include: {
                school: { select: { name: true, logo: true, address: true, phone: true } },
              },
            },
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Salary record not found');

    // Ensure slip exists
    await this.prisma.salarySlip.upsert({
      where: { salaryRecordId: id },
      create: { salaryRecordId: id },
      update: {},
    });

    return record;
  }

  /** Summary stats for admin dashboard */
  async getPayrollStats(schoolId: string, month: number, year: number) {
    const [total, paid, draft] = await Promise.all([
      this.prisma.salaryRecord.aggregate({
        where: { month, year, teacher: { user: { schoolId } } },
        _sum: { netSalary: true },
        _count: true,
      }),
      this.prisma.salaryRecord.count({
        where: { month, year, status: 'PAID', teacher: { user: { schoolId } } },
      }),
      this.prisma.salaryRecord.count({
        where: { month, year, status: 'DRAFT', teacher: { user: { schoolId } } },
      }),
    ]);

    return {
      totalPayout: total._sum.netSalary ?? 0,
      totalTeachers: total._count,
      paid,
      draft,
    };
  }
}
