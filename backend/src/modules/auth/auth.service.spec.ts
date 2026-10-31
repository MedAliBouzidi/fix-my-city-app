import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../common/enums/role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'citizen@example.com',
    password: 'hashedPassword',
    firstName: 'Mohamed',
    lastName: 'Ali',
    role: Role.CITIZEN,
  };

  const mockQueryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((user) =>
        Promise.resolve({ id: 'user-uuid-1', ...user }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt_token_sample'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new citizen successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed_pwd');

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toEqual({
        message: 'User registered successfully',
        userId: 'user-uuid-1',
      });
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          role: Role.CITIZEN,
        }),
      );
    });

    it('should throw ConflictException if email already registered', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'citizen@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully log in and return token and user profile without password', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.login({
        email: 'citizen@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('jwt_token_sample');
      expect(result.user).toEqual({
        id: 'user-uuid-1',
        email: 'citizen@example.com',
        role: Role.CITIZEN,
        firstName: 'Mohamed',
        lastName: 'Ali',
      });
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(
        service.login({
          email: 'citizen@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
