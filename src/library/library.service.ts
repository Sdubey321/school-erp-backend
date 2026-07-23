import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string, search?: string) {
    return this.prisma.libraryBook.findMany({
      where: {
        schoolId,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
            { isbn: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        issues: {
          where: { returnedAt: null },
          include: {
            student: {
              include: { user: { select: { firstName: true, lastName: true } } },
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });
  }

  async create(schoolId: string, data: { title: string; author?: string; isbn?: string; publisher?: string; category?: string; totalCopies?: number }) {
    const copies = data.totalCopies || 1;
    return this.prisma.libraryBook.create({
      data: {
        schoolId,
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        publisher: data.publisher,
        category: data.category,
        totalCopies: copies,
        availableCopies: copies,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.libraryBook.update({ where: { id }, data });
  }

  async remove(id: string) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return this.prisma.libraryBook.delete({ where: { id } });
  }

  async issueBook(bookId: string, studentId: string, dueDays: number = 14) {
    const book = await this.prisma.libraryBook.findUnique({ where: { id: bookId } });
    if (!book || book.availableCopies < 1) throw new NotFoundException('Book not available');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const [issue] = await this.prisma.$transaction([
      this.prisma.libraryIssue.create({
        data: { bookId, studentId, dueDate },
        include: {
          book: true,
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.libraryBook.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 }, status: book.availableCopies - 1 === 0 ? 'ISSUED' : 'AVAILABLE' },
      }),
    ]);
    return issue;
  }

  async returnBook(issueId: string) {
    const issue = await this.prisma.libraryIssue.findUnique({ where: { id: issueId }, include: { book: true } });
    if (!issue) throw new NotFoundException('Issue not found');

    const fine = issue.dueDate < new Date() ? Math.floor((new Date().getTime() - issue.dueDate.getTime()) / (1000 * 60 * 60 * 24)) * 2 : 0;

    const [updatedIssue] = await this.prisma.$transaction([
      this.prisma.libraryIssue.update({
        where: { id: issueId },
        data: { returnedAt: new Date(), fine },
      }),
      this.prisma.libraryBook.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 }, status: 'AVAILABLE' },
      }),
    ]);
    return updatedIssue;
  }

  async getStudentIssues(studentId: string) {
    return this.prisma.libraryIssue.findMany({
      where: { studentId },
      include: {
        book: { select: { title: true, author: true, category: true, isbn: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getActiveIssues(schoolId: string) {
    return this.prisma.libraryIssue.findMany({
      where: {
        returnedAt: null,
        book: { schoolId },
      },
      include: {
        book: { select: { title: true, author: true } },
        student: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
