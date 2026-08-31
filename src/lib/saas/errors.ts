// Typed error hierarchy for the SaaS Builder foundation. Server Actions
// catch these at the boundary and turn them into plain user-facing
// messages — never a raw stack trace.

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message = "Invalid input.") {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message = "This already exists.") {
    super(message);
    this.name = "ConflictError";
  }
}

const KNOWN_ERRORS = [UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError];

/** Server Actions call this in a catch block to get a safe, user-facing message. Never leaks internals. */
export function toActionError(error: unknown): string {
  if (KNOWN_ERRORS.some((E) => error instanceof E)) {
    return (error as Error).message;
  }
  return "Something went wrong. Please try again.";
}
