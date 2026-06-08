/**
 * Test Helper Utilities
 * Common functions used across multiple test files
 */

/**
 * Generate a unique username with timestamp
 */
export function generateUniqueUsername(prefix: string = 'testuser'): string {
  const timestamp = Date.now();
  return `${prefix}${timestamp}`;
}

/**
 * Generate random test data for user registration
 */
export function generateUserData(usernamePrefix?: string): {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  ssn: string;
  username: string;
  password: string;
} {
  const timestamp = Date.now();
  return {
    firstName: 'Test',
    lastName: 'User',
    address: '123 Test Street',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '555-0123',
    ssn: '123-45-6789',
    username: generateUniqueUsername(usernamePrefix),
    password: 'TestPass123!',
  };
}

/**
 * Generate random payee data for bill payment
 */
export function generatePayeeData(amount: string, fromAccountIndex: number = 0): {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  accountNumber: string;
  amount: string;
  fromAccountIndex: number;
} {
  const timestamp = Date.now();
  return {
    name: `Payee${timestamp}`,
    address: '456 Payee Avenue',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '555-9876',
    accountNumber: `${timestamp}`,
    amount: amount,
    fromAccountIndex: fromAccountIndex,
  };
}

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace('$', '').replace(',', ''));
}

/**
 * Wait for a specific amount of time
 */
export async function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Generate random amount between min and max
 */
export function generateRandomAmount(min: number = 10, max: number = 100): string {
  const amount = Math.random() * (max - min) + min;
  return amount.toFixed(2);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\d{3}-\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * Generate random SSN
 */
export function generateSSN(): string {
  const part1 = Math.floor(Math.random() * 900) + 100;
  const part2 = Math.floor(Math.random() * 90) + 10;
  const part3 = Math.floor(Math.random() * 9000) + 1000;
  return `${part1}-${part2}-${part3}`;
}
