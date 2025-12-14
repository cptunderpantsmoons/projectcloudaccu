import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExternalIntegrationService } from './external-integration.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExternalIntegrationController {
  constructor(private readonly externalService: ExternalIntegrationService) {}

  @Get('health')
  @Roles('admin')
  async getHealth() {
    return this.externalService.getIntegrationStatus();
  }
}
