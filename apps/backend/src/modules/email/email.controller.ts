import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

class SendTestEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

@Controller('integrations/email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @Roles('admin')
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const success = await this.emailService.sendEmail(dto.to, dto.subject, dto.content);
    if (!success) {
      throw new BadRequestException('Failed to send email. Check logs for details.');
    }
    return { success: true, message: 'Email queued for sending' };
  }
}
