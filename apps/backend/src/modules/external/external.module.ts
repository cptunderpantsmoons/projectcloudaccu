import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalIntegrationService } from './external-integration.service';
import { ExternalIntegrationController } from './external-integration.controller';
import { CerModule } from '../cer/cer.module';
import { EmailModule } from '../email/email.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [
    ConfigModule,
    CerModule,
    EmailModule,
    FileStorageModule,
  ],
  providers: [ExternalIntegrationService],
  controllers: [ExternalIntegrationController],
  exports: [ExternalIntegrationService],
})
export class ExternalModule {}
