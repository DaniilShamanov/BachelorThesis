import { Page } from '@playwright/test';

/**
 * BasePage - Abstract base class for all page objects
 * Provides common functionality and ensures consistent patterns across all pages
 */
export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path
   * @param path - The path to navigate to (relative to base URL)
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Get the current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Check if an element is visible
   * @param selector - The selector to check
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Get text content of an element
   * @param selector - The selector to get text from
   */
  async getTextContent(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }
}
