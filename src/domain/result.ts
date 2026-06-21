export type AppError = { code: string; detail: string; field?: string };

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
