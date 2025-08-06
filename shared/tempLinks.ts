import { z } from "zod";

// Temporary link types
export const tempLinkTypes = {
  PET_QR: 'pet_qr',
  FILE_SHARE: 'file_share',
  MEDICAL_RECORD: 'medical_record'
} as const;

export type TempLinkType = typeof tempLinkTypes[keyof typeof tempLinkTypes];

// Temporary link validation schema
export const tempLinkValidationSchema = z.object({
  id: z.string(),
  token: z.string(),
  type: z.enum([tempLinkTypes.PET_QR, tempLinkTypes.FILE_SHARE, tempLinkTypes.MEDICAL_RECORD]),
  resourceId: z.string(), // Pet ID, file ID, etc.
  tenantId: z.string(),
  expiresAt: z.date(),
  accessCount: z.number().default(0),
  maxAccess: z.number().nullable().optional(),
  createdBy: z.string(),
  createdAt: z.date().default(() => new Date()),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).nullable().optional(), // Additional data like file info, pet name, etc.
});

export type TempLink = {
  id: string;
  token: string;
  type: TempLinkType;
  resourceId: string;
  tenantId: string;
  expiresAt: Date;
  accessCount: number;
  maxAccess?: number | null;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  metadata?: Record<string, any> | null;
};

export type InsertTempLink = z.infer<typeof insertTempLinkSchema>;

export const insertTempLinkSchema = z.object({
  token: z.string(),
  type: z.enum([tempLinkTypes.PET_QR, tempLinkTypes.FILE_SHARE, tempLinkTypes.MEDICAL_RECORD]),
  resourceId: z.string(),
  tenantId: z.string(),
  expiresAt: z.date(),
  accessCount: z.number().default(0),
  maxAccess: z.number().nullable().optional(),
  createdBy: z.string(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).nullable().optional(),
});

// Helper functions for link generation
export function generateTempToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

export function generateTempLinkUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/temp/${token}`;
}

// Default expiration times (in hours)
export const defaultExpirationHours = {
  [tempLinkTypes.PET_QR]: 24 * 7, // 1 week for pet QR codes
  [tempLinkTypes.FILE_SHARE]: 24, // 1 day for file sharing
  [tempLinkTypes.MEDICAL_RECORD]: 24 * 3, // 3 days for medical records
} as const;