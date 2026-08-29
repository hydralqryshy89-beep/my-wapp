// Real, derived calculations from raw DB records — never hard-coded.
// See spec §24 (Important Business Logic).

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

export function occupancy(registeredCount: number, capacity: number): number {
  return safeDiv(registeredCount, capacity) * 100;
}

export function remainingSeats(capacity: number, registeredCount: number): number {
  return Math.max(0, capacity - registeredCount);
}

export interface RegistrationLike {
  price: number;
  payments: { amount: number }[];
}

export function registrationPaid(registration: RegistrationLike): number {
  return registration.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function registrationRemaining(registration: RegistrationLike): number {
  return Math.max(0, registration.price - registrationPaid(registration));
}

export interface CourseFinancials {
  revenue: number;
  paid: number;
  remaining: number;
}

export function courseFinancials(registrations: RegistrationLike[]): CourseFinancials {
  const revenue = registrations.reduce((sum, r) => sum + r.price, 0);
  const paid = registrations.reduce((sum, r) => sum + registrationPaid(r), 0);
  return { revenue, paid, remaining: revenue - paid };
}
