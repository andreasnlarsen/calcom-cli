import { describe, expect, it } from 'vitest';
import {
  buildBookingCancelPayload,
  buildBookingReschedulePayload,
  buildOverrideClearPayload,
  buildOverrideSetPayload,
  buildWindowSetPayload,
} from '../src/payloads.ts';

describe('payload builders', () => {
  it('builds override set payload and replaces same-date override', () => {
    const payload = buildOverrideSetPayload(
      {
        availability: [{ day: 'mon', startTime: '09:00', endTime: '12:00' }],
        overrides: [
          { date: '2026-03-02', startTime: '08:00', endTime: '09:00' },
          { date: '2026-03-03', startTime: '10:00', endTime: '11:00' },
        ],
      },
      { date: '2026-03-02', start: '09:00', end: '12:00', timezone: 'Europe/Oslo' },
    );

    expect(payload.availability).toHaveLength(1);
    expect((payload.overrides as unknown[])).toHaveLength(2);
    expect(payload.overrides).toContainEqual({
      date: '2026-03-02',
      startTime: '09:00',
      endTime: '12:00',
      timeZone: 'Europe/Oslo',
    });
  });

  it('builds override clear payload', () => {
    const payload = buildOverrideClearPayload(
      {
        availability: [],
        overrides: [
          { date: '2026-03-02', startTime: '09:00', endTime: '12:00' },
          { date: '2026-03-03', startTime: '10:00', endTime: '11:00' },
        ],
      },
      '2026-03-02',
    );

    expect(payload.overrides).toEqual([{ date: '2026-03-03', startTime: '10:00', endTime: '11:00' }]);
  });

  it('builds window set payload replacing target day', () => {
    const payload = buildWindowSetPayload(
      {
        availability: [
          { day: 'mon', startTime: '08:00', endTime: '09:00' },
          { day: 'tue', startTime: '09:00', endTime: '10:00' },
        ],
        overrides: [],
      },
      { day: 'mon', start: '09:00', end: '12:00', timezone: 'Europe/Oslo' },
    );

    expect(payload.availability).toContainEqual({
      day: 'mon',
      startTime: '09:00',
      endTime: '12:00',
      timeZone: 'Europe/Oslo',
    });
    expect((payload.availability as unknown[])).toHaveLength(2);
  });

  it('builds booking cancel payload', () => {
    expect(buildBookingCancelPayload('Client requested new slot')).toEqual({
      reason: 'Client requested new slot',
    });
  });

  it('builds booking reschedule payload', () => {
    expect(
      buildBookingReschedulePayload(
        '2026-03-02T09:00:00+01:00',
        '2026-03-02T10:00:00+01:00',
        'Europe/Oslo',
      ),
    ).toEqual({
      start: '2026-03-02T09:00:00+01:00',
      end: '2026-03-02T10:00:00+01:00',
      timeZone: 'Europe/Oslo',
    });
  });
});
