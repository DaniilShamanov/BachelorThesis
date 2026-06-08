/**
 * CRITICAL TEST COVERAGE: Logout Tests
 * 
 * Why these tests are critical:
 * - Session termination is crucial for security
 * - Prevents unauthorized access after user leaves
 * - Protects sensitive financial data
 * - Ensures proper cleanup of user session data
 * 
 * How these tests could fail if the application changes:
 * - Session management mechanism changes (JWT, cookies, local storage)
 * - Logout endpoint changes
 * - Redirect behavior after logout changes
 * - Single sign-out across multiple services added
 * - Session timeout logic changes
 * - Browser back button behavior changes
 * - Cache control headers change
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { RegistrationPage } from '../pages/RegistrationPage';

test.describe('Logout Functionality', () => {
  let loginPage: LoginPage;
  let accountsPage: AccountsOverviewPage;
  let registrationPage: RegistrationPage;
  let testUsername: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    accountsPage = new AccountsOverviewPage(page);
    registrationPage = new RegistrationPage(page);

    // Create a new user for each test
    const timestamp = Date.now();
    testUsername = `logouttest${timestamp}`;
    testPassword = 'TestPass123!';

    await loginPage.navigateToLogin();
    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Logout',
      lastName: 'Test',
      address: '123 Logout St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-6666',
      ssn: '555-66-7777',
      username: testUsername,
      password: testPassword,
      confirmPassword: testPassword
    });
    await registrationPage.clickRegisterButton();
    await page.waitForTimeout(1000);

    // Login
    await loginPage.navigateToLogin();
    await loginPage.login(testUsername, testPassword);
    await page.waitForTimeout(1000);
  });

  test('should successfully logout and redirect to home page', async ({ page }) => {
    // Verify user is logged in
    let isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    // Logout
    await loginPage.logout();

    // Verify user is logged out
    isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();

    // Verify redirected to home/login page
    await expect(page).toHaveURL(/index\.htm/);
  });

  test('should display login form after logout', async ({ page }) => {
    await loginPage.logout();

    // Login form should be visible
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should not allow access to protected pages after logout', async ({ page }) => {
    // Logout
    await loginPage.logout();

    // Try to access accounts overview
    await accountsPage.navigateToAccountsOverview();

    // Should be redirected to login or show error
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();

    // Should not be on accounts overview page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('overview.htm');
  });

  test('should clear session data after logout', async ({ page }) => {
    // Logout
    await loginPage.logout();

    // Try to navigate back using browser back button
    await page.goBack();

    // Should not be able to access protected content
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should require re-login after logout', async ({ page }) => {
    // Logout
    await loginPage.logout();

    // Verify login form is visible
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();

    // Login again
    await loginPage.login(testUsername, testPassword);

    // Should be logged in again
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
  });

  test('should not display logout link when not logged in', async ({ page }) => {
    await loginPage.logout();

    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should handle multiple logout attempts gracefully', async ({ page }) => {
    // First logout
    await loginPage.logout();

    // Try to logout again (should handle gracefully)
    await page.goto('/parabank/logout.htm');
    
    // Should still be on login/home page
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should prevent access to transfer funds after logout', async ({ page }) => {
    await loginPage.logout();

    // Try to access transfer funds page
    await page.goto('/parabank/transfer.htm');

    // Should not be able to access
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should prevent access to bill pay after logout', async ({ page }) => {
    await loginPage.logout();

    // Try to access bill pay page
    await page.goto('/parabank/billpay.htm');

    // Should not be able to access
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should clear user context after logout', async ({ page }) => {
    // Get user info while logged in
    await accountsPage.navigateToAccountsOverview();
    const accountsWhileLoggedIn = await accountsPage.getAccountCount();
    expect(accountsWhileLoggedIn).toBeGreaterThan(0);

    // Logout
    await loginPage.logout();

    // Try to access accounts page
    await page.goto('/parabank/overview.htm');

    // Should not see account data
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should handle logout from different pages', async ({ page }) => {
    // Navigate to accounts overview
    await accountsPage.navigateToAccountsOverview();
    
    // Logout from accounts page
    await loginPage.logout();

    // Should be logged out
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should not cache protected pages after logout', async ({ page }) => {
    // Visit accounts page
    await accountsPage.navigateToAccountsOverview();
    const accountsUrl = page.url();

    // Logout
    await loginPage.logout();

    // Try to navigate directly to accounts URL
    await page.goto(accountsUrl);

    // Should not be able to access cached version
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should maintain logout state across page refresh', async ({ page }) => {
    // Logout
    await loginPage.logout();

    // Refresh page
    await page.reload();

    // Should still be logged out
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();

    // Login form should be visible
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should allow different user to login after logout', async ({ page }) => {
    // Logout first user
    await loginPage.logout();

    // Create second user
    const timestamp = Date.now();
    const secondUsername = `seconduser${timestamp}`;
    const secondPassword = 'SecondPass123!';

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Second',
      lastName: 'User',
      address: '456 Second St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-7777',
      ssn: '666-77-8888',
      username: secondUsername,
      password: secondPassword,
      confirmPassword: secondPassword
    });
    await registrationPage.clickRegisterButton();
    await page.waitForTimeout(1000);

    // Login with second user
    await loginPage.navigateToLogin();
    await loginPage.login(secondUsername, secondPassword);

    // Should be logged in as second user
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
  });

  test('should complete full login-logout cycle', async ({ page }) => {
    // Verify logged in
    let isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    // Access protected page
    await accountsPage.navigateToAccountsOverview();
    const accountCount = await accountsPage.getAccountCount();
    expect(accountCount).toBeGreaterThan(0);

    // Logout
    await loginPage.logout();
    isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();

    // Login again
    await loginPage.login(testUsername, testPassword);
    isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    // Should be able to access protected pages again
    await accountsPage.navigateToAccountsOverview();
    const accountCountAfter = await accountsPage.getAccountCount();
    expect(accountCountAfter).toBeGreaterThan(0);
  });
});
