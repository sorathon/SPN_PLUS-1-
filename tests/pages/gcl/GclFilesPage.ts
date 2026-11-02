import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Page, expect } from "@playwright/test";
import { readZip } from "../../data/zip";
import { SpnSession } from "../spn/SpnApp";
import { GclListPage, GclRecord } from "./GclListPage";

export class GclFilesPage {
  constructor(readonly page: Page) {}
  async download(
    session: SpnSession,
    records: GclRecord[],
    kind: "XML" | "PDF",
    directory: string,
  ) {
    const list = new GclListPage(this.page);
    await list.open(session);
    await list.field("slimit").selectOption("200");
    await list.search();
    for (const r of records)
      await list.row(r.reference).locator("input[type=checkbox]").check();
    const pending = this.page.waitForEvent("download", { timeout: 45000 });
    await this.page
      .locator(kind === "XML" ? "#saveXmlBTN" : "#savePdfBTN")
      .click();
    const d = await pending,
      file = path.join(directory, path.basename(d.suggestedFilename()));
    await d.saveAs(file);
    const buffer = fs.readFileSync(file);
    return buffer.subarray(0, 2).toString() === "PK"
      ? readZip(file)
      : [{ name: d.suggestedFilename(), data: buffer }];
  }
  async assertXml(data: Buffer, record: GclRecord, sourceRefs: string[] = []) {
    const text = data.toString("utf8");
    expect(text).not.toMatch(/Fatal error|PDOException|<html/i);
    const parsed = await this.page.evaluate((xml) => {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      return {
        errors: doc.querySelectorAll("parsererror").length,
        root: doc.documentElement.localName,
        text: doc.documentElement.textContent,
      };
    }, text);
    expect(parsed.errors).toBe(0);
    expect(parsed.root.toLowerCase()).not.toBe("html");
    expect(parsed.text).toContain(record.reference);
    for (const ref of sourceRefs) expect(parsed.text).toContain(ref);
  }
  assertPdf(data: Buffer, reference?: string) {
    expect(data.subarray(0, 4).toString()).toBe("%PDF");
    expect(data.length).toBeGreaterThan(500);
    expect(data.subarray(-120).toString("latin1")).toContain("%%EOF");
    const bundled = path.join(
      process.env.USERPROFILE || "",
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
    );
    const python =
      process.env.SPN_GCL_PYTHON ||
      (fs.existsSync(bundled) ? bundled : "python");
    const text = execFileSync(
      python,
      [
        "-X",
        "utf8",
        "-c",
        'import io,sys; from pypdf import PdfReader; r=PdfReader(io.BytesIO(sys.stdin.buffer.read())); assert len(r.pages)>0; print("\\n".join(p.extract_text() or "" for p in r.pages))',
      ],
      {
        input: data,
        encoding: "utf8",
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    expect(text.trim(), "PDF has extractable readable text").not.toBe("");
    if (reference)
      expect(
        text.replace(/\s+/g, ""),
        "PDF content identifies the selected GCL",
      ).toContain(reference);
    return text;
  }
}
