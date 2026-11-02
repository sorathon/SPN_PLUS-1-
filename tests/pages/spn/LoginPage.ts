import { Page, Locator, expect } from '@playwright/test'

/**
 * ShippingNet Pluz+ sign-in form (`login.php`).
 *
 * After a successful login the URL stays on `login.php`: the page becomes a
 * shell whose content lives in the `infrm` iframe (home.php?UID=…&UCODE=…).
 * One account = one session — a new login invalidates the previous UCODE.
 */
export class LoginPage {
  readonly page: Page
  readonly username: Locator
  readonly password: Locator
  readonly submit: Locator
  readonly contentFrame: Locator

  constructor(page: Page) {
    this.page = page
    this.username = page.locator('#user')
    this.password = page.locator('#passwd')
    this.submit = page.getByRole('button', { name: 'Login' })
    this.contentFrame = page.locator('iframe[name="infrm"]')
  }

  async login(username: string, password: string) {
    await this.username.fill(username)
    await this.password.fill(password)
    await this.submit.click()
    await expect(this.contentFrame, 'Login · home shell iframe is loaded').toHaveAttribute('src', /home\.php\?UID=\d+&UCODE=/, {
      timeout: 30_000,
    })
  }
}
