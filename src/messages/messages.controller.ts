import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('inbox')
  getInbox(@CurrentUser('sub') userId: string) {
    return this.messagesService.getInbox(userId);
  }

  @Get('sent')
  getSent(@CurrentUser('sub') userId: string) {
    return this.messagesService.getSent(userId);
  }

  @Get('recipients')
  getRecipients(@CurrentUser('schoolId') schoolId: string, @CurrentUser('sub') currentUserId: string) {
    return this.messagesService.getRecipients(schoolId, currentUserId);
  }

  @Post()
  send(@CurrentUser('sub') userId: string, @CurrentUser('schoolId') schoolId: string, @Body() data: any) {
    return this.messagesService.send(userId, schoolId, data);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.messagesService.markRead(id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.messagesService.getUnreadCount(userId);
  }
}
