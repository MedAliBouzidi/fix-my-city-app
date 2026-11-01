import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Role } from '../../common/enums/role.enum';

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findStaffUsers(role?: Role): Promise<UserSummary[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.role',
      ]);

    if (role) {
      query.where('user.role = :role', { role });
    } else {
      query.where('user.role IN (:...roles)', {
        roles: [Role.AGENT, Role.TECHNICIAN],
      });
    }

    return query.getMany();
  }
}
