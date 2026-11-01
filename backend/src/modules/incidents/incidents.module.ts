import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from '../../entities/incident.entity';
import { IncidentNote } from '../../entities/incident-note.entity';
import { User } from '../../entities/user.entity';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident, IncidentNote, User]),
    NotificationsModule,
    MediaModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
