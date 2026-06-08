/**
 * CRITICAL TEST COVERAGE: Login Page
 * 
 * Why this is critical:
 * - Authentication is the gateway to all protected features
 * - Security vulnerabilities could expose user accounts
 * - Failed login handling affects user experience
 * 
 * How it could fail if the application changes:
 * - Login form selector changes (input names, IDs)
 * - Authentication mechanism changes (OAuth, SSO, 2FA added)
 * - Error message text or structure changes
 * - Session management changes
 * - Login button text or type changes
 * - Redirect behavior after login changes
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly usernameInput = 'input[name="username"]';
  private static readonly passwordInput = 'input[name="password"]';
  private static readonly loginButton = 'input[type="submit"][value="Log In"]';
  private static readonly errorMessage = '.error';
  private static readonly logoutLink = 'a[href*="logout.htm"]';
  private static readonly accountsOverviewLink = 'a[href*="overview.htm"]';
  private static readonly welcomeMessage = '.smallText';

  constructor(page: Page) {
    super(page);
  }

  // Implements: "navigate to login page"
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/parabank/index.htm');
    await this.waitForPageLoad();
  }

  // Implements: "enter username"
  async enterUsername(username: string): Promise<void> {
    await this.page.locator(LoginPage.usernameInput).fill(username);
  }

  // Implements: "enter password"
  async enterPassword(password: string): Promise<void> {
    await this.page.locator(LoginPage.passwordInput).fill(password);
  }

  // Implements: "click login button"
  async clickLoginButton(): Promise<void> {
    await this.page.locator(LoginPage.loginButton).click();
  }

  // Implements: "perform complete login"
  async login(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Implements: "verify error message is displayed"
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator(LoginPage.errorMessage);
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent();
    }
    return null;
  }

  // Implements: "verify error message is visible"
  async isErrorMessageVisible(): Promise<boolean> {
    return await this.page.locator(LoginPage.errorMessage).isVisible();
  }

  // Implements: "verify user is logged in"
  async isLoggedIn(): Promise<boolean> {
    return await this.page.locator(LoginPage.logoutLink).isVisible();
  }

  // Implements: "verify welcome message is displayed"
  async getWelcomeMessage(): Promise<string | null> {
    const welcomeLocator = this.page.locator(LoginPage.welcomeMessage);
    if (await welcomeLocator.isVisible()) {
      return await welcomeLocator.textContent();
    }
    return null;
  }

  // Implements: "click logout"
  async logout(): Promise<void> {
    await this.page.locator(LoginPage.logoutLink).click();
    await this.waitForPageLoad();
  }

  // Implements: "verify login form is visible"
  async isLoginFormVisible(): Promise<boolean> {
    const usernameVisible = await this.page.locator(LoginPage.usernameInput).isVisible();
    const passwordVisible = await this.page.locator(LoginPage.passwordInput).isVisible();
    const buttonVisible = await this.page.locator(LoginPage.loginButton).isVisible();
    return usernameVisible && passwordVisible && buttonVisible;
  }

  // Implements: "clear username field"
  async clearUsername(): Promise<void> {
    await this.page.locator(LoginPage.usernameInput).clear();
  }

  // Implements: "clear password field"
  async clearPassword(): Promise<void> {
    await this.page.locator(LoginPage.passwordInput).clear();
  }
}
