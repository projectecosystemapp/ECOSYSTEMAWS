/**
 * Type Utilities for Constitutional Compliance
 * 
 * Centralized utilities for handling nullable types and type conversions
 * in a type-safe manner throughout the application.
 */

/**
 * Safely converts a nullable string to a string or empty string
 */
export function nullableToString(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * Safely converts a nullable number to a number or 0
 */
export function nullableToNumber(value: number | null | undefined): number {
  return value ?? 0;
}

/**
 * Safely converts a nullable boolean to a boolean or false
 */
export function nullableToBoolean(value: boolean | null | undefined): boolean {
  return value ?? false;
}

/**
 * Safely converts a nullable array to an array or empty array
 */
export function nullableToArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

/**
 * Type guard to check if a value is not null or undefined
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Filters out null and undefined values from an array
 */
export function filterNull<T>(array: (T | null | undefined)[]): T[] {
  return array.filter(isNotNull);
}

/**
 * Safely handles string to number conversion
 */
export function stringToNumber(value: string | null | undefined, defaultValue = 0): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely handles any value to string conversion
 */
export function anyToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Converts BackendSecret to string for environment variable usage
 */
export function secretToString(value: unknown): string {
  return anyToString(value);
}

/**
 * Type-safe property access for objects that might be null/undefined
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined {
  return obj?.[key];
}
