export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError('VALIDATION_ERROR', message, 400, details),
  unauthorized: () => new AppError('UNAUTHORIZED', 'Please log in to continue.', 401),
  forbidden: (message = "You don't have access to this.") =>
    new AppError('FORBIDDEN', message, 403),
  notActive: () =>
    new AppError('ACCOUNT_NOT_ACTIVE', 'Your account is not active yet.', 403),
  // 404 is used for ownership failures so existence is not revealed (G2).
  notFound: (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found.`, 404),
  conflict: (message: string) => new AppError('CONFLICT', message, 409),
  rateLimited: (message: string) => new AppError('RATE_LIMITED', message, 429),
};
