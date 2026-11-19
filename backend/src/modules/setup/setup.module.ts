import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Incident } from '../../entities/incident.entity';
import { IncidentPhoto } from '../../entities/incident-photo.entity';
import { IncidentNote } from '../../entities/incident-note.entity';
import { MediaModule } from '../media/media.module';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Incident, IncidentPhoto, IncidentNote]),
    MediaModule,
  ],
  controllers: [SetupController],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}
