import { CliError } from './errors.js';

export interface AvailabilityWindow {
  day: string;
  start: string;
  end: string;
  timezone: string;
}

export interface OverrideWindow {
  date: string;
  start: string;
  end: string;
  timezone: string;
}

export interface ScheduleShape {
  availability?: unknown[];
  overrides?: unknown[];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function buildOverrideSetPayload(
  schedule: ScheduleShape,
  override: OverrideWindow,
): Record<string, unknown> {
  const currentOverrides = Array.isArray(schedule.overrides) ? schedule.overrides : [];
  const filtered = currentOverrides.filter((item) => {
    const row = asObject(item);
    return row.date !== override.date;
  });

  return {
    availability: Array.isArray(schedule.availability) ? schedule.availability : [],
    overrides: [
      ...filtered,
      {
        date: override.date,
        startTime: override.start,
        endTime: override.end,
        timeZone: override.timezone,
      },
    ],
  };
}

export function buildOverrideClearPayload(
  schedule: ScheduleShape,
  date: string,
): Record<string, unknown> {
  const currentOverrides = Array.isArray(schedule.overrides) ? schedule.overrides : [];

  return {
    availability: Array.isArray(schedule.availability) ? schedule.availability : [],
    overrides: currentOverrides.filter((item) => {
      const row = asObject(item);
      return row.date !== date;
    }),
  };
}

export function buildWindowSetPayload(
  schedule: ScheduleShape,
  window: AvailabilityWindow,
): Record<string, unknown> {
  const currentAvailability = Array.isArray(schedule.availability) ? schedule.availability : [];
  const cleaned = currentAvailability.filter((item) => {
    const row = asObject(item);
    return row.day !== window.day;
  });

  return {
    availability: [
      ...cleaned,
      {
        day: window.day,
        startTime: window.start,
        endTime: window.end,
        timeZone: window.timezone,
      },
    ],
    overrides: Array.isArray(schedule.overrides) ? schedule.overrides : [],
  };
}

export function buildBookingCancelPayload(reason?: string): Record<string, unknown> {
  return reason ? { reason } : {};
}

export function buildBookingReschedulePayload(
  start: string,
  end: string,
  timezone: string,
): Record<string, unknown> {
  if (start >= end) {
    throw new CliError('Reschedule end time must be after start time', 'VALIDATION_ERROR');
  }
  return {
    start,
    end,
    timeZone: timezone,
  };
}
