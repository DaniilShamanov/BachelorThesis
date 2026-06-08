/**
 * CRITICAL TEST COVERAGE: Accounts Overview Tests
 * 
 * Why these tests are critical:
 * - Displays user's financial data - accuracy is paramount
 * - Balance information drives financial decisions
 * - Incorrect totals could lead to overdrafts or financial losses
 * - Account list integrity affects all downstream operations
 * 
 * How these tests could fail if the application changes:
 * - Table structure/layout changes (HTML restructuring)
 * - Balance calculation logic changes
 * - Currency formatting changes
 * - Account types change (new types added)
 * - Pagination added for multiple accounts
 * - Real-time balance updates via WebSocket
 * - Account filtering/sorting features added
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { RegistrationPage } from '../pages/RegistrationPage';

test.describe('Accounts Overview', () => {
  let loginPage: LoginPage;
  let accountsPage: AccountsOverviewPage;
  let registrationPage: RegistrationPage;
  let testUsername: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    accountsPage = new AccountsOverviewPage(page);
    registrationPage = new RegistrationPage(page);

    // Create a new user for each test to ensure clean state
    const timestamp = Date.now();
    testUsername = `accounttest${timestamp}`;
    testPassword = 'TestPass123!';

    await loginPage.navigateToLogin();
    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'Account',
      lastName: 'Test',
      address: '123 Account St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-3333',
      ssn: '222-33-4444',
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

  test('should display accounts overview page after login', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const isLoaded = await accountsPage.isAccountsOverviewPageLoaded();
    expect(isLoaded).toBeTruthy();

    const pageTitle = await accountsPage.getPageTitle();
    expect(pageTitle).toContain('Accounts Overview');
  });

  test('should display at least one account for new user', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const accountCount = await accountsPage.getAccountCount();
    expect(accountCount).toBeGreaterThanOrEqual(1);
  });

  test('should display account numbers', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const accountNumbers = await accountsPage.getAccountNumbers();
    expect(accountNumbers.length).toBeGreaterThan(0);
    
    // Each account number should be numeric
    accountNumbers.forEach((accountNum: string) => {
      expect(accountNum).toMatch(/^\d+$/);
    });
  });

  test('should display positive balances for all accounts', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const balances = await accountsPage.getAllAccountBalances();
    expect(balances.length).toBeGreaterThan(0);

    // Verify all balances are positive
    balances.forEach((balance: string) => {
      const numericBalance = accountsPage.parseBalance(balance);
      expect(numericBalance).toBeGreaterThan(0);
    });
  });

  test('should verify all accounts have positive balance using helper method', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const allPositive = await accountsPage.allAccountsHavePositiveBalance();
    expect(allPositive).toBeTruthy();
  });

  test('should display balance and available amount for each account', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const accountsInfo = await accountsPage.getAllAccountsInfo();
    expect(accountsInfo.length).toBeGreaterThan(0);

    accountsInfo.forEach((account) => {
      expect(account.accountNumber).toBeTruthy();
      expect(account.balance).toBeTruthy();
      expect(account.availableAmount).toBeTruthy();
      
      // Balance and available should match for new accounts
      expect(account.balance).toBe(account.availableAmount);
    });
  });

  test('should display total balance', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const totalBalance = await accountsPage.getTotalBalance();
    expect(totalBalance).toBeTruthy();
    
    const numericTotal = accountsPage.parseBalance(totalBalance || '0');
    expect(numericTotal).toBeGreaterThan(0);
  });

  test('should display total available amount', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const totalAvailable = await accountsPage.getTotalAvailable();
    expect(totalAvailable).toBeTruthy();
    
    const numericTotal = accountsPage.parseBalance(totalAvailable || '0');
    expect(numericTotal).toBeGreaterThan(0);
  });

  test('should verify total balance equals sum of individual balances', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const balances = await accountsPage.getAllAccountBalances();
    const totalBalance = await accountsPage.getTotalBalance();
    
    // Calculate sum of individual balances
    let sum = 0;
    balances.forEach((balance: string) => {
      sum += accountsPage.parseBalance(balance);
    });
    
    const displayedTotal = accountsPage.parseBalance(totalBalance || '0');
    
    // Allow for small rounding differences
    expect(Math.abs(sum - displayedTotal)).toBeLessThan(0.01);
  });

  test('should display accounts table', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const isTableVisible = await accountsPage.isAccountsTableVisible();
    expect(isTableVisible).toBeTruthy();
  });

  test('should allow clicking on account number to view details', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const accountCount = await accountsPage.getAccountCount();
    if (accountCount > 0) {
      await accountsPage.clickAccountByIndex(0);
      
      // Should navigate to account details page
      await expect(page).toHaveURL(/activity\.htm/);
    }
  });

  test('should maintain account data after page refresh', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const accountsBefore = await accountsPage.getAllAccountsInfo();
    const totalBefore = await accountsPage.getTotalBalance();
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);
    
    const accountsAfter = await accountsPage.getAllAccountsInfo();
    const totalAfter = await accountsPage.getTotalBalance();
    
    // Data should remain the same
    expect(accountsAfter.length).toBe(accountsBefore.length);
    expect(totalAfter).toBe(totalBefore);
  });

  test('should format currency correctly', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const balances = await accountsPage.getAllAccountBalances();
    
    balances.forEach((balance: string) => {
      // Should contain dollar sign
      expect(balance).toContain('$');
      
      // Should be parseable as a number
      const numeric = accountsPage.parseBalance(balance);
      expect(numeric).not.toBeNaN();
    });
  });

  test('should not display negative balances for new accounts', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    
    const balances = await accountsPage.getAllAccountBalances();
    
    balances.forEach((balance: string) => {
      const numeric = accountsPage.parseBalance(balance);
      expect(numeric).toBeGreaterThanOrEqual(0);
    });
  });
});
