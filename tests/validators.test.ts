import { describe, expect, it } from 'vitest';
import {
  dateSchema,
  isoDateTimeSchema,
  timeSchema,
  timezoneSchema,
  weekdaySchema,
} from '../src/validators.ts';

describe('validators', () => {
  it('accepts valid date/time', () => {
    expect(dateSchema.parse('2026-03-02')).toBe('2026-03-02');
    expect(timeSchema.parse('09:30')).toBe('09:30');
  });

  it('rejects invalid date', () => {
    expect(() => dateSchema.parse('03-02-2026')).toThrow();
  });

  it('accepts supported timezone', () => {
    expect(timezoneSchema.parse('Europe/Oslo')).toBe('Europe/Oslo');
  });

  it('rejects invalid weekday', () => {
    expect(() => weekdaySchema.parse('monday')).toThrow();
  });

  it('accepts ISO with offset', () => {
    expect(isoDateTimeSchema.parse('2026-03-02T09:00:00+01:00')).toBe(
      '2026-03-02T09:00:00+01:00',
    );
  });
});
