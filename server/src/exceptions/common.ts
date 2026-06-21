// Excepciones comunes. Antes de crear una nueva, verificar si una de estas ya cubre
// el caso con un mensaje distinto (ver skill backend-architecture).
import { FenrirException } from "./FenrirException";

export class BadRequestException extends FenrirException {
  constructor(error = "Bad Request", details?: unknown) {
    super(error, "BAD_REQUEST", 400, details);
  }
}

export class UnauthorizedException extends FenrirException {
  constructor(error = "Unauthorized", details?: unknown) {
    super(error, "UNAUTHORIZED", 401, details);
  }
}

export class ForbiddenException extends FenrirException {
  constructor(error = "Forbidden", details?: unknown) {
    super(error, "FORBIDDEN", 403, details);
  }
}

export class NotFoundException extends FenrirException {
  constructor(error = "Not Found", details?: unknown) {
    super(error, "NOT_FOUND", 404, details);
  }
}

export class ConflictException extends FenrirException {
  constructor(error = "Conflict", details?: unknown) {
    super(error, "CONFLICT", 409, details);
  }
}
