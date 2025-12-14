import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CerService } from './cer.service';
import { CerController } from './cer.controller';

@Module({
  imports: [ConfigModule],
  providers: [CerService],
  controllers: [CerController],
  exports: [CerService],
})
export class CerModule {}
