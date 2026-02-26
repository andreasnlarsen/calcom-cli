import { constants } from 'node:fs';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  cancelBooking,
  checkSlots,
  getSchedule,
  listBookings,
  listEventTypes,
  listSchedules,
  patchSchedule,
  rescheduleBooking,
} from './api/calcom.js';
import { CalApiClient } from './api/client.js';
import { getAuthToken, maskSecret, readTimezone, setAuth } from './auth.js';
import { CALCOM_API_BASE_URL, DEFAULT_TIMEZONE } from './constants.js';
import { getConfigPath, readConfig } from './config.js';
import { CliError } from './errors.js';
import {
  buildBookingCancelPayload,
  buildBookingReschedulePayload,
  buildOverrideClearPayload,
  buildOverrideSetPayload,
  buildWindowSetPayload,
} from './payloads.js';
import { printJson, printResult } from './utils/output.js';
import { confirmOrThrow } from './utils/prompt.js';
import {
  dateSchema,
  isoDateTimeSchema,
  timeSchema,
  timezoneSchema,
  weekdaySchema,
  ymdRangeSchema,
} from './validators.js';

interface GlobalOptions {
  json?: boolean;
  timezone?: string;
}

interface RuntimeContext {
  json: boolean;
  timezone: string;
  config: Awaited<ReturnType<typeof readConfig>>;
  client: CalApiClient;
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('calcom')
    .description('Cal.com CLI for personal scheduling workflows')
    .option('--json', 'Output machine-safe JSON')
    .option('--timezone <tz>', `Timezone override (default: ${DEFAULT_TIMEZONE})`)
    .showHelpAfterError();

  configureAuth(program);
  configureSchedule(program);
  configureAvail(program);
  configureLink(program);
  configureSlot(program);
  configureBooking(program);
  configureOpenclaw(program);

  return program;
}

function configureAuth(program: Command): void {
  const auth = program.command('auth').description('Authentication and local config');

  auth
    .command('set')
    .description('Set API key in local config (0600)')
    .requiredOption('--api-key <key>', 'Cal.com API key')
    .option('--timezone <tz>', 'Persist preferred timezone in config')
    .action(
      withErrorHandling(async (options, cmd) => {
        const timezone = options.timezone ? timezoneSchema.parse(options.timezone) : undefined;
        await setAuth(options.apiKey, timezone);
        const payload = {
          configured: true,
          configPath: getConfigPath(),
          timezone: timezone ?? undefined,
        };
        printResult(Boolean(getGlobals(cmd).json), 'Auth updated in local config (secret hidden).', payload);
      }),
    );

  auth
    .command('status')
    .description('Show authentication source without revealing secret')
    .action(
      withErrorHandling(async (_, cmd) => {
        const config = await readConfig();
        const timezone = await readTimezone(config, getGlobals(cmd).timezone);
        const configToken = config.apiKey?.trim();
        const envToken = process.env.CALCOM_API_KEY?.trim();
        const token = envToken ?? configToken;

        const payload = {
          authenticated: Boolean(token),
          source: envToken ? 'env' : configToken ? 'config' : 'none',
          tokenPreview: token ? maskSecret(token) : null,
          configPath: getConfigPath(),
          timezone,
        };

        if (getGlobals(cmd).json) {
          printJson(payload);
          return;
        }

        if (!token) {
          process.stdout.write(
            `No API key configured. Run \`calcom auth set --api-key <key>\` or set CALCOM_API_KEY.\nTimezone: ${timezone}\n`,
          );
          return;
        }

        process.stdout.write(
          `Authenticated via ${payload.source}.\nToken: ${payload.tokenPreview}\nConfig: ${payload.configPath}\nTimezone: ${timezone}\n`,
        );
      }),
    );
}

function configureSchedule(program: Command): void {
  const schedule = program.command('schedule').description('Schedule inspection commands');

  schedule
    .command('list')
    .description('List schedules')
    .action(
      withErrorHandling(async (_, cmd) => {
        const runtime = await buildRuntime(cmd);
        const schedules = await listSchedules(runtime.client);

        if (runtime.json) {
          printJson({ schedules });
          return;
        }

        if (!schedules.length) {
          process.stdout.write('No schedules found.\n');
          return;
        }

        for (const item of schedules) {
          process.stdout.write(`${String(item.id)}\t${item.name ?? 'Unnamed schedule'}\n`);
        }
      }),
    );

  schedule
    .command('show')
    .description('Show one schedule')
    .option('--id <scheduleId>', 'Schedule ID, defaults to first schedule')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const scheduleId = await resolveScheduleId(runtime.client, options.id);
        const details = await getSchedule(runtime.client, scheduleId);

        if (runtime.json) {
          printJson({ schedule: details });
          return;
        }

        process.stdout.write(`Schedule ${String(details.id)}\n`);
        process.stdout.write(`Name: ${String(details.name ?? 'Unnamed')}\n`);
        process.stdout.write(`Timezone: ${String(details.timezone ?? runtime.timezone)}\n`);
        process.stdout.write(`Availability windows: ${Array.isArray(details.availability) ? details.availability.length : 0}\n`);
        process.stdout.write(`Overrides: ${Array.isArray(details.overrides) ? details.overrides.length : 0}\n`);
      }),
    );
}

function configureAvail(program: Command): void {
  const avail = program.command('avail').description('Availability management');
  const override = avail.command('override').description('Date-based overrides');
  const window = avail.command('window').description('Recurring weekly windows');

  override
    .command('set')
    .description('Set availability override for a specific date')
    .requiredOption('--date <yyyy-mm-dd>', 'Date (YYYY-MM-DD)')
    .requiredOption('--start <hh:mm>', 'Start time (HH:mm)')
    .requiredOption('--end <hh:mm>', 'End time (HH:mm)')
    .option('--schedule-id <id>', 'Schedule ID (defaults to first schedule)')
    .option('--dry-run', 'Print payload only')
    .option('--yes', 'Skip confirmation prompt')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const date = dateSchema.parse(options.date);
        const start = timeSchema.parse(options.start);
        const end = timeSchema.parse(options.end);
        if (start >= end) {
          throw new CliError('End time must be after start time', 'VALIDATION_ERROR');
        }

        const scheduleId = await resolveScheduleId(runtime.client, options.scheduleId);
        const schedule = await getSchedule(runtime.client, scheduleId);
        const payload = buildOverrideSetPayload(schedule, {
          date,
          start,
          end,
          timezone: runtime.timezone,
        });

        if (options.dryRun) {
          printJson({ dryRun: true, action: 'avail override set', scheduleId, payload });
          return;
        }

        await confirmOrThrow(Boolean(options.yes), `Set override on ${date} (${start}-${end}) for schedule ${scheduleId}?`);
        const result = await patchSchedule(runtime.client, scheduleId, payload);

        if (runtime.json) {
          printJson({ scheduleId, date, start, end, result });
          return;
        }

        process.stdout.write(`Override set for ${date} (${start}-${end}) on schedule ${scheduleId}.\n`);
      }),
    );

  override
    .command('clear')
    .description('Clear override for a specific date')
    .requiredOption('--date <yyyy-mm-dd>', 'Date (YYYY-MM-DD)')
    .option('--schedule-id <id>', 'Schedule ID (defaults to first schedule)')
    .option('--dry-run', 'Print payload only')
    .option('--yes', 'Skip confirmation prompt')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const date = dateSchema.parse(options.date);
        const scheduleId = await resolveScheduleId(runtime.client, options.scheduleId);
        const schedule = await getSchedule(runtime.client, scheduleId);
        const payload = buildOverrideClearPayload(schedule, date);

        if (options.dryRun) {
          printJson({ dryRun: true, action: 'avail override clear', scheduleId, payload });
          return;
        }

        await confirmOrThrow(Boolean(options.yes), `Clear override on ${date} for schedule ${scheduleId}?`);
        const result = await patchSchedule(runtime.client, scheduleId, payload);

        if (runtime.json) {
          printJson({ scheduleId, date, result });
          return;
        }

        process.stdout.write(`Override cleared for ${date} on schedule ${scheduleId}.\n`);
      }),
    );

  override
    .command('list')
    .description('List overrides in date range')
    .option('--from <yyyy-mm-dd>', 'From date (inclusive)')
    .option('--to <yyyy-mm-dd>', 'To date (inclusive)')
    .option('--schedule-id <id>', 'Schedule ID (defaults to first schedule)')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const range = ymdRangeSchema.parse({ from: options.from, to: options.to });
        const scheduleId = await resolveScheduleId(runtime.client, options.scheduleId);
        const schedule = await getSchedule(runtime.client, scheduleId);
        const overrides = Array.isArray(schedule.overrides) ? schedule.overrides : [];
        const filtered = overrides.filter((item) => {
          if (!item || typeof item !== 'object') {
            return false;
          }
          const date = String((item as Record<string, unknown>).date ?? '');
          if (!date) {
            return false;
          }
          if (range.from && date < range.from) {
            return false;
          }
          if (range.to && date > range.to) {
            return false;
          }
          return true;
        });

        if (runtime.json) {
          printJson({ scheduleId, overrides: filtered });
          return;
        }

        if (!filtered.length) {
          process.stdout.write('No overrides found for the selected range.\n');
          return;
        }

        for (const item of filtered) {
          const row = item as Record<string, unknown>;
          process.stdout.write(
            `${String(row.date)}\t${String(row.startTime ?? '')}-${String(row.endTime ?? '')}\t${String(row.timeZone ?? runtime.timezone)}\n`,
          );
        }
      }),
    );

  window
    .command('set')
    .description('Set recurring weekly availability window')
    .requiredOption('--day <mon|tue|wed|thu|fri|sat|sun>', 'Weekday')
    .requiredOption('--start <hh:mm>', 'Start time')
    .requiredOption('--end <hh:mm>', 'End time')
    .option('--schedule-id <id>', 'Schedule ID (defaults to first schedule)')
    .option('--dry-run', 'Print payload only')
    .option('--yes', 'Skip confirmation prompt')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const day = weekdaySchema.parse(String(options.day).toLowerCase());
        const start = timeSchema.parse(options.start);
        const end = timeSchema.parse(options.end);
        if (start >= end) {
          throw new CliError('End time must be after start time', 'VALIDATION_ERROR');
        }

        const scheduleId = await resolveScheduleId(runtime.client, options.scheduleId);
        const schedule = await getSchedule(runtime.client, scheduleId);
        const payload = buildWindowSetPayload(schedule, {
          day,
          start,
          end,
          timezone: runtime.timezone,
        });

        if (options.dryRun) {
          printJson({ dryRun: true, action: 'avail window set', scheduleId, payload });
          return;
        }

        await confirmOrThrow(Boolean(options.yes), `Set recurring window ${day} ${start}-${end} for schedule ${scheduleId}?`);
        const result = await patchSchedule(runtime.client, scheduleId, payload);

        if (runtime.json) {
          printJson({ scheduleId, day, start, end, result });
          return;
        }

        process.stdout.write(`Updated recurring window ${day} ${start}-${end} on schedule ${scheduleId}.\n`);
      }),
    );

  window
    .command('list')
    .description('List recurring availability windows')
    .option('--schedule-id <id>', 'Schedule ID (defaults to first schedule)')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const scheduleId = await resolveScheduleId(runtime.client, options.scheduleId);
        const schedule = await getSchedule(runtime.client, scheduleId);
        const windows = Array.isArray(schedule.availability) ? schedule.availability : [];

        if (runtime.json) {
          printJson({ scheduleId, availability: windows });
          return;
        }

        if (!windows.length) {
          process.stdout.write('No recurring windows found.\n');
          return;
        }

        for (const item of windows) {
          const row = item as Record<string, unknown>;
          process.stdout.write(
            `${String(row.day ?? '')}\t${String(row.startTime ?? '')}-${String(row.endTime ?? '')}\t${String(row.timeZone ?? runtime.timezone)}\n`,
          );
        }
      }),
    );
}

function configureLink(program: Command): void {
  const link = program.command('link').description('Event type link utilities');

  link
    .command('list')
    .description('List event type links')
    .action(
      withErrorHandling(async (_, cmd) => {
        const runtime = await buildRuntime(cmd);
        const links = await listEventTypes(runtime.client);

        if (runtime.json) {
          printJson({ links });
          return;
        }

        if (!links.length) {
          process.stdout.write('No event types found.\n');
          return;
        }

        for (const entry of links) {
          process.stdout.write(
            `${String(entry.id ?? '')}\t${String(entry.slug ?? '')}\t${String(entry.title ?? '')}\t${String(entry.bookingUrl ?? '')}\n`,
          );
        }
      }),
    );

  link
    .command('share')
    .description('Output booking URL for slug')
    .requiredOption('--slug <slug>', 'Event type slug')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const links = await listEventTypes(runtime.client);
        const target = links.find((entry) => String(entry.slug) === options.slug);
        if (!target) {
          throw new CliError(`No event type found for slug: ${options.slug}`, 'NOT_FOUND');
        }

        const bookingUrl = String(target.bookingUrl ?? '');
        if (!bookingUrl) {
          throw new CliError(`Event type ${options.slug} has no bookingUrl`, 'MISSING_BOOKING_URL');
        }

        if (runtime.json) {
          printJson({ slug: options.slug, bookingUrl });
          return;
        }

        process.stdout.write(`${bookingUrl}\n`);
      }),
    );
}

function configureSlot(program: Command): void {
  const slot = program.command('slot').description('Slot checks');

  slot
    .command('check')
    .description('Check slots for an event type in a time window')
    .requiredOption('--event-type-id <id>', 'Event type ID')
    .requiredOption('--start <iso>', 'Start ISO datetime with offset')
    .requiredOption('--end <iso>', 'End ISO datetime with offset')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const start = isoDateTimeSchema.parse(options.start);
        const end = isoDateTimeSchema.parse(options.end);

        if (start >= end) {
          throw new CliError('`--end` must be after `--start`', 'VALIDATION_ERROR');
        }

        const slots = await checkSlots(
          runtime.client,
          options.eventTypeId,
          start,
          end,
          runtime.timezone,
        );

        if (runtime.json) {
          printJson({ eventTypeId: options.eventTypeId, start, end, slots });
          return;
        }

        process.stdout.write(`Slot query completed for event type ${options.eventTypeId}.\n`);
        process.stdout.write(`${JSON.stringify(slots, null, 2)}\n`);
      }),
    );
}

function configureBooking(program: Command): void {
  const booking = program.command('booking').description('Booking operations');

  booking
    .command('list')
    .description('List bookings')
    .option('--today', 'Only bookings for today in active timezone')
    .option('--upcoming', 'Only bookings starting now or later')
    .option('--limit <n>', 'Limit number of bookings', (value) => Number(value))
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        if (options.today && options.upcoming) {
          throw new CliError('Use only one of --today or --upcoming', 'VALIDATION_ERROR');
        }

        const bookings = await listBookings(runtime.client, Number.isFinite(options.limit) ? options.limit : undefined);
        const nowIso = new Date().toISOString();
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: runtime.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const filtered = bookings.filter((item) => {
          const start = String(item.startTime ?? item.start ?? '');
          if (!start) {
            return false;
          }
          if (options.today) {
            return start.startsWith(today);
          }
          if (options.upcoming) {
            return start >= nowIso;
          }
          return true;
        });

        if (runtime.json) {
          printJson({ timezone: runtime.timezone, bookings: filtered });
          return;
        }

        if (!filtered.length) {
          process.stdout.write('No bookings found for selected filter.\n');
          return;
        }

        for (const item of filtered) {
          process.stdout.write(
            `${String(item.id ?? '')}\t${String(item.startTime ?? item.start ?? '')}\t${String(item.status ?? '')}\t${String(item.title ?? '')}\n`,
          );
        }
      }),
    );

  booking
    .command('cancel')
    .description('Cancel a booking')
    .requiredOption('--id <bookingId>', 'Booking ID')
    .option('--reason <text>', 'Cancellation reason')
    .option('--dry-run', 'Print payload only')
    .option('--yes', 'Skip confirmation prompt')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const payload = buildBookingCancelPayload(options.reason);

        if (options.dryRun) {
          printJson({ dryRun: true, action: 'booking cancel', bookingId: options.id, payload });
          return;
        }

        await confirmOrThrow(Boolean(options.yes), `Cancel booking ${options.id}?`);
        const result = await cancelBooking(runtime.client, options.id, payload);

        if (runtime.json) {
          printJson({ bookingId: options.id, result });
          return;
        }

        process.stdout.write(`Booking ${options.id} canceled.\n`);
      }),
    );

  booking
    .command('reschedule')
    .description('Reschedule an existing booking')
    .requiredOption('--id <bookingId>', 'Booking ID')
    .requiredOption('--start <iso>', 'New start ISO datetime with offset')
    .requiredOption('--end <iso>', 'New end ISO datetime with offset')
    .option('--dry-run', 'Print payload only')
    .option('--yes', 'Skip confirmation prompt')
    .action(
      withErrorHandling(async (options, cmd) => {
        const runtime = await buildRuntime(cmd);
        const start = isoDateTimeSchema.parse(options.start);
        const end = isoDateTimeSchema.parse(options.end);
        const payload = buildBookingReschedulePayload(start, end, runtime.timezone);

        if (options.dryRun) {
          printJson({ dryRun: true, action: 'booking reschedule', bookingId: options.id, payload });
          return;
        }

        await confirmOrThrow(Boolean(options.yes), `Reschedule booking ${options.id}?`);
        const result = await rescheduleBooking(runtime.client, options.id, payload);

        if (runtime.json) {
          printJson({ bookingId: options.id, start, end, result });
          return;
        }

        process.stdout.write(`Booking ${options.id} rescheduled to ${start} - ${end}.\n`);
      }),
    );
}

function configureOpenclaw(program: Command): void {
  const openclaw = program.command('openclaw').description('OpenClaw helper commands');

  openclaw
    .command('install-skill')
    .description('Install bundled calcom-cli OpenClaw skill into ~/.openclaw/workspace/skills/calcom-cli')
    .option('--openclaw-home <path>', 'Override OpenClaw home directory', defaultOpenclawHome())
    .option('--force', 'Overwrite existing SKILL.md if present', false)
    .action(
      withErrorHandling(async (options, cmd) => {
        const openclawHome = String(options.openclawHome ?? defaultOpenclawHome());
        const targetDir = join(openclawHome, 'workspace', 'skills', 'calcom-cli');
        const targetFile = join(targetDir, 'SKILL.md');

        const sourceFile = join(
          dirname(fileURLToPath(import.meta.url)),
          '..',
          'openclaw-skill',
          'SKILL.md',
        );

        const exists = await canRead(targetFile);
        if (exists && !options.force) {
          throw new CliError('Target skill file already exists. Re-run with --force to overwrite.', 'ALREADY_EXISTS', {
            targetFile,
          });
        }

        await mkdir(targetDir, { recursive: true });
        await copyFile(sourceFile, targetFile);

        printResult(Boolean(getGlobals(cmd).json), `Installed skill to ${targetFile}.`, {
          installed: true,
          targetFile,
          force: Boolean(options.force),
        });
      }),
    );
}

const defaultOpenclawHome = (): string => join(homedir(), '.openclaw');

async function canRead(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function buildRuntime(cmd: Command): Promise<RuntimeContext> {
  const globals = getGlobals(cmd);
  const config = await readConfig();
  const timezone = await readTimezone(config, globals.timezone);
  const auth = await getAuthToken(config);
  const client = new CalApiClient(auth.token, CALCOM_API_BASE_URL);

  return {
    json: Boolean(globals.json),
    timezone,
    config,
    client,
  };
}

async function resolveScheduleId(client: CalApiClient, explicit?: string): Promise<string> {
  if (explicit) {
    return explicit;
  }

  const schedules = await listSchedules(client);
  if (!schedules.length) {
    throw new CliError('No schedules available for this account.', 'NOT_FOUND');
  }

  return String(schedules[0].id);
}

function getGlobals(cmd: Command): GlobalOptions {
  return cmd.optsWithGlobals() as GlobalOptions;
}

function withErrorHandling<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    const maybeCommand = args[args.length - 1];
    const json = maybeCommand instanceof Command ? Boolean(getGlobals(maybeCommand).json) : false;

    try {
      await fn(...args);
    } catch (error) {
      const cliError = normalizeError(error);
      if (json) {
        printJson({
          error: {
            code: cliError.code,
            message: cliError.message,
            details: cliError.details ?? null,
          },
        });
      } else {
        process.stderr.write(`Error: ${cliError.message}\n`);
      }
      process.exitCode = 1;
    }
  };
}

function normalizeError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error && error.message === 'Operation canceled by user') {
    return new CliError('Operation canceled.', 'CANCELED');
  }

  if (error instanceof Error) {
    return new CliError(error.message, 'UNEXPECTED_ERROR');
  }

  return new CliError('Unknown error', 'UNEXPECTED_ERROR', error);
}

