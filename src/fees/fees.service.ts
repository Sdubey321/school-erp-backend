import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { CreateFeeInvoiceDto } from './dto/create-fee-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  // Fee Structures
  async createStructure(dto: CreateFeeStructureDto) {
    return this.prisma.feeStructure.create({ data: dto });
  }

  async getStructures(schoolId: string) {
    return this.prisma.feeStructure.findMany({
      where: { schoolId },
      include: { class: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // Fee Invoices
  async createInvoice(dto: CreateFeeInvoiceDto) {
    return this.prisma.feeInvoice.create({
      data: dto,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        feeStructure: { select: { name: true, amount: true } },
      },
    });
  }

  async generateInvoicesForClass(classId: string, feeStructureId: string, month: number, year: number) {
    const structure = await this.prisma.feeStructure.findUnique({ where: { id: feeStructureId } });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const students = await this.prisma.student.findMany({
      where: { classId, user: { isActive: true } },
    });

    const dueDate = new Date(year, month - 1, structure.dueDay);

    const invoices = await Promise.all(
      students.map((student) =>
        this.prisma.feeInvoice.upsert({
          where: {
            // use a unique constraint by creating it
            invoiceNo: `${student.id}-${feeStructureId}-${month}-${year}`,
          },
          update: {},
          create: {
            studentId: student.id,
            feeStructureId,
            month,
            year,
            totalAmount: structure.amount,
            dueDate,
            invoiceNo: `${student.id}-${feeStructureId}-${month}-${year}`,
          },
        }),
      ),
    );

    return { message: `Generated ${invoices.length} invoices`, count: invoices.length };
  }

  async getInvoices(schoolId: string) {
    return this.prisma.feeInvoice.findMany({
      where: { student: { user: { schoolId } } },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true } },
          },
        },
        feeStructure: { select: { name: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getStudentInvoices(studentId: string) {
    return this.prisma.feeInvoice.findMany({
      where: { studentId },
      include: {
        feeStructure: { select: { name: true } },
        payments: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
        feeStructure: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // Payments
  async recordPayment(dto: RecordPaymentDto) {
    const invoice = await this.getInvoice(dto.invoiceId);
    const newPaid = invoice.paidAmount + dto.amount;
    const status = newPaid >= invoice.totalAmount ? 'PAID' : 'PARTIAL';

    await this.prisma.feeInvoice.update({
      where: { id: dto.invoiceId },
      data: { paidAmount: newPaid, status },
    });

    return this.prisma.feePayment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        method: dto.method,
        transactionId: dto.transactionId,
        collectedBy: dto.collectedBy,
        remarks: dto.remarks,
      },
    });
  }

  async getPendingFees(schoolId: string) {
    return this.prisma.feeInvoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        student: { user: { schoolId } },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
            class: { select: { name: true } },
            parent: { include: { user: { select: { phone: true } } } },
          },
        },
        feeStructure: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getSchoolFeeStats(schoolId: string) {
    const [totalBilled, totalCollected, pending] = await Promise.all([
      this.prisma.feeInvoice.aggregate({
        where: { student: { user: { schoolId } } },
        _sum: { totalAmount: true },
      }),
      this.prisma.feeInvoice.aggregate({
        where: { student: { user: { schoolId } } },
        _sum: { paidAmount: true },
      }),
      this.prisma.feeInvoice.count({
        where: { student: { user: { schoolId } }, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      }),
    ]);

    return {
      totalBilled: totalBilled._sum.totalAmount || 0,
      totalCollected: totalCollected._sum.paidAmount || 0,
      pendingInvoices: pending,
      pendingAmount: (totalBilled._sum.totalAmount || 0) - (totalCollected._sum.paidAmount || 0),
    };
  }
}
