import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LibraryService } from './library.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Library')
@ApiBearerAuth()
@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('books')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT')
  findAll(@CurrentUser('schoolId') schoolId: string, @Query('search') search?: string) {
    return this.libraryService.findAll(schoolId, search);
  }

  @Post('books')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  create(@Body() data: any, @CurrentUser('schoolId') schoolId: string) {
    return this.libraryService.create(schoolId, data);
  }

  @Patch('books/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.libraryService.update(id, data);
  }

  @Delete('books/:id')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  remove(@Param('id') id: string) {
    return this.libraryService.remove(id);
  }

  @Post('issue')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  issueBook(@Body() data: { bookId: string; studentId: string; dueDays?: number }) {
    return this.libraryService.issueBook(data.bookId, data.studentId, data.dueDays);
  }

  @Post('return/:issueId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  returnBook(@Param('issueId') issueId: string) {
    return this.libraryService.returnBook(issueId);
  }

  @Get('issues/student/:studentId')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'STUDENT', 'PARENT')
  getStudentIssues(@Param('studentId') studentId: string) {
    return this.libraryService.getStudentIssues(studentId);
  }

  @Get('issues/active')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  getActiveIssues(@CurrentUser('schoolId') schoolId: string) {
    return this.libraryService.getActiveIssues(schoolId);
  }
}
