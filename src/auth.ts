import { DEFAULT_TIMEZONE } from './constants.js';
import { CliError } from './errors.js';
import { readConfig, type StoredConfig, writeConfig } from './config.js';
import { apiKeySchema, timezoneSchema } from './validators.js';

export type AuthSource = 'env' | 'config' | 'none';

export interface AuthStatus {
  source: AuthSource;
  hasApiKey: boolean;
  configPath: string;
  timezone: string;
}

export function maskSecret(secret: string): string {
  if (secret.length <= 6) {
    return '***';
  }
  return `${secret.slice(0, 3)}***${secret.slice(-3)}`;
}

export async function setAuth(apiKey: string, timezone?: string): Promise<void> {
  const parsedKey = apiKeySchema.parse(apiKey);
  const nextTimezone = timezone ? timezoneSchema.parse(timezone) : undefined;
  const current = await readConfig();

  const nextConfig: StoredConfig = {
    ...current,
    apiKey: parsedKey,
  };

  if (nextTimezone) {
    nextConfig.timezone = nextTimezone;
  }

  await writeConfig(nextConfig);
}

export async function getAuthToken(config?: StoredConfig): Promise<{ token: string; source: 'env' | 'config' }> {
  const envToken = process.env.CALCOM_API_KEY?.trim();
  if (envToken) {
    return { token: envToken, source: 'env' };
  }

  const cfg = config ?? (await readConfig());
  if (cfg.apiKey?.trim()) {
    return { token: cfg.apiKey.trim(), source: 'config' };
  }

  throw new CliError(
    'No API key configured. Run `calcom auth set --api-key <key>` or set CALCOM_API_KEY in your environment.',
    'NO_AUTH',
  );
}

export async function readTimezone(config?: StoredConfig, override?: string): Promise<string> {
  if (override) {
    return timezoneSchema.parse(override);
  }
  const cfg = config ?? (await readConfig());
  if (!cfg.timezone) {
    return DEFAULT_TIMEZONE;
  }
  return timezoneSchema.parse(cfg.timezone);
}
