import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSelectedDriveFile,
  driveConfiguration,
} from "../web/src/lib/drive-import";
import { publicationHtml, reportMarkup } from "../web/src/lib/research-report";
import { exampleDossier } from "../packages/evidence-review/src/index";
afterEach(() => vi.unstubAllGlobals());
describe("selected document imports", () => {
  it("reads only a selected Google document and retains a bounded excerpt", async () => {
    const network = vi.fn(async () => new Response("x".repeat(13000)));
    vi.stubGlobal("fetch", network);
    const source = await readSelectedDriveFile(
      {
        id: "chosen123",
        name: "My document",
        mimeType: "application/vnd.google-apps.document",
      },
      "TEST_ONLY",
    );
    expect(network).toHaveBeenCalledTimes(1);
    expect(network.mock.calls[0][0]).toBe(
      "https://www.googleapis.com/drive/v3/files/chosen123/export?mimeType=text%2Fplain",
    );
    expect(source.text).toHaveLength(12000);
    expect(source.status).toBe("excerpt-read");
    expect(JSON.stringify(source)).not.toContain("TEST_ONLY");
  });
  it("rejects foreign identifiers and formats before accessing Google", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    await expect(
      readSelectedDriveFile(
        { id: "../another-account", name: "Bad", mimeType: "text/plain" },
        "TEST_ONLY",
      ),
    ).rejects.toThrow();
    await expect(
      readSelectedDriveFile(
        { id: "file", name: "PDF", mimeType: "application/pdf" },
        "TEST_ONLY",
      ),
    ).rejects.toThrow();
    expect(network).not.toHaveBeenCalled();
  });
  it("reports missing configuration without pretending to authenticate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ configured: false })),
    );
    await expect(driveConfiguration()).rejects.toThrow(/à configurer/);
  });
});
describe("portable white paper", () => {
  it("numbers citations using stable source identifiers and reports missing references", () => {
    const d = exampleDossier();
    const html = reportMarkup(
      "Claim [[source:source_files]]. Unknown [[source:absent]].",
      d.sources,
    );
    expect(html).toContain('href="#ref-2"');
    expect(html).toContain("Référence introuvable : absent");
    expect(html).not.toContain("[[source:");
  });
  it("renders headings and tables while preserving untrusted content as text", () => {
    const html = reportMarkup(
      "## Results\n\n| A | B |\n| --- | --- |\n| <script>alert(1)</script> | **Evidence** |",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<strong>Evidence</strong>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("keeps evidence in a separate dossier and avoids fabricated author credentials", () => {
    const d = exampleDossier(),
      html = publicationHtml(d);
    expect(html).toContain("EXEMPLE SYNTHÉTIQUE");
    expect(html).toContain("@page{size:A4");
    expect(html).toContain("Dossier de preuves associé");
    expect(html).not.toContain("0009-0007");
    expect(html).not.toContain("<script");
  });
});
