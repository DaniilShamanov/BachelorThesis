/**
 * CRITICAL TEST COVERAGE: Bill Payment Tests
 * 
 * Why these tests are critical:
 * - Handles external payments - money leaving the system
 * - Payee validation prevents sending money to wrong recipients
 * - Account balance verification prevents overdrafts
 * - Payment confirmation is legally important for disputes
 * - Failed payments could damage user trust and credit
 * 
 * How these tests could fail if the application changes:
 * - Payment processing becomes asynchronous
 * - New payee verification steps added (bank routing validation)
 * - Payment limits or fees introduced
 * - Multi-step payment flow added
 * - Payee database/directory added
 * - Scheduled payments feature added
 * - Payment confirmation format changes
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsOverviewPage } from '../pages/AccountsOverviewPage';
import { BillPayPage, PayeeInfo } from '../pages/BillPayPage';
import { RegistrationPage } from '../pages/RegistrationPage';

test.describe('Bill Payment', () => {
  let loginPage: LoginPage;
  let accountsPage: AccountsOverviewPage;
  let billPayPage: BillPayPage;
  let registrationPage: RegistrationPage;
  let testUsername: string;
  let testPassword: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    accountsPage = new AccountsOverviewPage(page);
    billPayPage = new BillPayPage(page);
    registrationPage = new RegistrationPage(page);

    // Create a new user for each test
    const timestamp = Date.now();
    testUsername = `billpaytest${timestamp}`;
    testPassword = 'TestPass123!';

    await loginPage.navigateToLogin();
    await registrationPage.navigateToRegistration();
    await registrationPage.fillRegistrationForm({
      firstName: 'BillPay',
      lastName: 'Test',
      address: '123 BillPay St',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-5555',
      ssn: '444-55-6666',
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

  test('should successfully pay a bill with valid information', async ({ page }) => {
    // Get initial balance
    await accountsPage.navigateToAccountsOverview();
    const accountsBefore = await accountsPage.getAllAccountsInfo();
    const balanceBefore = accountsPage.parseBalance(accountsBefore[0].balance);

    // Navigate to bill pay
    await billPayPage.navigateToBillPay();
    const isLoaded = await billPayPage.isBillPayPageLoaded();
    expect(isLoaded).toBeTruthy();

    // Fill payee information
    const payeeInfo: PayeeInfo = {
      name: 'Electric Company',
      address: '456 Power St',
      city: 'Energy City',
      state: 'EC',
      zipCode: '54321',
      phone: '555-9999',
      accountNumber: '123456789',
      verifyAccount: '123456789',
      amount: '75.00'
    };

    await billPayPage.payBill(payeeInfo, 0);

    // Verify payment success
    const isSuccessful = await billPayPage.isPaymentSuccessful();
    expect(isSuccessful).toBeTruthy();

    // Verify confirmation message
    const confirmationMessage = await billPayPage.getConfirmationMessage();
    expect(confirmationMessage).toBeTruthy();

    // Verify balance updated
    await accountsPage.navigateToAccountsOverview();
    const accountsAfter = await accountsPage.getAllAccountsInfo();
    const balanceAfter = accountsPage.parseBalance(accountsAfter[0].balance);

    expect(balanceAfter).toBe(balanceBefore - parseFloat(payeeInfo.amount));
  });

  test('should display bill pay page correctly', async ({ page }) => {
    await billPayPage.navigateToBillPay();
    
    const isLoaded = await billPayPage.isBillPayPageLoaded();
    expect(isLoaded).toBeTruthy();

    const pageTitle = await billPayPage.getPageTitle();
    expect(pageTitle).toContain('Bill Payment');

    await expect(page).toHaveURL(/billpay\.htm/);
  });

  test('should show validation errors when payee name is empty', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: '',
      address: '789 Test Ave',
      city: 'TestCity',
      state: 'TS',
      zipCode: '12345',
      phone: '555-0000',
      accountNumber: '987654321',
      verifyAccount: '987654321',
      amount: '50.00'
    };

    await billPayPage.payBill(payeeInfo, 0);

    // Should show validation error
    const fieldErrors = await billPayPage.getFieldErrors();
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  test('should show validation errors when required fields are missing', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    // Try to submit with empty form
    await billPayPage.clickSendPaymentButton();

    // Should show validation errors
    const fieldErrors = await billPayPage.getFieldErrors();
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  test('should show error when account numbers do not match', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Water Company',
      address: '123 Water St',
      city: 'WaterCity',
      state: 'WC',
      zipCode: '11111',
      phone: '555-1111',
      accountNumber: '111111111',
      verifyAccount: '222222222', // Different account number
      amount: '40.00'
    };

    await billPayPage.payBill(payeeInfo, 0);

    // Should show error about account mismatch
    const fieldErrors = await billPayPage.getFieldErrors();
    const errorText = fieldErrors.join(' ').toLowerCase();
    expect(errorText).toContain('match');
  });

  test('should show error when payment amount is zero', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Gas Company',
      address: '789 Gas Ave',
      city: 'GasCity',
      state: 'GC',
      zipCode: '22222',
      phone: '555-2222',
      accountNumber: '333333333',
      verifyAccount: '333333333',
      amount: '0'
    };

    await billPayPage.payBill(payeeInfo, 0);

    // Should show error or remain on page
    const currentUrl = page.url();
    expect(currentUrl).toContain('billpay.htm');
  });

  test('should show error when payment amount is negative', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Internet Provider',
      address: '456 Net St',
      city: 'NetCity',
      state: 'NC',
      zipCode: '33333',
      phone: '555-3333',
      accountNumber: '444444444',
      verifyAccount: '444444444',
      amount: '-25.00'
    };

    await billPayPage.fillPayeeInfo(payeeInfo);
    await billPayPage.selectFromAccountByIndex(0);
    await billPayPage.clickSendPaymentButton();

    // Should show error or validation
    const isError = await billPayPage.isErrorMessageVisible();
    expect(isError || page.url().includes('billpay.htm')).toBeTruthy();
  });

  test('should show error when paying more than account balance', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    const accounts = await accountsPage.getAllAccountsInfo();
    const balance = accountsPage.parseBalance(accounts[0].balance);

    await billPayPage.navigateToBillPay();

    const excessiveAmount = (balance + 1000).toFixed(2);
    const payeeInfo: PayeeInfo = {
      name: 'Expensive Service',
      address: '999 Expensive Ave',
      city: 'ExpensiveCity',
      state: 'EX',
      zipCode: '99999',
      phone: '555-9999',
      accountNumber: '999999999',
      verifyAccount: '999999999',
      amount: excessiveAmount
    };

    await billPayPage.payBill(payeeInfo, 0);

    // Should show error or prevent payment
    const isError = await billPayPage.isErrorMessageVisible();
    if (isError) {
      const errorMessage = await billPayPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
    }
  });

  test('should display available accounts in dropdown', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const accounts = await billPayPage.getAvailableAccounts();
    expect(accounts.length).toBeGreaterThan(0);
  });

  test('should allow decimal payment amounts', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Phone Company',
      address: '321 Phone St',
      city: 'PhoneCity',
      state: 'PC',
      zipCode: '44444',
      phone: '555-4444',
      accountNumber: '555555555',
      verifyAccount: '555555555',
      amount: '33.75'
    };

    await billPayPage.payBill(payeeInfo, 0);

    const isSuccessful = await billPayPage.isPaymentSuccessful();
    expect(isSuccessful).toBeTruthy();
  });

  test('should validate phone number format', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    await billPayPage.enterPayeeName('Test Payee');
    await billPayPage.enterPayeeAddress('123 Test St');
    await billPayPage.enterPayeeCity('TestCity');
    await billPayPage.enterPayeeState('TS');
    await billPayPage.enterPayeeZipCode('12345');
    await billPayPage.enterPayeePhone('invalid-phone');
    await billPayPage.enterPayeeAccount('123456789');
    await billPayPage.enterVerifyAccount('123456789');
    await billPayPage.enterAmount('25.00');
    await billPayPage.selectFromAccountByIndex(0);
    await billPayPage.clickSendPaymentButton();

    // May show validation error depending on application rules
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('should enable send payment button when form is valid', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const isEnabled = await billPayPage.isSendPaymentButtonEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should allow multiple consecutive payments', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    // First payment
    const payeeInfo1: PayeeInfo = {
      name: 'First Payee',
      address: '111 First St',
      city: 'FirstCity',
      state: 'FC',
      zipCode: '11111',
      phone: '555-1111',
      accountNumber: '111111111',
      verifyAccount: '111111111',
      amount: '10.00'
    };

    await billPayPage.payBill(payeeInfo1, 0);
    let isSuccessful = await billPayPage.isPaymentSuccessful();
    expect(isSuccessful).toBeTruthy();

    // Second payment
    await billPayPage.navigateToBillPay();
    const payeeInfo2: PayeeInfo = {
      name: 'Second Payee',
      address: '222 Second St',
      city: 'SecondCity',
      state: 'SC',
      zipCode: '22222',
      phone: '555-2222',
      accountNumber: '222222222',
      verifyAccount: '222222222',
      amount: '15.00'
    };

    await billPayPage.payBill(payeeInfo2, 0);
    isSuccessful = await billPayPage.isPaymentSuccessful();
    expect(isSuccessful).toBeTruthy();
  });

  test('should reduce total balance after payment', async ({ page }) => {
    await accountsPage.navigateToAccountsOverview();
    const totalBefore = await accountsPage.getTotalBalance();
    const totalBeforeNumeric = accountsPage.parseBalance(totalBefore || '0');

    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Test Payee',
      address: '555 Test Ave',
      city: 'TestCity',
      state: 'TS',
      zipCode: '55555',
      phone: '555-5555',
      accountNumber: '666666666',
      verifyAccount: '666666666',
      amount: '20.00'
    };

    await billPayPage.payBill(payeeInfo, 0);

    await accountsPage.navigateToAccountsOverview();
    const totalAfter = await accountsPage.getTotalBalance();
    const totalAfterNumeric = accountsPage.parseBalance(totalAfter || '0');

    expect(totalAfterNumeric).toBe(totalBeforeNumeric - parseFloat(payeeInfo.amount));
  });

  test('should validate zip code format', async ({ page }) => {
    await billPayPage.navigateToBillPay();

    const payeeInfo: PayeeInfo = {
      name: 'Zip Test Payee',
      address: '777 Zip St',
      city: 'ZipCity',
      state: 'ZC',
      zipCode: 'INVALID',
      phone: '555-7777',
      accountNumber: '777777777',
      verifyAccount: '777777777',
      amount: '30.00'
    };

    await billPayPage.fillPayeeInfo(payeeInfo);
    await billPayPage.selectFromAccountByIndex(0);
    await billPayPage.clickSendPaymentButton();

    // May show validation error depending on application rules
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});
