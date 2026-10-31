import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Incident } from './incident.entity';

@Entity('incident_photos')
export class IncidentPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  incidentId: string;

  @ManyToOne(() => Incident, (incident) => incident.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incidentId' })
  incident: Incident;

  @Column({ type: 'varchar', length: 500 })
  s3Key: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'int' })
  fileSizeBytes: number;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
