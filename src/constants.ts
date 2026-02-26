export const CALCOM_API_BASE_URL = 'https://api.cal.com';
export const DEFAULT_TIMEZONE = 'Europe/Oslo';

export const API_VERSIONS = {
  schedules: '2024-06-11',
  eventTypes: '2024-06-14',
  slots: '2024-09-04',
  bookings: '2024-08-13',
} as const;

export type EndpointKey = keyof typeof API_VERSIONS;
