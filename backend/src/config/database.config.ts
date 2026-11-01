import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Incident, IncidentPhoto, IncidentNote } from '../entities';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'mysql',
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: configService.get<number>('DATABASE_PORT', 3306),
    username: configService.get<string>('DATABASE_USER', 'appuser'),
    password: configService.get<string>('DATABASE_PASSWORD', 'Password123'),
    database: configService.get<string>('DATABASE_NAME', 'fixmycity'),
    entities: [User, Incident, IncidentPhoto, IncidentNote],
    synchronize:
      configService.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
    logging: configService.get<string>('DATABASE_LOGGING', 'false') === 'true',
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false,
  };
};
