import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User, Incident, IncidentPhoto, IncidentNote } from './entities';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USER || 'appuser',
  password: process.env.DATABASE_PASSWORD || 'Password123',
  database: process.env.DATABASE_NAME || 'fixmycity',
  entities: [User, Incident, IncidentPhoto, IncidentNote],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});
