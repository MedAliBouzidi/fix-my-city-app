import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../common/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let queryBuilder: any;
  let userRepository: any;

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'agent-uuid-1',
          firstName: 'Sarah',
          lastName: 'Mansour',
          email: 'agent@fixmycity.local',
          role: Role.AGENT,
        },
      ]),
    };

    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should filter staff users by specific role when provided', async () => {
    const result = await service.findStaffUsers(Role.AGENT);

    expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.select).toHaveBeenCalledWith([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.email',
      'user.role',
    ]);
    expect(queryBuilder.where).toHaveBeenCalledWith('user.role = :role', {
      role: Role.AGENT,
    });
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe(Role.AGENT);
    expect((result[0] as any).password).toBeUndefined();
  });

  it('should return all staff (AGENT and TECHNICIAN) when no role filter is provided', async () => {
    await service.findStaffUsers();

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.role IN (:...roles)',
      {
        roles: [Role.AGENT, Role.TECHNICIAN],
      },
    );
  });
});
