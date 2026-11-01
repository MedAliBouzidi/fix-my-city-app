import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { IncidentCategory } from '../common/enums/incident-category.enum';
import { IncidentPriority } from '../common/enums/incident-priority.enum';
import { IncidentStatus } from '../common/enums/incident-status.enum';
import { IncidentNote } from './incident-note.entity';
import { IncidentPhoto } from './incident-photo.entity';
import { User } from './user.entity';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  @Generated('increment')
  reportNumber: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: IncidentCategory,
    default: IncidentCategory.ROADS,
  })
  category: IncidentCategory;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.RECEIVED,
  })
  status: IncidentStatus;

  @Column({
    type: 'enum',
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  priority: IncidentPriority;

  @Column({ type: 'varchar', length: 255 })
  streetAddress: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value !== null ? parseFloat(value) : null),
    },
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value !== null ? parseFloat(value) : null),
    },
  })
  longitude: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reporterId: string | null;

  @ManyToOne(() => User, (user) => user.reportedIncidents, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'reporterId' })
  reporter: User | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  agentId: string | null;

  @ManyToOne(() => User, (user) => user.agentIncidents, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'agentId' })
  assignedAgent: User | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  technicianId: string | null;

  @ManyToOne(() => User, (user) => user.technicianIncidents, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'technicianId' })
  assignedTechnician: User | null;

  @OneToMany(() => IncidentPhoto, (photo) => photo.incident, {
    cascade: true,
  })
  photos: IncidentPhoto[];

  @OneToMany(() => IncidentNote, (note) => note.incident, {
    cascade: true,
  })
  notes: IncidentNote[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
