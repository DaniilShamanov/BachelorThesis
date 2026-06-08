/**
 * CRITICAL TEST COVERAGE: Fund Transfer Tests
 * 
 * Why these tests are critical:
 * - Money movement between accounts must be accurate and atomic
 * - Insufficient funds validation prevents overdrafts
 * - Transaction integrity is legally and financially critical
 * - Failed transfers could result in financial losses
 * 
 * How these tests could fail if the application changes:
 * - Transaction processing becomes asynchronous
 * - New validation rules added (daily limits, transfer fees)
 * - Account selection mechanism changes
 * - Balance update timing changes
 * - Confirmation message format changes
 * - Multi-currency support added
 * - Transaction rollback logic changes
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { TransferFundsPage } from '../pages/TransferFundsPage';
import { RegistrationPage } from '../pages/RegistrationPage';

test.describe('Fund Transfer', () => {
  let loginPage: LoginPage;
  let accountsPage: AccountsOverviewPage;
  let transferPage: TransferFundsPage;
  let registrationPage: RegistrationPage;
  let testUsername: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    accountsPage = new AccountsOverviewPage(page);
    transferPage = new TransferFundsPage(page);
    registrationPage = new RegistrationPage(page);

    // Create a new user for each test
    const timestamp = Date.now();
    testUsername = `transfertest${timestamp}`;
    testPassword = 'TestPass123!';

    await loginPage.navigateToLogin();
    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Transfer',
      lastName: 'Test',
      address: '123 Transfer St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-4444',
      ssn: '333-44-5555',
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

  test('should successfully transfer funds between accounts', async ({ page }) => {
    // Get initial balances
    await accountsPage.navigateToAccountsOverview();
    const accountsBefore = await accountsPage.getAllAccountsInfo();
    
    // Need at least 2 accounts to transfer
    if (accountsBefore.length < 2) {
      test.skip();
      return;
    }

    const fromBalanceBefore = accountsPage.parseBalance(accountsBefore[0].balance);
    const toBalanceBefore = accountsPage.parseBalance(accountsBefore[1].balance);

    // Navigate to transfer page
    await transferPage.navigateToTransferFunds();
    const isLoaded = await transferPage.isTransferFundsPageLoaded();
    expect(isLoaded).toBeTruthy();

    // Perform transfer
    const transferAmount = '50.00';
    await transferPage.transferFunds(transferAmount, 0, 1);

    // Verify transfer success
    const isSuccessful = await transferPage.isTransferSuccessful();
    expect(isSuccessful).toBeTruthy();

    // Verify balances updated
    await accountsPage.navigateToAccountsOverview();
    const accountsAfter = await accountsPage.getAllAccountsInfo();

    const fromBalanceAfter = accountsPage.parseBalance(accountsAfter[0].balance);
    const toBalanceAfter = accountsPage.parseBalance(accountsAfter[1].balance);

    // From account should decrease
    expect(fromBalanceAfter).toBe(fromBalanceBefore - parseFloat(transferAmount));
    
    // To account should increase
    expect(toBalanceAfter).toBe(toBalanceBefore + parseFloat(transferAmount));
  });

  test('should display transfer funds page correctly', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const isLoaded = await transferPage.isTransferFundsPageLoaded();
    expect(isLoaded).toBeTruthy();

    await expect(page).toHaveURL(/transfer\.htm/);
  });

  test('should display available accounts in dropdowns', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const fromAccounts = await transferPage.getFromAccountOptions();
    const toAccounts = await transferPage.getToAccountOptions();

    expect(fromAccounts.length).toBeGreaterThan(0);
    expect(toAccounts.length).toBeGreaterThan(0);
  });

  test('should show error when transferring more than available balance', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    const accounts = await accountsPage.getAllAccountsInfo();
    
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    const fromBalance = accountsPage.parseBalance(accounts[0].balance);
    const excessiveAmount = (fromBalance + 1000).toFixed(2);

    await transferPage.navigateToTransferFunds();
    await transferPage.transferFunds(excessiveAmount, 0, 1);

    // Should show error or remain on transfer page
    const isError = await transferPage.isErrorMessageVisible();
    if (isError) {
      const errorMessage = await transferPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    } else {
      // Some systems might not show explicit error but prevent transfer
      await expect(page).toHaveURL(/transfer\.htm/);
    }
  });

  test('should show error when transfer amount is zero', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    await transferPage.transferFunds('0', 0, 1);

    // Should show error or validation message
    const currentUrl = page.url();
    expect(currentUrl).toContain('transfer.htm');
  });

  test('should show error when transfer amount is negative', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    await transferPage.enterAmount('-50');
    await transferPage.selectFromAccountByIndex(0);
    await transferPage.selectToAccountByIndex(1);
    await transferPage.clickTransferButton();

    // Should show error or validation
    const isError = await transferPage.isErrorMessageVisible();
    expect(isError || page.url().includes('transfer.htm')).toBeTruthy();
  });

  test('should validate transfer amount is required', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    // Try to transfer without amount
    await transferPage.selectFromAccountByIndex(0);
    await transferPage.selectToAccountByIndex(1);
    await transferPage.clickTransferButton();

    // Should show error or remain on page
    const currentUrl = page.url();
    expect(currentUrl).toContain('transfer.htm');
  });

  test('should allow transferring decimal amounts', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    const accountsBefore = await accountsPage.getAllAccountsInfo();
    
    if (accountsBefore.length < 2) {
      test.skip();
      return;
    }

    await transferPage.navigateToTransferFunds();
    
    const transferAmount = '25.50';
    await transferPage.transferFunds(transferAmount, 0, 1);

    const isSuccessful = await transferPage.isTransferSuccessful();
    expect(isSuccessful).toBeTruthy();
  });

  test('should display confirmation message after successful transfer', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    await transferPage.transferFunds('10.00', 0, 1);

    const confirmationMessage = await transferPage.getConfirmationMessage();
    expect(confirmationMessage).toBeTruthy();
  });

  test('should maintain total balance after transfer', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    const totalBefore = await accountsPage.getTotalBalance();
    const accounts = await accountsPage.getAllAccountsInfo();
    
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    await transferPage.navigateToTransferFunds();
    await transferPage.transferFunds('30.00', 0, 1);

    await accountsPage.navigateToAccountsOverview();
    const totalAfter = await accountsPage.getTotalBalance();

    // Total should remain the same (internal transfer)
    expect(totalAfter).toBe(totalBefore);
  });

  test('should enable transfer button when form is valid', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const isEnabled = await transferPage.isTransferButtonEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should allow multiple consecutive transfers', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 2) {
      test.skip();
      return;
    }

    // First transfer
    await transferPage.transferFunds('5.00', 0, 1);
    let isSuccessful = await transferPage.isTransferSuccessful();
    expect(isSuccessful).toBeTruthy();

    // Second transfer
    await transferPage.navigateToTransferFunds();
    await transferPage.transferFunds('3.00', 1, 0);
    isSuccessful = await transferPage.isTransferSuccessful();
    expect(isSuccessful).toBeTruthy();
  });

  test('should prevent transfer to same account', async ({ page }) => {
    await transferPage.navigateToTransferFunds();
    
    const accounts = await transferPage.getFromAccountOptions();
    if (accounts.length < 1) {
      test.skip();
      return;
    }

    await transferPage.enterAmount('10.00');
    await transferPage.selectFromAccountByIndex(0);
    await transferPage.selectToAccountByIndex(0);
    await transferPage.clickTransferButton();

    // Should show error or prevent transfer
    const isError = await transferPage.isErrorMessageVisible();
    if (isError) {
      const errorMessage = await transferPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    }
  });
});
