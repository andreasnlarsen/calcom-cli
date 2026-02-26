import { z } from 'zod';

export const apiKeySchema = z.string().trim().min(10, 'API key looks too short');

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date format YYYY-MM-DD');

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected time format HH:mm (24h)');

export const weekdaySchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const timezoneSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone identifier');

export const ymdRangeSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
