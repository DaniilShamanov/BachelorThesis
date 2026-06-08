/**
 * CRITICAL TEST COVERAGE: Accounts Overview Page
 * 
 * Why this is critical:
 * - Displays user's financial data - accuracy is paramount
 * - Entry point to all account-related operations
 * - Balance information must be correct for financial decisions
 * 
 * How it could fail if the application changes:
 * - Table structure changes (different HTML layout)
 * - Account number format changes
 * - Balance display format changes (currency symbol, decimal places)
 * - New account types added with different display logic
 * - Pagination added for users with many accounts
 * - Dynamic loading/AJAX updates change timing
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface AccountInfo {
  accountNumber: string;
  balance: string;
  availableAmount: string;
}

export class AccountsOverviewPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly pageTitle = '#rightPanel h1';
  private static readonly accountsTable = '#accountTable';
  private static readonly accountRow = '#accountTable tbody tr';
  private static readonly accountLink = 'td:first-child a';
  private static readonly balanceCell = 'td:nth-child(2)';
  private static readonly availableAmountCell = 'td:nth-child(3)';
  private static readonly totalBalance = '#accountTable tfoot tr:first-child td:nth-child(2)';
  private static readonly totalAvailable = '#accountTable tfoot tr:last-child td:nth-child(2)';

  constructor(page: Page) {
    super(page);
  }

  // Implements: "navigate to accounts overview"
  async navigateToAccountsOverview(): Promise<void> {
    await this.page.goto('/parabank/overview.htm');
    await this.waitForPageLoad();
  }

  // Implements: "verify accounts overview page is loaded"
  async isAccountsOverviewPageLoaded(): Promise<boolean> {
    return await this.page.locator(AccountsOverviewPage.pageTitle).isVisible();
  }

  // Implements: "get page title"
  async getPageTitle(): Promise<string | null> {
    return await this.page.locator(AccountsOverviewPage.pageTitle).textContent();
  }

  // Implements: "get number of accounts"
  async getAccountCount(): Promise<number> {
    const rows = await this.page.locator(AccountsOverviewPage.accountRow).count();
    return rows;
  }

  // Implements: "get all account numbers"
  async getAccountNumbers(): Promise<string[]> {
    const accountLinks = await this.page.locator(AccountsOverviewPage.accountRow + ' ' + AccountsOverviewPage.accountLink).allTextContents();
    return accountLinks.map((text: string) => text.trim());
  }

  // Implements: "get account balance by index"
  async getAccountBalance(index: number): Promise<string | null> {
    const row = this.page.locator(AccountsOverviewPage.accountRow).nth(index);
    return await row.locator(AccountsOverviewPage.balanceCell).textContent();
  }

  // Implements: "get all account balances"
  async getAllAccountBalances(): Promise<string[]> {
    const balances = await this.page.locator(AccountsOverviewPage.accountRow + ' ' + AccountsOverviewPage.balanceCell).allTextContents();
    return balances.map((text: string) => text.trim());
  }

  // Implements: "get available amount by index"
  async getAvailableAmount(index: number): Promise<string | null> {
    const row = this.page.locator(AccountsOverviewPage.accountRow).nth(index);
    return await row.locator(AccountsOverviewPage.availableAmountCell).textContent();
  }

  // Implements: "get all accounts information"
  async getAllAccountsInfo(): Promise<AccountInfo[]> {
    const count = await this.getAccountCount();
    const accounts: AccountInfo[] = [];

    for (let i = 0; i < count; i++) {
      const row = this.page.locator(AccountsOverviewPage.accountRow).nth(i);
      const accountNumber = await row.locator(AccountsOverviewPage.accountLink).textContent();
      const balance = await row.locator(AccountsOverviewPage.balanceCell).textContent();
      const availableAmount = await row.locator(AccountsOverviewPage.availableAmountCell).textContent();

      accounts.push({
        accountNumber: accountNumber?.trim() || '',
        balance: balance?.trim() || '',
        availableAmount: availableAmount?.trim() || ''
      });
    }

    return accounts;
  }

  // Implements: "get total balance"
  async getTotalBalance(): Promise<string | null> {
    return await this.page.locator(AccountsOverviewPage.totalBalance).textContent();
  }

  // Implements: "get total available amount"
  async getTotalAvailable(): Promise<string | null> {
    return await this.page.locator(AccountsOverviewPage.totalAvailable).textContent();
  }

  // Implements: "click on account by index"
  async clickAccountByIndex(index: number): Promise<void> {
    const row = this.page.locator(AccountsOverviewPage.accountRow).nth(index);
    await row.locator(AccountsOverviewPage.accountLink).click();
    await this.waitForPageLoad();
  }

  // Implements: "click on account by account number"
  async clickAccountByNumber(accountNumber: string): Promise<void> {
    await this.page.locator(`a:has-text("${accountNumber}")`).click();
    await this.waitForPageLoad();
  }

  // Implements: "verify all accounts have positive balance"
  async allAccountsHavePositiveBalance(): Promise<boolean> {
    const balances = await this.getAllAccountBalances();
    
    for (const balance of balances) {
      const numericBalance = this.parseBalance(balance);
      if (numericBalance <= 0) {
        return false;
      }
    }
    
    return true;
  }

  // Implements: "parse balance string to number"
  parseBalance(balanceString: string): number {
    // Remove currency symbols and convert to number
    const cleaned = balanceString.replace(/[$,]/g, '').trim();
    return parseFloat(cleaned);
  }

  // Implements: "verify accounts table is visible"
  async isAccountsTableVisible(): Promise<boolean> {
    return await this.page.locator(AccountsOverviewPage.accountsTable).isVisible();
  }
}
