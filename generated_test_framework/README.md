# Parabank Playwright Test Automation Framework

A comprehensive test automation framework for the Parabank application using Playwright and the Page Object Model (POM) design pattern.

## 🏗️ Framework Structure

```
playwright/
├── pages/                      # Page Object Model classes
│   ├── BasePage.ts            # Base class for all page objects
│   ├── LoginPage.ts           # Login page interactions
│   ├── RegistrationPage.ts    # User registration page
│   ├── AccountsOverviewPage.ts # Accounts overview page
│   ├── TransferFundsPage.ts   # Fund transfer page
│   └── BillPayPage.ts         # Bill payment page
├── tests/                      # Test specifications
│   ├── registration.spec.ts   # User registration tests
│   ├── login.spec.ts          # Login functionality tests
│   ├── accounts-overview.spec.ts # Account overview tests
│   ├── transfer-funds.spec.ts # Fund transfer tests
│   ├── bill-pay.spec.ts       # Bill payment tests
│   └── logout.spec.ts         # Logout functionality tests
├── playwright.config.ts        # Playwright configuration
├── package.json               # Project dependencies
└── README.md                  # This file
```

## 🎯 Test Coverage

### 1. User Registration Tests
- ✅ Successful registration with valid data
- ✅ Validation errors for missing required fields
- ✅ Password mismatch validation
- ✅ Duplicate username detection
- ✅ Individual field validation

### 2. Login Tests
- ✅ Successful login with valid credentials
- ✅ Error handling for invalid username
- ✅ Error handling for invalid password
- ✅ Empty credentials validation
- ✅ Session persistence after page refresh
- ✅ Security testing (SQL injection, XSS attempts)

### 3. Accounts Overview Tests
- ✅ Display accounts after login
- ✅ Verify account numbers
- ✅ Validate positive balances
- ✅ Check balance and available amount
- ✅ Verify total balance calculation
- ✅ Currency formatting validation
- ✅ Account details navigation

### 4. Fund Transfer Tests
- ✅ Successful fund transfer between accounts
- ✅ Balance updates verification
- ✅ Insufficient funds validation
- ✅ Zero and negative amount validation
- ✅ Decimal amount support
- ✅ Total balance consistency
- ✅ Multiple consecutive transfers
- ✅ Same account transfer prevention

### 5. Bill Payment Tests
- ✅ Successful bill payment
- ✅ Balance update after payment
- ✅ Empty payee name validation
- ✅ Required fields validation
- ✅ Account number mismatch detection
- ✅ Zero and negative amount validation
- ✅ Insufficient funds validation
- ✅ Multiple consecutive payments

### 6. Logout Tests
- ✅ Successful logout and redirect
- ✅ Protected page access prevention
- ✅ Session data clearing
- ✅ Re-login requirement
- ✅ Multiple logout attempts handling
- ✅ Cache prevention after logout
- ✅ Different user login after logout

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository or navigate to the project directory:
```bash
cd D:\Thesis\playwright
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

### Configuration

Create a `.env` file in the root directory (optional):
```env
BASE_URL=https://parabank.parasoft.com
TEST_USERNAME=your_username
TEST_PASSWORD=your_password
```

## 🧪 Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test suites
```bash
npm run test:registration
npm run test:login
npm run test:accounts
npm run test:transfer
npm run test:billpay
npm run test:logout
```

### Run tests on specific browsers
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### View test report
```bash
npm run report
```

## 📊 Test Reports

After running tests, reports are generated in the following formats:
- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **Screenshots**: Captured on test failure
- **Videos**: Recorded for failed tests
- **Traces**: Available for debugging failed tests

## 🏛️ Page Object Model Architecture

### Design Principles

1. **Separation of Concerns**: Page objects contain only page-specific logic
2. **Atomic Methods**: Each method performs a single, well-defined action
3. **Static Selectors**: All selectors are defined as `private static readonly` constants
4. **No Locator Imports**: Selectors are strings, not Playwright Locator objects
5. **Requirement Traceability**: Each method has a comment linking it to a requirement

### Example Page Object Structure

```typescript
export class LoginPage extends BasePage {
  // Selectors as static readonly constants
  private static readonly usernameInput = 'input[name="username"]';
  private static readonly passwordInput = 'input[name="password"]';
  private static readonly loginButton = 'input[type="submit"]';

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
}
```

## 🔍 Test Independence

All tests are designed to be:
- **Independent**: Each test can run in isolation
- **Idempotent**: Tests can be run multiple times with the same result
- **Parallel-safe**: Tests can run concurrently without conflicts
- **Self-contained**: Each test sets up its own test data

### Test Isolation Strategy
- Each test creates its own unique user account
- Timestamps are used to generate unique usernames
- No shared state between tests
- Clean setup in `beforeEach` hooks

## 🛡️ Critical Test Scenarios

### Why These Tests Are Critical

1. **Registration**: Entry point for new users; validates data integrity
2. **Login**: Security gateway; protects user accounts
3. **Accounts Overview**: Displays financial data; accuracy is paramount
4. **Fund Transfer**: Money movement; must be accurate and atomic
5. **Bill Payment**: External payments; legally important
6. **Logout**: Session security; prevents unauthorized access

### Potential Failure Points

- **Selector Changes**: HTML structure modifications
- **Validation Rule Changes**: New requirements or constraints
- **Flow Changes**: Multi-step processes, async operations
- **Message Changes**: Error/success text modifications
- **API Changes**: Backend endpoint modifications
- **Security Changes**: Authentication mechanism updates

## 🔧 Maintenance

### Updating Selectors
If the application UI changes, update selectors in the respective page object files:
```typescript
private static readonly loginButton = 'button[data-testid="login"]';
```

### Adding New Tests
1. Create a new test file in `tests/` directory
2. Import required page objects
3. Follow the existing test structure
4. Add test documentation comments

### Adding New Page Objects
1. Create a new page class in `pages/` directory
2. Extend `BasePage`
3. Define selectors as static readonly constants
4. Implement atomic methods with requirement comments

## 📝 Best Practices

1. **Use Explicit Waits**: Always wait for elements to be ready
2. **Avoid Hard-coded Waits**: Use `waitForLoadState` instead of `waitForTimeout`
3. **Descriptive Test Names**: Clearly describe what is being tested
4. **Assertions**: Use meaningful assertion messages
5. **Error Handling**: Expect and handle potential failures
6. **Data-driven Tests**: Use test data objects for complex forms
7. **Clean Code**: Follow TypeScript best practices

## 🐛 Debugging

### Debug a specific test
```bash
npx playwright test login.spec.ts --debug
```

### View trace for failed test
```bash
npx playwright show-trace trace.zip
```

### Generate code
```bash
npm run codegen
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Parabank Application](https://parabank.parasoft.com)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass before committing

## 📄 License

ISC

## 👥 Authors

Test Automation Framework for Parabank Application
