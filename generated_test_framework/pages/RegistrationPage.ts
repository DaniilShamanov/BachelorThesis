/**
 * CRITICAL TEST COVERAGE: User Registration Page
 * 
 * Why this is critical:
 * - Registration is the entry point for new users to access the system
 * - Validates data integrity and user account creation
 * - Ensures proper form validation and error handling
 * 
 * How it could fail if the application changes:
 * - Selector changes (input names, IDs, or structure modifications)
 * - Form validation rules change (new required fields, different error messages)
 * - Registration flow changes (multi-step process, email verification added)
 * - Success/error message text or location changes
 * - Backend API changes affecting registration endpoint
 */

import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegistrationPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly registerLink = 'a[href*="register.htm"]';
  private static readonly firstNameInput = 'input[id="customer.firstName"]';
  private static readonly lastNameInput = 'input[id="customer.lastName"]';
  private static readonly addressInput = 'input[id="customer.address.street"]';
  private static readonly cityInput = 'input[id="customer.address.city"]';
  private static readonly stateInput = 'input[id="customer.address.state"]';
  private static readonly zipCodeInput = 'input[id="customer.address.zipCode"]';
  private static readonly phoneInput = 'input[id="customer.phoneNumber"]';
  private static readonly ssnInput = 'input[id="customer.ssn"]';
  private static readonly usernameInput = 'input[id="customer.username"]';
  private static readonly passwordInput = 'input[id="customer.password"]';
  private static readonly confirmPasswordInput = 'input[id="repeatedPassword"]';
  private static readonly registerButton = 'input[value="Register"]';
  private static readonly successMessage = '#rightPanel p';
  private static readonly errorMessage = '.error';
  private static readonly fieldError = 'span.error';

  constructor(page: Page) {
    super(page);
  }

  // Implements: "navigate to registration page"
  async navigateToRegistration(): Promise<void> {
    await this.page.locator(RegistrationPage.registerLink).click();
    await this.waitForPageLoad();
  }

  // Implements: "enter first name"
  async enterFirstName(firstName: string): Promise<void> {
    await this.page.locator(RegistrationPage.firstNameInput).fill(firstName);
  }

  // Implements: "enter last name"
  async enterLastName(lastName: string): Promise<void> {
    await this.page.locator(RegistrationPage.lastNameInput).fill(lastName);
  }

  // Implements: "enter address"
  async enterAddress(address: string): Promise<void> {
    await this.page.locator(RegistrationPage.addressInput).fill(address);
  }

  // Implements: "enter city"
  async enterCity(city: string): Promise<void> {
    await this.page.locator(RegistrationPage.cityInput).fill(city);
  }

  // Implements: "enter state"
  async enterState(state: string): Promise<void> {
    await this.page.locator(RegistrationPage.stateInput).fill(state);
  }

  // Implements: "enter zip code"
  async enterZipCode(zipCode: string): Promise<void> {
    await this.page.locator(RegistrationPage.zipCodeInput).fill(zipCode);
  }

  // Implements: "enter phone number"
  async enterPhone(phone: string): Promise<void> {
    await this.page.locator(RegistrationPage.phoneInput).fill(phone);
  }

  // Implements: "enter SSN"
  async enterSSN(ssn: string): Promise<void> {
    await this.page.locator(RegistrationPage.ssnInput).fill(ssn);
  }

  // Implements: "enter username"
  async enterUsername(username: string): Promise<void> {
    await this.page.locator(RegistrationPage.usernameInput).fill(username);
  }

  // Implements: "enter password"
  async enterPassword(password: string): Promise<void> {
    await this.page.locator(RegistrationPage.passwordInput).fill(password);
  }

  // Implements: "enter confirm password"
  async enterConfirmPassword(confirmPassword: string): Promise<void> {
    await this.page.locator(RegistrationPage.confirmPasswordInput).fill(confirmPassword);
  }

  // Implements: "click register button"
  async clickRegisterButton(): Promise<void> {
    await this.page.locator(RegistrationPage.registerButton).click();
  }

  // Implements: "verify success message is displayed"
  async getSuccessMessage(): Promise<string | null> {
    return await this.page.locator(RegistrationPage.successMessage).first().textContent();
  }

  // Implements: "verify error message is displayed"
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator(RegistrationPage.errorMessage).first();
    if (await errorLocator.isVisible()) {
      return await errorLocator.textContent();
    }
    return null;
  }

  // Implements: "verify field validation errors"
  async getFieldErrors(): Promise<string[]> {
    const errors = await this.page.locator(RegistrationPage.fieldError).allTextContents();
    return errors.filter((error: string) => error.trim().length > 0);
  }

  // Implements: "check if success message is visible"
  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.page.locator(RegistrationPage.successMessage).first().isVisible();
  }

  // Implements: "complete full registration form"
  async fillRegistrationForm(userData: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    ssn: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    await this.enterFirstName(userData.firstName);
    await this.enterLastName(userData.lastName);
    await this.enterAddress(userData.address);
    await this.enterCity(userData.city);
    await this.enterState(userData.state);
    await this.enterZipCode(userData.zipCode);
    await this.enterPhone(userData.phone);
    await this.enterSSN(userData.ssn);
    await this.enterUsername(userData.username);
    await this.enterPassword(userData.password);
    await this.enterConfirmPassword(userData.confirmPassword);
  }

  // Implements: "verify registration page is loaded"
  async isRegistrationPageLoaded(): Promise<boolean> {
    return await this.page.locator(RegistrationPage.registerButton).isVisible();
  }
}
