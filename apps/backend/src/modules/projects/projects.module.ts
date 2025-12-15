import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Document } from '../../entities/document.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Project,
      User,
      Document,
      CalendarEvent,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
