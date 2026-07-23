import { Module } from '@nestjs/common';
import { MarksheetTemplatesController } from './marksheet-templates.controller';
import { MarksheetTemplatesService } from './marksheet-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarksheetTemplatesController],
  providers: [MarksheetTemplatesService],
  exports: [MarksheetTemplatesService],
})
export class MarksheetTemplatesModule {}
