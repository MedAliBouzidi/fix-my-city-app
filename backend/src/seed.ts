import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { AppDataSource } from './data-source';
import { User } from './entities/user.entity';
import { Role } from './common/enums/role.enum';

dotenv.config();

async function runSeed() {
  console.log('--- Initializing database connection for seeding ---');
  await AppDataSource.initialize();

  const userRepository = AppDataSource.getRepository(User);

  const seedUsers = [
    {
      email: 'admin@fixmycity.local',
      password: process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!',
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
    {
      email: 'agent@fixmycity.local',
      password: process.env.SEED_AGENT_PASSWORD || 'AgentPass123!',
      firstName: 'Field',
      lastName: 'Agent',
      role: Role.AGENT,
    },
    {
      email: 'technician@fixmycity.local',
      password: process.env.SEED_TECHNICIAN_PASSWORD || 'TechPass123!',
      firstName: 'Repair',
      lastName: 'Technician',
      role: Role.TECHNICIAN,
    },
    {
      email: 'citizen@fixmycity.local',
      password: process.env.SEED_CITIZEN_PASSWORD || 'CitizenPass123!',
      firstName: 'Mohamed',
      lastName: 'Ali',
      role: Role.CITIZEN,
    },
  ];

  for (const seed of seedUsers) {
    const existing = await userRepository.findOne({
      where: { email: seed.email },
    });

    const hashedPassword = await bcrypt.hash(seed.password, 10);

    if (existing) {
      existing.password = hashedPassword;
      existing.firstName = seed.firstName;
      existing.lastName = seed.lastName;
      existing.role = seed.role;
      await userRepository.save(existing);
      console.log(`Updated seed user: ${seed.email} (${seed.role})`);
    } else {
      const newUser = userRepository.create({
        email: seed.email,
        password: hashedPassword,
        firstName: seed.firstName,
        lastName: seed.lastName,
        role: seed.role,
      });
      await userRepository.save(newUser);
      console.log(`Created seed user: ${seed.email} (${seed.role})`);
    }
  }

  await AppDataSource.destroy();
  console.log('--- Seeding completed successfully ---');
}

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
