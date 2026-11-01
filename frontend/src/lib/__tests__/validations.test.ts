import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  createIncidentSchema,
  validateIncidentSchema,
  assignAgentSchema,
  assignTechnicianSchema,
  progressIncidentSchema,
  trackReportSchema,
} from '../validations';

describe('Validation Schemas (Zod)', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'citizen@fixmycity.local',
        password: 'Password123!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email formats', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email address');
      }
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'citizen@fixmycity.local',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password is required');
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts valid citizen registration data', () => {
      const result = registerSchema.safeParse({
        firstName: 'Mohamed',
        lastName: 'Ali',
        email: 'mohamed.ali@example.com',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short first name or last name', () => {
      const result = registerSchema.safeParse({
        firstName: 'M',
        lastName: 'A',
        email: 'valid@example.com',
        password: 'SecurePassword123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('enforces password complexity (8+ chars, uppercase, lowercase, number/special)', () => {
      // Missing uppercase
      expect(
        registerSchema.safeParse({
          firstName: 'Mohamed',
          lastName: 'Ali',
          email: 'valid@example.com',
          password: 'password123!',
        }).success,
      ).toBe(false);

      // Missing number or special character
      expect(
        registerSchema.safeParse({
          firstName: 'Mohamed',
          lastName: 'Ali',
          email: 'valid@example.com',
          password: 'PasswordOnly',
        }).success,
      ).toBe(false);

      // Too short (< 8 chars)
      expect(
        registerSchema.safeParse({
          firstName: 'Mohamed',
          lastName: 'Ali',
          email: 'valid@example.com',
          password: 'P1!sh',
        }).success,
      ).toBe(false);
    });
  });

  describe('createIncidentSchema', () => {
    it('accepts valid incident payload', () => {
      const result = createIncidentSchema.safeParse({
        title: 'Large pothole on main road',
        category: 'ROADS',
        streetAddress: '15 Avenue Habib Bourguiba, Tunis',
        description: 'Deep road depression causing vehicle damage.',
        latitude: 36.8008,
        longitude: 10.18,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid categories', () => {
      const result = createIncidentSchema.safeParse({
        title: 'Large pothole',
        category: 'NON_EXISTENT_CATEGORY',
        streetAddress: 'Main St',
        description: 'Road damage issue.',
        latitude: 36.8,
        longitude: 10.1,
      });
      expect(result.success).toBe(false);
    });

    it('enforces GPS coordinates range (-90 to 90 lat, -180 to 180 lng)', () => {
      const outOfBoundsLat = createIncidentSchema.safeParse({
        title: 'Test hazard',
        category: 'LIGHTING',
        streetAddress: 'Main St',
        description: 'Broken streetlight pole.',
        latitude: 95.5,
        longitude: 10.0,
      });
      expect(outOfBoundsLat.success).toBe(false);

      const outOfBoundsLng = createIncidentSchema.safeParse({
        title: 'Test hazard',
        category: 'LIGHTING',
        streetAddress: 'Main St',
        description: 'Broken streetlight pole.',
        latitude: 45.0,
        longitude: 195.0,
      });
      expect(outOfBoundsLng.success).toBe(false);
    });
  });

  describe('validateIncidentSchema', () => {
    it('accepts valid validation decisions', () => {
      const validApproval = validateIncidentSchema.safeParse({
        isValid: true,
        priority: 'CRITICAL',
        note: 'Confirmed hazardous electrical wire exposed.',
      });
      expect(validApproval.success).toBe(true);

      const validRejection = validateIncidentSchema.safeParse({
        isValid: false,
        priority: 'LOW',
        note: 'Private property, outside municipal jurisdiction.',
      });
      expect(validRejection.success).toBe(true);
    });

    it('rejects too short notes (< 3 characters)', () => {
      const result = validateIncidentSchema.safeParse({
        isValid: true,
        priority: 'MEDIUM',
        note: 'ok',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('assignAgentSchema and assignTechnicianSchema', () => {
    it('requires valid UUIDs', () => {
      const validUuid = 'b4a3a697-bca8-4e8c-8be9-e0e6c64ce1a1';
      expect(assignAgentSchema.safeParse({ agentId: validUuid }).success).toBe(
        true,
      );
      expect(
        assignTechnicianSchema.safeParse({ technicianId: validUuid }).success,
      ).toBe(true);

      expect(assignAgentSchema.safeParse({ agentId: 'non-uuid' }).success).toBe(
        false,
      );
      expect(
        assignTechnicianSchema.safeParse({ technicianId: 'non-uuid' }).success,
      ).toBe(false);
    });
  });

  describe('progressIncidentSchema', () => {
    it('only allows IN_PROGRESS or RESOLVED status', () => {
      expect(
        progressIncidentSchema.safeParse({
          status: 'IN_PROGRESS',
          reportNote: 'Started work on site.',
        }).success,
      ).toBe(true);

      expect(
        progressIncidentSchema.safeParse({
          status: 'RESOLVED',
          reportNote: 'Repairs complete and tested.',
        }).success,
      ).toBe(true);

      expect(
        progressIncidentSchema.safeParse({
          status: 'PENDING_VALIDATION',
          reportNote: 'Invalid status for progress transition.',
        }).success,
      ).toBe(false);
    });
  });

  describe('trackReportSchema', () => {
    it('accepts numeric report numbers and rejects non-numeric', () => {
      expect(trackReportSchema.safeParse({ reportNumber: '1005' }).success).toBe(
        true,
      );
      expect(
        trackReportSchema.safeParse({ reportNumber: '1005A' }).success,
      ).toBe(false);
      expect(trackReportSchema.safeParse({ reportNumber: '' }).success).toBe(
        false,
      );
    });
  });
});
