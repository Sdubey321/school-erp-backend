import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransportService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId: string) {
    return this.prisma.transport.findMany({
      where: { schoolId },
      include: {
        stops: { orderBy: { order: 'asc' } },
        _count: { select: { students: true } },
      },
      orderBy: { routeName: 'asc' },
    });
  }

  async create(schoolId: string, data: { routeName: string; busNo: string; driverName: string; driverPhone?: string; capacity?: number }) {
    return this.prisma.transport.create({
      data: {
        schoolId,
        routeName: data.routeName,
        busNo: data.busNo,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        capacity: data.capacity,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.transport.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.transport.delete({ where: { id } });
  }

  async addStop(transportId: string, data: { stopName: string; stopTime?: string; order: number }) {
    return this.prisma.transportStop.create({
      data: { transportId, ...data },
    });
  }

  async removeStop(stopId: string) {
    return this.prisma.transportStop.delete({ where: { id: stopId } });
  }
}
