import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
    ),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const createIncidentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  category: z.enum(
    ['ROADS', 'LIGHTING', 'WATER', 'WASTE', 'GREENERY', 'OTHER'],
    {
      required_error: 'Please select an incident category',
    },
  ),
  streetAddress: z
    .string()
    .min(3, 'Street address must be at least 3 characters')
    .max(255, 'Street address cannot exceed 255 characters'),
  description: z
    .string()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  latitude: z
    .number({ invalid_type_error: 'Latitude must be a valid number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({ invalid_type_error: 'Longitude must be a valid number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export type CreateIncidentFormData = z.infer<typeof createIncidentSchema>;

export const validateIncidentSchema = z.object({
  isValid: z.boolean(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    required_error: 'Please select a priority level',
  }),
  note: z
    .string()
    .min(3, 'Validation note must be at least 3 characters')
    .max(1000, 'Validation note cannot exceed 1000 characters'),
});

export type ValidateIncidentFormData = z.infer<typeof validateIncidentSchema>;

export const assignAgentSchema = z.object({
  agentId: z.string().uuid('Please select a valid agent ID'),
});

export type AssignAgentFormData = z.infer<typeof assignAgentSchema>;

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid('Please select a valid technician ID'),
});

export type AssignTechnicianFormData = z.infer<typeof assignTechnicianSchema>;

export const progressIncidentSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'RESOLVED'], {
    required_error: 'Please choose an updated status',
  }),
  reportNote: z
    .string()
    .min(3, 'Progress note must be at least 3 characters')
    .max(1000, 'Progress note cannot exceed 1000 characters'),
});

export type ProgressIncidentFormData = z.infer<typeof progressIncidentSchema>;

export const trackReportSchema = z.object({
  reportNumber: z
    .string()
    .min(1, 'Please enter a report number')
    .regex(/^\d+$/, 'Report number must contain digits only'),
});

export type TrackReportFormData = z.infer<typeof trackReportSchema>;
