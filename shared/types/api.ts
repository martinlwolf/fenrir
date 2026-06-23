// Tipos/DTOs de shape compartidos por client/ y server/. Sin logica de negocio.

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  error: string;
  error_code: string;
  details?: unknown;
}
