import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../common/enums/role.enum';
import { Incident } from './incident.entity';
import { IncidentNote } from './incident-note.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: Role, default: Role.CITIZEN })
  role: Role;

  @OneToMany(() => Incident, (incident) => incident.reporter)
  reportedIncidents: Incident[];

  @OneToMany(() => Incident, (incident) => incident.assignedAgent)
  agentIncidents: Incident[];

  @OneToMany(() => Incident, (incident) => incident.assignedTechnician)
  technicianIncidents: Incident[];

  @OneToMany(() => IncidentNote, (note) => note.author)
  notes: IncidentNote[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
