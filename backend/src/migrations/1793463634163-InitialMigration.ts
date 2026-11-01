import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1793463634163 implements MigrationInterface {
    name = 'InitialMigration1793463634163'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`incident_notes\` (\`id\` varchar(36) NOT NULL, \`incidentId\` varchar(36) NOT NULL, \`authorId\` varchar(36) NULL, \`content\` text NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`incident_photos\` (\`id\` varchar(36) NOT NULL, \`incidentId\` varchar(36) NOT NULL, \`s3Key\` varchar(500) NOT NULL, \`fileName\` varchar(255) NOT NULL, \`fileSizeBytes\` int NOT NULL, \`mimeType\` varchar(100) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`incidents\` (\`id\` varchar(36) NOT NULL, \`reportNumber\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`category\` enum ('ROADS', 'LIGHTING', 'WATER', 'WASTE', 'GREENERY', 'OTHER') NOT NULL DEFAULT 'ROADS', \`status\` enum ('RECEIVED', 'PENDING_VALIDATION', 'VALIDATED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'RECEIVED', \`priority\` enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM', \`streetAddress\` varchar(255) NOT NULL, \`latitude\` decimal(10,7) NOT NULL, \`longitude\` decimal(10,7) NOT NULL, \`reporterId\` varchar(36) NULL, \`agentId\` varchar(36) NULL, \`technicianId\` varchar(36) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_ff5c29e2fd6768e0d5b6f3a528\` (\`reportNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`firstName\` varchar(100) NOT NULL, \`lastName\` varchar(100) NOT NULL, \`role\` enum ('CITIZEN', 'ADMIN', 'AGENT', 'TECHNICIAN') NOT NULL DEFAULT 'CITIZEN', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`incident_notes\` ADD CONSTRAINT \`FK_259cda8167949c4b3830491f2f3\` FOREIGN KEY (\`incidentId\`) REFERENCES \`incidents\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`incident_notes\` ADD CONSTRAINT \`FK_4a847dfd35eb44ecb5c7cbf2553\` FOREIGN KEY (\`authorId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`incident_photos\` ADD CONSTRAINT \`FK_53381a3d2ccbc5bd312dca9dfd2\` FOREIGN KEY (\`incidentId\`) REFERENCES \`incidents\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`incidents\` ADD CONSTRAINT \`FK_eb4eedb4f8cf4e58b66857067f9\` FOREIGN KEY (\`reporterId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`incidents\` ADD CONSTRAINT \`FK_3a095caa89cc3343f38b69973ac\` FOREIGN KEY (\`agentId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`incidents\` ADD CONSTRAINT \`FK_91ce5e79cd0f8528f1d2e8cf31d\` FOREIGN KEY (\`technicianId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`incidents\` DROP FOREIGN KEY \`FK_91ce5e79cd0f8528f1d2e8cf31d\``);
        await queryRunner.query(`ALTER TABLE \`incidents\` DROP FOREIGN KEY \`FK_3a095caa89cc3343f38b69973ac\``);
        await queryRunner.query(`ALTER TABLE \`incidents\` DROP FOREIGN KEY \`FK_eb4eedb4f8cf4e58b66857067f9\``);
        await queryRunner.query(`ALTER TABLE \`incident_photos\` DROP FOREIGN KEY \`FK_53381a3d2ccbc5bd312dca9dfd2\``);
        await queryRunner.query(`ALTER TABLE \`incident_notes\` DROP FOREIGN KEY \`FK_4a847dfd35eb44ecb5c7cbf2553\``);
        await queryRunner.query(`ALTER TABLE \`incident_notes\` DROP FOREIGN KEY \`FK_259cda8167949c4b3830491f2f3\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_ff5c29e2fd6768e0d5b6f3a528\` ON \`incidents\``);
        await queryRunner.query(`DROP TABLE \`incidents\``);
        await queryRunner.query(`DROP TABLE \`incident_photos\``);
        await queryRunner.query(`DROP TABLE \`incident_notes\``);
    }

}
