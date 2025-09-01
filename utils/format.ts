/**
 * Format utilities for the application
 */

/**
 * Format cents to currency display string
 * @param cents - Amount in cents
 * @param currency - Currency code (default: CAD)
 * @returns Formatted currency string
 */
export function formatPrice(cents: number, currency: string = 'CAD'): string {
  const amount = cents / 100;
  
  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Format date to display string
 * @param date - Date object or string
 * @param format - Format type ('short', 'long', 'date-only', 'time-only')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'date-only' | 'time-only' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return dateObj.toLocaleDateString('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'date-only':
      return dateObj.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'time-only':
      return dateObj.toLocaleTimeString('en-CA', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'short':
    default:
      return dateObj.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  }
}

/**
 * Format phone number for display
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Format as +X (XXX) XXX-XXXX
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Return original if format doesn't match
  return phone;
}

/**
 * Format duration in minutes to display string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
}

/**
 * Format address components into a single string
 * @param address - Address components
 * @returns Formatted address string
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}): string {
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.province) parts.push(address.province);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
}

/**
 * Format percentage for display
 * @param value - Decimal value (0.15 = 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}