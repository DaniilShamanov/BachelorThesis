/**
 * CRITICAL TEST COVERAGE: Transfer Funds Page
 * 
 * Why this is critical:
 * - Handles money movement between accounts - financial accuracy is critical
 * - Insufficient funds validation prevents overdrafts
 * - Transaction integrity must be maintained (atomic operations)
 * 
 * How it could fail if the application changes:
 * - Form field selectors change (dropdown IDs, input names)
 * - Validation logic changes (minimum transfer amount, fees added)
 * - Account selection mechanism changes (search, autocomplete)
 * - Confirmation message format changes
 * - Error handling changes (different error codes/messages)
 * - Transaction processing becomes asynchronous
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class TransferFundsPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly pageTitle = '#rightPanel h1';
  private static readonly amountInput = '#amount';
  private static readonly fromAccountSelect = '#fromAccountId';
  private static readonly toAccountSelect = '#toAccountId';
  private static readonly transferButton = 'input[type="submit"][value="Transfer"]';
  private static readonly confirmationMessage = '#rightPanel p';
  private static readonly errorMessage = '.error';
  private static readonly transferCompleteTitle = '#rightPanel h1';
  private static readonly amountConfirmation = '#amount';
  private static readonly fromAccountConfirmation = '#fromAccountId';
  private static readonly toAccountConfirmation = '#toAccountId';

  constructor(page: Page) {
    super(page);
  }

  // Implements: "navigate to transfer funds page"
  async navigateToTransferFunds(): Promise<void> {
    await this.page.goto('/parabank/transfer.htm');
    await this.waitForPageLoad();
  }

  // Implements: "click transfer funds link"
  async clickTransferFundsLink(): Promise<void> {
    await this.page.getByRole('link', { name: 'Transfer Funds' }).click();
    await this.waitForPageLoad();
  }

  // Implements: "verify transfer funds page is loaded"
  async isTransferFundsPageLoaded(): Promise<boolean> {
    return await this.page.locator(TransferFundsPage.pageTitle).isVisible();
  }

  // Implements: "enter transfer amount"
  async enterAmount(amount: string): Promise<void> {
    await this.page.locator(TransferFundsPage.amountInput).fill(amount);
  }

  // Implements: "select from account"
  async selectFromAccount(accountNumber: string): Promise<void> {
    await this.page.locator(TransferFundsPage.fromAccountSelect).selectOption({ label: accountNumber });
  }

  // Implements: "select from account by index"
  async selectFromAccountByIndex(index: number): Promise<void> {
    const options = await this.page.locator(TransferFundsPage.fromAccountSelect + ' option').allTextContents();
    if (index < options.length) {
      await this.page.locator(TransferFundsPage.fromAccountSelect).selectOption({ index: index });
    }
  }

  // Implements: "select to account"
  async selectToAccount(accountNumber: string): Promise<void> {
    await this.page.locator(TransferFundsPage.toAccountSelect).selectOption({ label: accountNumber });
  }

  // Implements: "select to account by index"
  async selectToAccountByIndex(index: number): Promise<void> {
    const options = await this.page.locator(TransferFundsPage.toAccountSelect + ' option').allTextContents();
    if (index < options.length) {
      await this.page.locator(TransferFundsPage.toAccountSelect).selectOption({ index: index });
    }
  }

  // Implements: "click transfer button"
  async clickTransferButton(): Promise<void> {
    await this.page.locator(TransferFundsPage.transferButton).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Implements: "perform complete transfer"
  async transferFunds(amount: string, fromAccountIndex: number, toAccountIndex: number): Promise<void> {
    await this.enterAmount(amount);
    await this.selectFromAccountByIndex(fromAccountIndex);
    await this.selectToAccountByIndex(toAccountIndex);
    await this.clickTransferButton();
  }

  // Implements: "get confirmation message"
  async getConfirmationMessage(): Promise<string | null> {
    const messageLocator = this.page.locator(TransferFundsPage.confirmationMessage).first();
    if (await messageLocator.isVisible()) {
      return await messageLocator.textContent();
    }
    return null;
  }

  // Implements: "verify transfer is successful"
  async isTransferSuccessful(): Promise<boolean> {
    const title = await this.page.locator(TransferFundsPage.transferCompleteTitle).textContent();
    return title?.includes('Transfer Complete') || false;
  }

  // Implements: "get error message"
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator(TransferFundsPage.errorMessage);
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent();
    }
    return null;
  }

  // Implements: "verify error message is visible"
  async isErrorMessageVisible(): Promise<boolean> {
    return await this.page.locator(TransferFundsPage.errorMessage).isVisible();
  }

  // Implements: "get available from accounts"
  async getFromAccountOptions(): Promise<string[]> {
    const options = await this.page.locator(TransferFundsPage.fromAccountSelect + ' option').allTextContents();
    return options.map((text: string) => text.trim());
  }

  // Implements: "get available to accounts"
  async getToAccountOptions(): Promise<string[]> {
    const options = await this.page.locator(TransferFundsPage.toAccountSelect + ' option').allTextContents();
    return options.map((text: string) => text.trim());
  }

  // Implements: "get selected from account"
  async getSelectedFromAccount(): Promise<string> {
    return await this.page.locator(TransferFundsPage.fromAccountSelect).inputValue();
  }

  // Implements: "get selected to account"
  async getSelectedToAccount(): Promise<string> {
    return await this.page.locator(TransferFundsPage.toAccountSelect).inputValue();
  }

  // Implements: "verify transfer button is enabled"
  async isTransferButtonEnabled(): Promise<boolean> {
    return await this.page.locator(TransferFundsPage.transferButton).isEnabled();
  }
}
