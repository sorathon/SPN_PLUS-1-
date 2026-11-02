import { expect, Locator, Page } from "@playwright/test";
import { serviceUrl, SpnSession, waitForReload } from "../spn/SpnApp";

export const GCL_COLUMNS = [
  "ACTION",
  "STATUS",
  "REFERENCE NO",
  "GCL NO",
  "JOB NO",
  "COMPANY NAME",
  "VESSEL NAME",
  "CONTAINER NO",
  "DEPARTURE DATE",
  "RELEASE PORT",
];
export type GclRecord = { id: string; reference: string };
export class GclListPage {
  constructor(readonly page: Page) {}
  get rows() {
    return this.page
      .locator("tr:not(:has(tr))")
      .filter({ has: this.page.locator('input[name="SELITEM[]"]') });
  }
  row(ref: string) {
    return this.rows.filter({ has: this.page.getByText(ref, { exact: true }) });
  }
  cell(row: Locator, column: number) {
    return row.locator(":scope > td").nth(column);
  }
  field(name: string) {
    return this.page.locator(`[name="${name}"]`);
  }
  async open(session: SpnSession) {
    await this.page.goto(
      serviceUrl(session, { SERVICENAME: "GOODSTRANSITIONCONTROL" }),
    );
    await expect(this.page.locator("#newBTN")).toBeVisible();
  }
  async search() {
    await waitForReload(
      this.page,
      () => this.page.locator("#refreshBTN").click({ noWaitAfter: true }),
      undefined,
      90_000,
    );
  }
  async reference(ref: string) {
    await this.field("sREF").fill(ref);
    await this.search();
  }
  async keyword(value: string, by: string) {
    await this.field("BY").selectOption(by);
    await this.field("KEYWORD").fill(value);
    await this.search();
  }
  async refs() {
    return this.rows.locator(":scope > td:nth-child(3)").allTextContents();
  }
  async openRecord(ref: string) {
    await this.row(ref)
      .getByText(ref, { exact: true })
      .click({ noWaitAfter: true });
    await this.page.locator("#detailfrm").waitFor({ timeout: 60_000 });
  }
  async deleteOwn(session: SpnSession, record: GclRecord) {
    await this.open(session);
    await this.reference(record.reference);
    const row = this.row(record.reference);
    if (!(await row.count())) return;
    const status = (await this.cell(row, 1).innerText()).trim();
    const remove = row.locator('img[title="Delete"]');
    if (status && !/draft/i.test(status))
      throw new Error(
        `Ref ${record.reference}: cleanup blocked by status ${status}`,
      );
    if (!(await remove.isVisible()))
      throw new Error(`Ref ${record.reference}: no draft Delete action`);
    await waitForReload(this.page, () => remove.click());
    await expect(this.row(record.reference)).toHaveCount(0);
  }
}
