import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export interface StoredConfig {
  apiKey?: string;
  timezone?: string;
}

export function getConfigPath(): string {
  const baseDir = process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config');
  return path.join(baseDir, 'calcom-cli', 'config.json');
}

export async function readConfig(): Promise<StoredConfig> {
  const filePath = getConfigPath();

  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return {};
  }
}

export async function writeConfig(nextConfig: StoredConfig): Promise<void> {
  const filePath = getConfigPath();
  const dirPath = path.dirname(filePath);

  await mkdir(dirPath, { recursive: true, mode: 0o700 });
  await writeFile(filePath, `${JSON.stringify(nextConfig, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await chmod(filePath, 0o600);
}
