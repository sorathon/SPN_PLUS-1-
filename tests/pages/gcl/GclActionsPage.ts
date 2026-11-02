import { expect, Page } from "@playwright/test";
import { ajax, DialogLog, SpnSession } from "../spn/SpnApp";
import { GclListPage, GclRecord } from "./GclListPage";
import { GclWorkspacePage } from "./GclWorkspacePage";
import { today, uniqueRef } from "../../data/factories";

export class GclActionsPage {
  constructor(readonly page: Page) {}
  async records(session: SpnSession) {
    const list = new GclListPage(this.page);
    await list.open(session);
    await list.field("slimit").selectOption("200");
    await list.search();
    return list.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll(":scope > td");
        return {
          id: (row.querySelector("input[type=checkbox]") as HTMLInputElement)
            .value,
          reference: cells[2].textContent!.trim(),
          job: cells[4].textContent!.trim(),
        };
      }),
    );
  }
  async copy(
    session: SpnSession,
    source: GclRecord,
    kind: "list" | "control" | "workspace",
    count = 1,
    track?: (r: GclRecord) => void,
  ) {
    const ws = new GclWorkspacePage(this.page);
    await ws.open(session, source);
    const marker = uniqueRef("PW-GCL-COPY").toUpperCase();
    await ws.field("jobNo").fill(marker);
    await ws.field("remarkGCL").fill(marker);
    await ws.today();
    await ws.save();
    const before = await this.records(session);
    let action: () => Promise<unknown>;
    if (kind === "list") {
      const list = new GclListPage(this.page);
      await list.reference(source.reference);
      await list.row(source.reference).locator("input[type=checkbox]").check();
      action = () => this.page.locator("#CopyBTN").click();
    } else if (kind === "control") {
      await new GclWorkspacePage(this.page).open(session, source);
      await this.page.locator("#numcopyID").fill(String(count));
      await this.page.locator("#numcopyID").press("Tab");
      action = () => this.page.locator("#copyGCLRefID").click();
    } else {
      await ws.open(session, source);
      action = () => ws.control.locator("#copyBTN").click();
    }
    // A request can start long before its document commits. Returning to List
    // after only the request event races the server's redirect to the copy.
    const navigation = this.page
      .waitForEvent("framenavigated", {
        predicate: (f) => f === this.page.mainFrame(),
        timeout: 90_000,
      })
      .catch(() => null);
    const popup = this.page
      .context()
      .waitForEvent("page", { timeout: 8000 })
      .catch(() => null);
    await action();
    // Do not navigate back to List while the copy's document request is still starting.
    const opened = await popup;
    if (opened) {
      new DialogLog(opened);
      await opened.waitForLoadState("load");
    }
    if (!opened) {
      const frame = await navigation;
      expect(
        frame,
        "Copy navigation commits before searching for the copies",
      ).not.toBeNull();
      await this.page.waitForLoadState("load");
    }
    await ajax(this.page).idle();
    let created: GclRecord[] = [];
    await expect
      .poll(
        async () => {
          const candidates = (await this.records(session)).filter(
            (r) => !before.some((x) => x.id === r.id),
          );
          created = [];
          for (const r of candidates) {
            let own = r.job === marker;
            if (!own) {
              await ws.open(session, r);
              own = (await ws.field("remarkGCL").inputValue()) === marker;
            }
            if (own) {
              created.push(r);
              track?.(r);
            }
          }
          return created.length;
        },
        { timeout: 60_000 },
      )
      .toBe(count);
    if (opened && !opened.isClosed()) await opened.close();
    return created;
  }
  async resultWindow(action: () => Promise<unknown>) {
    const popup = this.page
      .waitForEvent("popup", { timeout: 5000 })
      .catch(() => null);
    await action();
    const result = await popup;
    if (result) {
      new DialogLog(result);
      await result.waitForLoadState("load");
    }
    return result;
  }
}
