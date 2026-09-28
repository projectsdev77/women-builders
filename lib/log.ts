// Structured logger. Context is passed per call, never kept in shared state (G18).
type Fields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', message: string, fields: Fields) {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, error?: unknown, fields?: Fields): void;
  child(fields: Fields): Logger;
}

export function createLogger(base: Fields = {}): Logger {
  return {
    info: (m, f = {}) => emit('info', m, { ...base, ...f }),
    warn: (m, f = {}) => emit('warn', m, { ...base, ...f }),
    error: (m, err, f = {}) =>
      emit('error', m, {
        ...base,
        ...f,
        error:
          err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
      }),
    child: (f) => createLogger({ ...base, ...f }),
  };
}

export const log = createLogger();
