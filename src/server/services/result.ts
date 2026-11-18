export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 403 | 404 | 400; error: string };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function forbidden<T>(error: string): ServiceResult<T> {
  return { ok: false, status: 403, error };
}

export function notFound<T>(error: string): ServiceResult<T> {
  return { ok: false, status: 404, error };
}

export function badRequest<T>(error: string): ServiceResult<T> {
  return { ok: false, status: 400, error };
}
