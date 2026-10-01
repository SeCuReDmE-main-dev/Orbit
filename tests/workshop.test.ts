import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => {
      throw Error("Unexpected persistent write");
    }),
  });
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("guest workshop consent and proposals", () => {
  it("repeated submissions preserve the actual human disposition", async () => {
    const state = await import("../web/src/lib/workshop-state");
    await state.activateWorkshop();
    state.setPermissions(true, true);
    const input = { requestId: state.dossier().id, expectedRevision: 0,
      submissionId: 'repeat-after-review', stage: 'plan', report: 'Proposed check of source provenance', axes: ['Check provenance'], sources: [] };
    const first = state.workshopPresent(input);
    const current = state.dossier();
    state.setDossier({ ...current, proposals: current.proposals.map(p => ({ ...p, status: 'accepted' as const })) });
    expect(state.workshopPresent(input)).toMatchObject({ proposalId: first.proposalId,
      disposition: 'PROPOSAL_ACCEPTED', duplicate: true });
    expect(state.dossier().proposals).toHaveLength(1);
  });
  it("starts without creating a database and does not transmit data on entry", async () => {
    const state = await import("../web/src/lib/workshop-state");
    await state.activateWorkshop();
    expect(indexedDB.open).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.storageState().local).toBe(false);
    expect(state.workshopRead("/missions/current")).toMatchObject({
      state: "CONSENT_REQUIRED",
    });
  });
  it("requires separate write consent, retains proposals, and revokes when switching dossiers", async () => {
    const state = await import("../web/src/lib/workshop-state");
    const { orbitTools } = await import("../web/src/lib/webmcp");
    await state.activateWorkshop();
    const d = state.dossier();
    d.question = "How are exact citations checked?";
    state.setDossier(d);
    const tool = orbitTools().find((t) => t.name === "orbit_present_research")!;
    const proposal = {
      requestId: d.id,
      expectedRevision: 0,
      stage: "plan",
      report: "Proposed plan",
      axes: ["Compare quoted text"],
      sources: [],
    };
    state.setPermissions(true, false);
    expect(await tool.execute(proposal)).toMatchObject({
      state: "CONSENT_REQUIRED",
    });
    state.setPermissions(true, true);
    expect(await tool.execute(proposal)).toMatchObject({
      disposition: "PROPOSAL_PENDING_HUMAN_REVIEW",
    });
    expect(state.dossier()).toMatchObject({
      revision: 0,
      report: "",
      axes: [],
      proposals: [{ stage: "plan", status: "pending" }],
    });
    await expect(
      tool.execute({ ...proposal, expectedRevision: 99 }),
    ).rejects.toThrow(/STALE_REVISION/);
    await expect(
      tool.execute({ ...proposal, approvedPlan: 0 }),
    ).rejects.toThrow(/not allowed/);
    state.addDossier();
    expect(state.workshopPermissions()).toEqual({
      readable: false,
      presentationAllowed: false,
    });
    expect(state.workshopRead(`/missions/mission_${d.id}`)).toMatchObject({
      state: "CONSENT_REQUIRED",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cleans fifteen registrations when Astro swaps the document and can register again", async () => {
    const calls: any[] = [],
      doc = new EventTarget(),
      win = new EventTarget();
    Object.assign(doc, {
      modelContext: {
        registerTool: async (tool: any, options: any) =>
          calls.push({ tool, options }),
      },
    });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("window", win);
    const { registerOrbitTools } = await import("../web/src/lib/webmcp");
    await Promise.all([registerOrbitTools(), registerOrbitTools()]);
    expect(calls).toHaveLength(15);
    doc.dispatchEvent(new Event("astro:before-swap"));
    expect(calls.every((c) => c.options.signal.aborted)).toBe(true);
    await registerOrbitTools();
    expect(calls).toHaveLength(30);
    expect(calls.slice(15).every((c) => !c.options.signal.aborted)).toBe(true);
  });
});
