// Shared lookup helpers. Page objects choose fields; these helpers preserve each module's selection policy.
import { Page, FrameLocator, Locator, Request, Response, expect } from '@playwright/test'
import { ajax } from '../pages/spn/SpnApp'

/** A value as a CSS string — customer codes can hold `\` or `"` (seen on a site: a code of backslashes). */
function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * The app's autocomplete (header, invoice and item forms): typing in a code field
 * fires a $.get on keyup and renders the result into `#popupDiv` as a table of
 * radio buttons `input[name="selList"]`. A person picks a row with ↓/mouse and
 * confirms with Enter — the radio's onkeypress copies its value into the field.
 */
export class Autocomplete {
  readonly page: Page
  readonly popup: Locator

  constructor(page: Page, scope: FrameLocator) {
    this.page = page
    this.popup = scope.locator('#popupDiv')
  }

  option(value: string): Locator {
    return this.popup.locator(`input[name="selList"][value="${cssString(value)}"]`)
  }

  /** Every suggestion's value, in the order shown. */
  async optionValues(): Promise<string[]> {
    return this.popup.locator('input[name="selList"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
  }

  /** Text of the suggestion row (code + name columns). */
  rowOf(value: string): Locator {
    return this.popup.locator(`tr:has(input[name="selList"][value="${cssString(value)}"])`)
  }

  /**
   * Type `text` like a user and wait for the suggestion list of the LAST keystroke.
   * Every keystroke fires a lookup and the popup shows whichever answer arrives last,
   * so the earlier lookups are let finish first, then the one for the full text is awaited.
   * Now and then a keystroke fires no lookup (seen on the item form right after it loads);
   * like a user, the text is then typed again — up to 3 times.
   */
  async type(field: Locator, text: string) {
    for (let attempt = 1; ; attempt++) {
      // leaving the previous field fires its own check (e.g. vessel/country on blur);
      // its answer can hide the popup, so let it land before typing here
      await ajax(this.page).idle()
      await field.click()
      await field.fill('')
      await field.pressSequentially(text.slice(0, -1), { delay: 60 })
      await ajax(this.page).idle()
      const lookup = this.page.waitForResponse(
        (r) => {
          if (!r.url().includes('data_defaulttemplate.php')) return false
          if ([...new URL(r.url()).searchParams.values()].includes(text)) return true
          // Import Item master lookups can post the keyword instead of putting it in the URL.
          try { return Object.values(r.request().postDataJSON() ?? {}).some(value => value === text) }
          catch { return false }
        },
        { timeout: 8_000 },
      )
      await field.press(text.slice(-1))
      try {
        await lookup
        break
      } catch (e) {
        if (attempt >= 3) throw e
      }
    }
    await ajax(this.page).idle()
  }

  /**
   * Type until `option` is shown. A late answer of another field's lookup can hide the
   * popup right after it opened; a user would type again — so do we, up to 3 times.
   * (The retry branch is rare; the happy path never waits on it.)
   */
  private async typeUntilListed(field: Locator, text: string, option: Locator) {
    for (let attempt = 1; ; attempt++) {
      await this.type(field, text)
      try {
        await option.waitFor({ state: 'visible', timeout: 5_000 })
        return
      } catch (e) {
        if (attempt >= 3) throw e
      }
    }
  }

  /**
   * Type `text` (default "%" = show all) and pick the first suggestion with a nonblank code — for customer data
   * (importer, consignor, vessel) that differs per customer site, so no code is hard-coded.
   * Returns the code picked.
   */
  async pickFirst(field: Locator, text = '%'): Promise<string> {
    // Some sites list a company with an empty code first. Selecting it cannot load
    // its master data. Keep valid codes such as "0", but skip empty/whitespace codes.
    const first = this.popup.locator('xpath=.//input[@name="selList" and normalize-space(@value)!=""]').first()
    await this.typeUntilListed(field, text, first)
    await expect(first, `Autocomplete · "${text}" lists a record with a nonblank code`).toBeVisible()
    const value = (await first.getAttribute('value')) ?? ''
    await first.focus()
    await first.press('Enter')
    await expect(field, `Autocomplete · field takes "${value}"`).toHaveValue(value)
    await ajax(this.page).idle()
    return value
  }

  /** Type `text`, pick the suggestion whose code is `value`, confirm with Enter. */
  async pick(field: Locator, text: string, value: string) {
    const option = this.option(value)
    await this.typeUntilListed(field, text, option)
    await expect(option, `Autocomplete · suggestion "${value}" is listed`).toBeVisible()
    await option.focus()
    await option.press('Enter')
    await expect(field, `Autocomplete · field takes "${value}"`).toHaveValue(value)
    await ajax(this.page).idle()
  }
}

export type GclScope = Page | FrameLocator;
export type GclSelection = {
  field: string;
  outcome: "selected" | "empty";
  firstValue?: string;
  row?: string;
  value: string;
};

/** GCL policy: the actual first data row, including code 0; never silently choose row two. */
export class GclLookup {
  constructor(
    readonly page: Page,
    readonly scope: GclScope,
  ) {
    ajax(page);
  }
  field(name: string) {
    return this.scope.locator(`[name="ins_${name}" i]:visible`).first();
  }
  async percent(name: string): Promise<GclSelection> {
    const field = this.field(name);
    await expect(field).toBeEnabled();
    await ajax(this.page).idle();
    // Keyboard focus still works when an empty Browse table overlays the next field.
    await field.focus();
    await field.fill("");
    await ajax(this.page).idle();
    let response: Response | undefined;
    const matches = (r: Request) => {
      if (!["xhr", "fetch"].includes(r.resourceType())) return false;
      const u = new URL(r.url());
      if ([...u.searchParams.values()].includes("%")) return true;
      try {
        return Object.values(r.postDataJSON() || {}).includes("%");
      } catch {
        return false;
      }
    };
    const lookup = this.page
      .waitForRequest(matches, { timeout: 1800 })
      .catch(() => null);
    await field.pressSequentially("%");
    const request = await lookup;
    if (request) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        response =
          (await Promise.race([
            request.response(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      `${name}: lookup response timed out (not an empty result)`,
                    ),
                  ),
                20000,
              );
            }),
          ])) || undefined;
        if (!response)
          throw new Error(
            `${name}: lookup request failed (not an empty result)`,
          );
        await response.finished();
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    await ajax(this.page).idle();
    const popup = this.scope.locator("#popupDiv");
    const first = popup.locator('input[name="selList"]').first();
    // A popup left over from a different field is not a result of this query.
    if (!response) {
      await field.fill("");
      await expect(field).toHaveValue("");
      return { field: name, outcome: "empty", value: "" };
    }
    expect(response.ok(), `${name}: lookup HTTP success`).toBeTruthy();
    const body = await response.text();
    expect(body, `${name}: no server error in lookup`).not.toMatch(
      /Fatal error|SQLSTATE|PDOException/i,
    );
    if (/name\s*=\s*["']selList["']/i.test(body))
      await expect(first, `${name}: current response rendered`).toBeVisible();
    if (!(await first.isVisible())) {
      await field.fill("");
      await expect(field).toHaveValue("");
      return { field: name, outcome: "empty", value: "" };
    }
    const firstValue = (await first.inputValue()).trim();
    const row = (await first.locator("xpath=ancestor::tr[1]").innerText())
      .replace(/\s+/g, " ")
      .trim();
    await first.focus();
    await first.press("Enter");
    await ajax(this.page).idle();
    await expect(
      field,
      `${name}: first row is committed, not just checked`,
    ).toHaveValue(firstValue);
    return {
      field: name,
      outcome: "selected",
      firstValue,
      row,
      value: await field.inputValue(),
    };
  }
  async snapshot(names: readonly string[]) {
    const values: Record<string, string> = {};
    for (const name of names)
      if (await this.field(name).count())
        values[name] = await this.field(name).inputValue();
    return values;
  }
}

