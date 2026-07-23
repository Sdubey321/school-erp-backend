import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markBulk(dto: BulkAttendanceDto, markedById: string) {
    const results: any[] = [];


    for (const record of dto.records) {
      const upserted = await this.prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: new Date(dto.date),
          },
        },
        update: { status: record.status, remarks: record.remarks, markedById },
        create: {
          studentId: record.studentId,
          sectionId: dto.sectionId,
          date: new Date(dto.date),
          status: record.status,
          remarks: record.remarks,
          markedById,
        },
      });

      // Notify parent on absence
      if (record.status === 'ABSENT' || record.status === 'LATE') {
        await this.notifyParent(record.studentId, record.status, dto.date);
      }

      results.push(upserted);
    }

    return { message: 'Attendance marked successfully', count: results.length };
  }

  private async notifyParent(studentId: string, status: string, date: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        parent: { include: { user: { select: { phone: true, firstName: true } } } },
      },
    });

    if (!student?.parent) return;

    // Create in-app notification
    await this.prisma.notification.create({
      data: {
        userId: student.parent.userId,
        schoolId: student.user ? (await this.prisma.user.findUnique({ where: { id: student.userId } }))?.schoolId || '' : '',
        type: 'ATTENDANCE',
        title: `Attendance Alert - ${student.user.firstName} ${student.user.lastName}`,
        body: `Your child ${student.user.firstName} was marked ${status} on ${date}. Please contact the school for more information.`,
      },
    });

    // TODO: SMS notification via MSG91 when keys are configured
  }

  async getBySection(sectionId: string, date: string) {
    const students = await this.prisma.student.findMany({
      where: { sectionId, user: { isActive: true } },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
        attendances: {
          where: { date: new Date(date) },
          take: 1,
        },
      },
      orderBy: { rollNo: 'asc' },
    });

    return students.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNo,
      rollNo: s.rollNo,
      name: `${s.user.firstName} ${s.user.lastName}`,
      avatar: s.user.avatar,
      status: s.attendances[0]?.status || 'PRESENT',
      remarks: s.attendances[0]?.remarks || '',
    }));
  }

  async getStudentAttendance(studentId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.attendance.findMany({
      where: { studentId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  async getSectionReport(sectionId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await this.prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: { sectionId, date: { gte: startDate, lte: endDate } },
      _count: true,
    });

    return attendances;
  }

  async getSchoolSummary(schoolId: string, date: string) {
    const sections = await this.prisma.section.findMany({
      where: { class: { schoolId } },
      select: { id: true, name: true, class: { select: { name: true } } },
    });

    const sectionData = await Promise.all(
      sections.map(async (section) => {
        const [present, absent, late, leave, total] = await Promise.all([
          this.prisma.attendance.count({ where: { sectionId: section.id, date: new Date(date), status: 'PRESENT' } }),
          this.prisma.attendance.count({ where: { sectionId: section.id, date: new Date(date), status: 'ABSENT' } }),
          this.prisma.attendance.count({ where: { sectionId: section.id, date: new Date(date), status: 'LATE' } }),
          this.prisma.attendance.count({ where: { sectionId: section.id, date: new Date(date), status: 'LEAVE' } }),
          this.prisma.student.count({ where: { sectionId: section.id } }),
        ]);
        return { ...section, present, absent, late, leave, total, unmarked: total - present - absent - late - leave };
      }),
    );

    const totals = sectionData.reduce(
      (acc, s) => ({ present: acc.present + s.present, absent: acc.absent + s.absent, late: acc.late + s.late }),
      { present: 0, absent: 0, late: 0 },
    );

    return { ...totals, sections: sectionData };
  }
}
