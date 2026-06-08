/**
 * CRITICAL TEST COVERAGE: Bill Payment Page
 * 
 * Why this is critical:
 * - Handles external payments - money leaving the system
 * - Payee information validation is crucial for correct payment routing
 * - Account balance must be verified before payment
 * - Payment confirmation is legally important
 * 
 * How it could fail if the application changes:
 * - Form structure changes (new required fields, field reordering)
 * - Validation rules change (minimum payment, payee verification)
 * - Account selection mechanism changes
 * - Payment processing becomes asynchronous
 * - Confirmation format changes
 * - Error messages change
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface PayeeInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  accountNumber: string;
  verifyAccount: string;
  amount: string;
}

export class BillPayPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly pageTitle = '#rightPanel h1';
  private static readonly payeeNameInput = 'input[name="payee.name"]';
  private static readonly payeeAddressInput = 'input[name="payee.address.street"]';
  private static readonly payeeCityInput = 'input[name="payee.address.city"]';
  private static readonly payeeStateInput = 'input[name="payee.address.state"]';
  private static readonly payeeZipCodeInput = 'input[name="payee.address.zipCode"]';
  private static readonly payeePhoneInput = 'input[name="payee.phoneNumber"]';
  private static readonly payeeAccountInput = 'input[name="payee.accountNumber"]';
  private static readonly verifyAccountInput = 'input[name="verifyAccount"]';
  private static readonly amountInput = 'input[name="amount"]';
  private static readonly fromAccountSelect = 'select[name="fromAccountId"]';
  private static readonly sendPaymentButton = 'input[type="submit"][value="Send Payment"]';
  private static readonly confirmationMessage = '#rightPanel p';
  private static readonly errorMessage = '.error';
  private static readonly fieldError = 'span.error';
  private static readonly paymentCompleteTitle = '#rightPanel h1';

  constructor(page: Page) {
    super(page);
  }

  // Implements: "navigate to bill pay page"
  async navigateToBillPay(): Promise<void> {
    await this.page.goto('/parabank/billpay.htm');
    await this.waitForPageLoad();
  }

  // Implements: "click bill pay link"
  async clickBillPayLink(): Promise<void> {
    await this.page.getByRole('link', { name: 'Bill Pay' }).click();
    await this.waitForPageLoad();
  }

  // Implements: "verify bill pay page is loaded"
  async isBillPayPageLoaded(): Promise<boolean> {
    return await this.page.locator(BillPayPage.pageTitle).isVisible();
  }

  // Implements: "enter payee name"
  async enterPayeeName(name: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeNameInput).fill(name);
  }

  // Implements: "enter payee address"
  async enterPayeeAddress(address: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeAddressInput).fill(address);
  }

  // Implements: "enter payee city"
  async enterPayeeCity(city: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeCityInput).fill(city);
  }

  // Implements: "enter payee state"
  async enterPayeeState(state: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeStateInput).fill(state);
  }

  // Implements: "enter payee zip code"
  async enterPayeeZipCode(zipCode: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeZipCodeInput).fill(zipCode);
  }

  // Implements: "enter payee phone"
  async enterPayeePhone(phone: string): Promise<void> {
    await this.page.locator(BillPayPage.payeePhoneInput).fill(phone);
  }

  // Implements: "enter payee account number"
  async enterPayeeAccount(accountNumber: string): Promise<void> {
    await this.page.locator(BillPayPage.payeeAccountInput).fill(accountNumber);
  }

  // Implements: "enter verify account number"
  async enterVerifyAccount(accountNumber: string): Promise<void> {
    await this.page.locator(BillPayPage.verifyAccountInput).fill(accountNumber);
  }

  // Implements: "enter payment amount"
  async enterAmount(amount: string): Promise<void> {
    await this.page.locator(BillPayPage.amountInput).fill(amount);
  }

  // Implements: "select from account"
  async selectFromAccount(accountNumber: string): Promise<void> {
    await this.page.locator(BillPayPage.fromAccountSelect).selectOption({ label: accountNumber });
  }

  // Implements: "select from account by index"
  async selectFromAccountByIndex(index: number): Promise<void> {
    const options = await this.page.locator(BillPayPage.fromAccountSelect + ' option').allTextContents();
    if (index < options.length) {
      await this.page.locator(BillPayPage.fromAccountSelect).selectOption({ index: index });
    }
  }

  // Implements: "click send payment button"
  async clickSendPaymentButton(): Promise<void> {
    await this.page.locator(BillPayPage.sendPaymentButton).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Implements: "fill complete payee information"
  async fillPayeeInfo(payeeInfo: PayeeInfo): Promise<void> {
    await this.enterPayeeName(payeeInfo.name);
    await this.enterPayeeAddress(payeeInfo.address);
    await this.enterPayeeCity(payeeInfo.city);
    await this.enterPayeeState(payeeInfo.state);
    await this.enterPayeeZipCode(payeeInfo.zipCode);
    await this.enterPayeePhone(payeeInfo.phone);
    await this.enterPayeeAccount(payeeInfo.accountNumber);
    await this.enterVerifyAccount(payeeInfo.verifyAccount);
    await this.enterAmount(payeeInfo.amount);
  }

  // Implements: "perform complete bill payment"
  async payBill(payeeInfo: PayeeInfo, fromAccountIndex: number): Promise<void> {
    await this.fillPayeeInfo(payeeInfo);
    await this.selectFromAccountByIndex(fromAccountIndex);
    await this.clickSendPaymentButton();
  }

  // Implements: "get confirmation message"
  async getConfirmationMessage(): Promise<string | null> {
    const messageLocator = this.page.locator(BillPayPage.confirmationMessage).first();
    if (await messageLocator.isVisible()) {
      return await messageLocator.textContent();
    }
    return null;
  }

  // Implements: "verify payment is successful"
  async isPaymentSuccessful(): Promise<boolean> {
    const title = await this.page.locator(BillPayPage.paymentCompleteTitle).textContent();
    return title?.includes('Bill Payment Complete') || false;
  }

  // Implements: "get error message"
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator(BillPayPage.errorMessage);
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent();
    }
    return null;
  }

  // Implements: "verify error message is visible"
  async isErrorMessageVisible(): Promise<boolean> {
    return await this.page.locator(BillPayPage.errorMessage).isVisible();
  }

  // Implements: "get field validation errors"
  async getFieldErrors(): Promise<string[]> {
    const errors = await this.page.locator(BillPayPage.fieldError).allTextContents();
    return errors.filter((error: string) => error.trim().length > 0);
  }

  // Implements: "get available accounts"
  async getAvailableAccounts(): Promise<string[]> {
    const options = await this.page.locator(BillPayPage.fromAccountSelect + ' option').allTextContents();
    return options.map((text: string) => text.trim());
  }

  // Implements: "verify send payment button is enabled"
  async isSendPaymentButtonEnabled(): Promise<boolean> {
    return await this.page.locator(BillPayPage.sendPaymentButton).isEnabled();
  }

  // Implements: "clear payee name field"
  async clearPayeeName(): Promise<void> {
    await this.page.locator(BillPayPage.payeeNameInput).clear();
  }

  // Implements: "get page title"
  async getPageTitle(): Promise<string | null> {
    return await this.page.locator(BillPayPage.pageTitle).textContent();
  }
}
