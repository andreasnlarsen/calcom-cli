import type { CalApiClient } from './client.js';

export interface CalSchedule {
  id: number | string;
  name?: string;
  timezone?: string;
  availability?: unknown[];
  overrides?: unknown[];
}

export async function listSchedules(client: CalApiClient): Promise<CalSchedule[]> {
  const response = await client.request<Record<string, unknown>>('/v2/schedules', {
    endpoint: 'schedules',
  });
  return coerceArray(response, ['data', 'schedules']) as CalSchedule[];
}

export async function getSchedule(client: CalApiClient, scheduleId: string): Promise<CalSchedule> {
  const response = await client.request<Record<string, unknown>>(`/v2/schedules/${scheduleId}`, {
    endpoint: 'schedules',
  });
  return (coerceNested(response, ['data', 'schedule']) ?? response) as CalSchedule;
}

export async function patchSchedule(
  client: CalApiClient,
  scheduleId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return client.request(`/v2/schedules/${scheduleId}`, {
    method: 'PATCH',
    endpoint: 'schedules',
    body: payload,
  });
}

export async function listEventTypes(client: CalApiClient): Promise<Record<string, unknown>[]> {
  const response = await client.request<Record<string, unknown>>('/v2/event-types', {
    endpoint: 'eventTypes',
  });
  return coerceArray(response, ['data', 'eventTypes']);
}

export async function checkSlots(
  client: CalApiClient,
  eventTypeId: string,
  start: string,
  end: string,
  timezone: string,
): Promise<Record<string, unknown>> {
  return client.request('/v2/slots', {
    endpoint: 'slots',
    query: {
      eventTypeId,
      start,
      end,
      timeZone: timezone,
    },
  });
}

export async function listBookings(
  client: CalApiClient,
  limit?: number,
): Promise<Record<string, unknown>[]> {
  const response = await client.request<Record<string, unknown>>('/v2/bookings', {
    endpoint: 'bookings',
    query: {
      limit: limit ? String(limit) : undefined,
    },
  });
  return coerceArray(response, ['data', 'bookings']);
}

export async function cancelBooking(
  client: CalApiClient,
  bookingId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return client.request(`/v2/bookings/${bookingId}/cancel`, {
    method: 'POST',
    endpoint: 'bookings',
    body: payload,
  });
}

export async function rescheduleBooking(
  client: CalApiClient,
  bookingId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return client.request(`/v2/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    endpoint: 'bookings',
    body: payload,
  });
}

function coerceNested(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in (current as Record<string, unknown>))) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function coerceArray(obj: Record<string, unknown>, path: string[]): Record<string, unknown>[] {
  const nested = coerceNested(obj, path);
  if (Array.isArray(nested)) {
    return nested as Record<string, unknown>[];
  }
  if (Array.isArray(obj)) {
    return obj as unknown as Record<string, unknown>[];
  }
  return [];
}
