import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { CerService } from './cer.service';
import { SubmitCerApplicationDto } from './dto/cer-application.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@Controller('integrations/cer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CerController {
  constructor(private readonly cerService: CerService) {}

  @Post('submit')
  @Roles('admin', 'auditor')
  async submitApplication(@Body() submissionDto: SubmitCerApplicationDto) {
    return this.cerService.submitApplication(submissionDto);
  }

  @Get('status/:referenceId')
  @Roles('admin', 'auditor', 'project_developer')
  async checkStatus(@Param('referenceId') referenceId: string) {
    return this.cerService.checkStatus(referenceId);
  }
}
