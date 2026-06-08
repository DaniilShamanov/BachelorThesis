/**
 * CRITICAL TEST COVERAGE: Login Tests
 * 
 * Why these tests are critical:
 * - Authentication is the security gateway to the entire application
 * - Failed login handling prevents brute force attacks
 * - Session management affects user experience and security
 * - Incorrect error messages could leak security information
 * 
 * How these tests could fail if the application changes:
 * - Authentication mechanism changes (OAuth, SSO, 2FA)
 * - Session timeout logic changes
 * - Error message text changes
 * - Login form structure changes
 * - Account lockout policy changes
 * - Redirect behavior after login changes
 * - Password hashing algorithm changes
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { RegistrationPage } from '../pages/RegistrationPage';

test.describe('Login Functionality', () => {
  let loginPage: LoginPage;
  let accountsPage: AccountsOverviewPage;
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    accountsPage = new AccountsOverviewPage(page);
    registrationPage = new RegistrationPage(page);
    await loginPage.navigateToLogin();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // First, create a test user
    const timestamp = Date.now();
    const username = `logintest${timestamp}`;
    const password = 'TestPass123!';

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Login',
      lastName: 'Test',
      address: '123 Test St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-0000',
      ssn: '123-45-6789',
      username: username,
      password: password,
      confirmPassword: password
    });
    await registrationPage.clickRegisterButton();
    await page.waitForTimeout(1000);

    // Now login with the created user
    await loginPage.navigateToLogin();
    await loginPage.login(username, password);

    // Verify successful login
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    // Verify redirect to accounts overview
    await expect(page).toHaveURL(/overview\.htm/);
  });

  test('should show error message with invalid username', async ({ page }) => {
    await loginPage.login('invaliduser999999', 'wrongpassword');

    // Verify error message is displayed
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.toLowerCase()).toContain('error');
  });

  test('should show error message with invalid password', async ({ page }) => {
    // Create a user first
    const timestamp = Date.now();
    const username = `passtest${timestamp}`;
    const password = 'CorrectPass123!';

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Pass',
      lastName: 'Test',
      address: '456 Test Ave',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-1111',
      ssn: '987-65-4321',
      username: username,
      password: password,
      confirmPassword: password
    });
    await registrationPage.clickRegisterButton();
    await page.waitForTimeout(1000);

    // Try to login with wrong password
    await loginPage.navigateToLogin();
    await loginPage.login(username, 'WrongPassword123!');

    // Verify error message
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test('should show error with empty credentials', async ({ page }) => {
    await loginPage.clickLoginButton();

    // Verify error or validation
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();
  });

  test('should show error with empty username', async ({ page }) => {
    await loginPage.enterPassword('somepassword');
    await loginPage.clickLoginButton();

    // Verify error message
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();
  });

  test('should show error with empty password', async ({ page }) => {
    await loginPage.enterUsername('someuser');
    await loginPage.clickLoginButton();

    // Verify error message
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();
  });

  test('should display login form on initial page load', async ({ page }) => {
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should allow clearing and re-entering credentials', async ({ page }) => {
    await loginPage.enterUsername('testuser');
    await loginPage.enterPassword('testpass');

    await loginPage.clearUsername();
    await loginPage.clearPassword();

    await loginPage.enterUsername('newuser');
    await loginPage.enterPassword('newpass');

    // Form should accept new values
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Create and login user
    const timestamp = Date.now();
    const username = `sessiontest${timestamp}`;
    const password = 'SessionPass123!';

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Session',
      lastName: 'Test',
      address: '789 Session St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-2222',
      ssn: '111-22-3333',
      username: username,
      password: password,
      confirmPassword: password
    });
    await registrationPage.clickRegisterButton();
    await page.waitForTimeout(1000);

    await loginPage.navigateToLogin();
    await loginPage.login(username, password);

    // Verify logged in
    let isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();

    // Refresh page
    await page.reload();

    // Should still be logged in
    isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
  });

  test('should handle SQL injection attempt safely', async ({ page }) => {
    // Try SQL injection in username
    await loginPage.login("admin' OR '1'='1", "password");

    // Should show error, not grant access
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();

    // Should not be logged in
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeFalsy();
  });

  test('should handle XSS attempt safely', async ({ page }) => {
    // Try XSS in username
    await loginPage.login('<script>alert("XSS")</script>', 'password');

    // Should show error, not execute script
    const isErrorVisible = await loginPage.isErrorMessageVisible();
    expect(isErrorVisible).toBeTruthy();
  });
});
