export class CliError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = 'CLI_ERROR', details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
