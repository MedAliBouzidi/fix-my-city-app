import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Incident } from './incident.entity';
import { User } from './user.entity';

@Entity('incident_notes')
export class IncidentNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  incidentId: string;

  @ManyToOne(() => Incident, (incident) => incident.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'incidentId' })
  incident: Incident;

  @Column({ type: 'varchar', length: 36, nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, (user) => user.notes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'authorId' })
  author: User | null;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
