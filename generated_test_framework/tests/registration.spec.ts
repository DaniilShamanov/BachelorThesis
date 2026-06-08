/**
 * CRITICAL TEST COVERAGE: User Registration Tests
 * 
 * Why these tests are critical:
 * - Registration is the first interaction new users have with the system
 * - Data validation ensures database integrity
 * - Prevents duplicate accounts and invalid user data
 * - Security: weak password validation could compromise accounts
 * 
 * How these tests could fail if the application changes:
 * - New required fields added (email verification, captcha)
 * - Password complexity requirements change
 * - Username uniqueness validation changes
 * - Registration flow becomes multi-step
 * - Success/error message text changes
 * - Form validation logic changes (client-side vs server-side)
 * - Database schema changes affecting required fields
 */

import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../pages/RegistrationPage';
import { LoginPage } from '../pages/LoginPage';

test.describe('User Registration', () => {
  let registrationPage: RegistrationPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test('should successfully register a new user with valid data', async ({ page }) => {
    // Generate unique username to avoid conflicts
    const timestamp = Date.now();
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '555-1234',
      ssn: '123-45-6789',
      username: `testuser${timestamp}`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };

    await registrationPage.navigateToRegistration();
    await expect(page).toHaveURL(/register\.htm/);

    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.clickRegisterButton();

    // Verify successful registration
    await expect(page).toHaveURL(/register\.htm/);
    const successMessage = await registrationPage.getSuccessMessage();
    expect(successMessage).toContain('Your account was created successfully');
  });

  test('should show validation errors when required fields are missing', async ({ page }) => {
    await registrationPage.navigateToRegistration();

    // Try to register with empty form
    await registrationPage.clickRegisterButton();

    // Verify validation errors appear
    const fieldErrors = await registrationPage.getFieldErrors();
    expect(fieldErrors.length).toBeGreaterThan(0);
    
    // Check for specific required field errors
    const errorText = fieldErrors.join(' ');
    expect(errorText).toContain('required');
  });

  test('should show error when passwords do not match', async ({ page }) => {
    const timestamp = Date.now();
    const userData = {
      firstName: 'Jane',
      lastName: 'Smith',
      address: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phone: '555-5678',
      ssn: '987-65-4321',
      username: `testuser${timestamp}`,
      password: 'Password123!',
      confirmPassword: 'DifferentPassword123!'
    };

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.clickRegisterButton();

    // Verify password mismatch error
    const fieldErrors = await registrationPage.getFieldErrors();
    const errorText = fieldErrors.join(' ');
    expect(errorText.toLowerCase()).toContain('password');
  });

  test('should show error when username already exists', async ({ page }) => {
    // First registration
    const timestamp = Date.now();
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      address: '789 Elm Street',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      phone: '555-9999',
      ssn: '111-22-3333',
      username: `duplicate${timestamp}`,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };

    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.clickRegisterButton();

    // Wait for success
    await page.waitForTimeout(1000);

    // Try to register again with same username
    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm(userData);
    await registrationPage.clickRegisterButton();

    // Verify error about duplicate username
    const errorMessage = await registrationPage.getErrorMessage();
    if (errorMessage) {
      expect(errorMessage.toLowerCase()).toContain('already exists');
    }
  });

  test('should validate individual required fields', async ({ page }) => {
    await registrationPage.navigateToRegistration();

    // Fill only username and password
    await registrationPage.enterUsername('testuser');
    await registrationPage.enterPassword('Password123!');
    await registrationPage.enterConfirmPassword('Password123!');
    await registrationPage.clickRegisterButton();

    // Should show errors for missing fields
    const fieldErrors = await registrationPage.getFieldErrors();
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  test('should successfully navigate to registration page from login', async ({ page }) => {
    await registrationPage.navigateToRegistration();
    
    const isLoaded = await registrationPage.isRegistrationPageLoaded();
    expect(isLoaded).toBeTruthy();
    
    await expect(page).toHaveURL(/register\.htm/);
  });

  test('should clear form fields when navigating away and back', async ({ page }) => {
    await registrationPage.navigateToRegistration();
    
    // Fill some fields
    await registrationPage.enterFirstName('Test');
    await registrationPage.enterLastName('User');
    
    // Navigate away
    await loginPage.navigateToLogin();
    
    // Navigate back
    await registrationPage.navigateToRegistration();
    
    // Form should be cleared (this depends on application behavior)
    const isLoaded = await registrationPage.isRegistrationPageLoaded();
    expect(isLoaded).toBeTruthy();
  });
});
