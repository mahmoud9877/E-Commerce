export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  // Per-field details, e.g. from request validation
  readonly errors?: FieldError[];

  constructor(message: string, statusCode = 500, errors?: FieldError[]) {
    super(message, { cause: statusCode });
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
