import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async attendanceReport(schoolId: string, classId?: string, month?: number, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const sections = await this.prisma.section.findMany({
      where: {
        class: {
          schoolId,
          ...(classId && { id: classId }),
        },
      },
      include: { class: { select: { name: true } } },
    });

    const report = await Promise.all(
      sections.map(async (section) => {
        const students = await this.prisma.student.findMany({
          where: { sectionId: section.id, user: { isActive: true } },
          include: { user: { select: { firstName: true, lastName: true } } },
        });

        const studentStats = await Promise.all(
          students.map(async (student) => {
            const [present, absent, late] = await Promise.all([
              this.prisma.attendance.count({ where: { studentId: student.id, date: { gte: startDate, lte: endDate }, status: 'PRESENT' } }),
              this.prisma.attendance.count({ where: { studentId: student.id, date: { gte: startDate, lte: endDate }, status: 'ABSENT' } }),
              this.prisma.attendance.count({ where: { studentId: student.id, date: { gte: startDate, lte: endDate }, status: 'LATE' } }),
            ]);
            const total = present + absent + late;
            return {
              studentId: student.id,
              name: `${student.user.firstName} ${student.user.lastName}`,
              admissionNo: student.admissionNo,
              present, absent, late, total,
              percentage: total > 0 ? Math.round((present / total) * 100) : 0,
            };
          })
        );

        return {
          sectionId: section.id,
          sectionName: section.name,
          className: section.class.name,
          students: studentStats,
          summary: {
            avgAttendance: studentStats.length > 0
              ? Math.round(studentStats.reduce((a, s) => a + s.percentage, 0) / studentStats.length)
              : 0,
            below75: studentStats.filter(s => s.percentage < 75).length,
          },
        };
      })
    );

    return { month: targetMonth, year: targetYear, sections: report };
  }

  async feeReport(schoolId: string) {
    const [pendingInvoices, totalCollectedAgg, totalBilledAgg] = await Promise.all([
      this.prisma.feeInvoice.count({ where: { student: { class: { schoolId } }, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } }),
      this.prisma.feePayment.aggregate({
        where: { invoice: { student: { class: { schoolId } } } },
        _sum: { amount: true },
      }),
      this.prisma.feeInvoice.aggregate({
        where: { student: { class: { schoolId } } },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalBilled = Number(totalBilledAgg._sum?.totalAmount || 0);
    const totalCollected = Number(totalCollectedAgg._sum?.amount || 0);

    // Class-wise fee collection
    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          include: {
            feeInvoices: {
              include: { payments: true },
            },
          },
        },
      },
    });

    const classReport = classes.map(cls => {
      let billed = 0, collected = 0, pending = 0;
      cls.students.forEach(student => {
        student.feeInvoices.forEach(inv => {
          billed += Number(inv.totalAmount);
          const paid = inv.payments.reduce((a, p) => a + Number(p.amount), 0);
          collected += paid;
          if (inv.status !== 'PAID') pending += Number(inv.totalAmount) - paid;
        });
      });
      return { className: cls.name, students: cls.students.length, billed, collected, pending };
    });

    return {
      summary: {
        totalBilled,
        totalCollected,
        pendingInvoices,
        pendingAmount: totalBilled - totalCollected,
      },
      classReport,
    };
  }

  async academicReport(schoolId: string, examTypeId?: string, classId?: string) {
    const examTypes = await this.prisma.examType.findMany({ where: { schoolId }, orderBy: { startDate: 'desc' } });
    const targetExamId = examTypeId || examTypes[0]?.id;
    if (!targetExamId) return { examTypes, results: [] };

    const results = await this.prisma.examResult.findMany({
      where: {
        examTypeId: targetExamId,
        student: {
          class: { schoolId },
          ...(classId && { classId }),
        },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        subject: { select: { name: true, maxMarks: true } },
      },
      orderBy: { student: { user: { firstName: 'asc' } } },
    });

    // Group by student
    const byStudent: Record<string, any> = {};
    results.forEach(r => {
      const sid = r.studentId;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          studentId: sid,
          name: `${r.student.user.firstName} ${r.student.user.lastName}`,
          class: r.student.class?.name,
          section: r.student.section?.name,
          subjects: [],
          totalMarks: 0,
          maxTotal: 0,
          percentage: 0,
        };
      }
      byStudent[sid].subjects.push({ subject: r.subject.name, marks: r.marksObtained, maxMarks: r.maxMarks, isAbsent: r.isAbsent });
      byStudent[sid].totalMarks += r.marksObtained;
      byStudent[sid].maxTotal += r.maxMarks;
    });

    // Calculate percentage
    Object.values(byStudent).forEach((s: any) => {
      s.percentage = s.maxTotal > 0 ? Math.round((s.totalMarks / s.maxTotal) * 100) : 0;
    });

    return { examTypes, selectedExamId: targetExamId, results: Object.values(byStudent) };
  }
}
