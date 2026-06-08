import { test, expect } from '@playwright/test';

interface LoginResponse {
  token?: string;
  [key: string]: unknown;
}

test.describe('Login API Endpoint', () => {
  const baseUrl: string = process.env.BASE_URL || 'https://parabank.parasoft.com';
  const username: string = process.env.TEST_USERNAME || 'john';
  const password: string = process.env.TEST_PASSWORD || 'demo';

  test('should return 200 with token for valid credentials', async ({ request }) => {
    // Create API request context
    const apiContext = await request.newContext({
      baseURL: baseUrl,
    });

    // Send POST request to login endpoint
    const response = await apiContext.post('/api/login', {
      data: {
        username: username,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Assert status code is 200
    expect(response.status()).toBe(200);

    // Assert response is JSON
    const contentType: string | null = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    // Parse response body
    const responseBody: LoginResponse = await response.json();

    // Assert response contains a token
    expect(responseBody).toHaveProperty('token');
    expect(responseBody.token).toBeDefined();
    expect(typeof responseBody.token).toBe('string');
    expect(responseBody.token).not.toBe('');

    // Cleanup
    await apiContext.dispose();
  });

  test('should return valid token format', async ({ request }) => {
    // Create API request context
    const apiContext = await request.newContext({
      baseURL: baseUrl,
    });

    // Send POST request to login endpoint
    const response = await apiContext.post('/api/login', {
      data: {
        username: username,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Parse response body
    const responseBody: LoginResponse = await response.json();

    // Verify token is a non-empty string
    expect(responseBody.token).toBeTruthy();
    expect(responseBody.token!.length).toBeGreaterThan(0);

    // Cleanup
    await apiContext.dispose();
  });

  test('should handle invalid credentials gracefully', async ({ request }) => {
    // Create API request context
    const apiContext = await request.newContext({
      baseURL: baseUrl,
    });

    // Send POST request with invalid credentials
    const response = await apiContext.post('/api/login', {
      data: {
        username: 'invalid_user',
        password: 'invalid_password',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Assert status code is not 200 (should be 401 or similar)
    expect(response.status()).not.toBe(200);
    expect([401, 403, 400]).toContain(response.status());

    // Cleanup
    await apiContext.dispose();
  });

  test('should reject request without credentials', async ({ request }) => {
    // Create API request context
    const apiContext = await request.newContext({
      baseURL: baseUrl,
    });

    // Send POST request without credentials
    const response = await apiContext.post('/api/login', {
      data: {},
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Assert status code indicates error
    expect(response.status()).not.toBe(200);
    expect([400, 401, 422]).toContain(response.status());

    // Cleanup
    await apiContext.dispose();
  });
});
