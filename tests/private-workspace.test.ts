import { describe, it, expect } from "vitest";
import { validWorkspace, validStored } from "../web/src/lib/private-workspace";
const workspace = {
  id: "ec3ed2a3-ea44-4482-8d9a-f9c84730f777",
  revision: 1,
  title: "Atmosphere",
  requestId: "request1",
  question: "How?",
  context: "",
  report: "",
  axes: [],
  sources: [],
  checkpoints: [
    { id: "c1", at: "2026-09-27T21:00:00Z", summary: "Observed source" },
  ],
  updatedAt: "2026-09-27T21:00:00Z",
};
describe("Private workspace import validation", () => {
  it('rejects a cross-document or damaged retry receipt',()=>{
    const pending={operationId:'ec3ed2a3-ea44-4482-8d9a-f9c84730f778',baseRevision:1,document:workspace};
    expect(validStored({document:workspace,pending})).toBe(true);
    expect(validStored({document:workspace,pending:{...pending,operationId:'broken'}})).toBe(false);
    expect(validStored({document:workspace,pending:{...pending,baseRevision:0}})).toBe(false);
    expect(validStored({document:workspace,pending:{...pending,document:{...workspace,id:pending.operationId}}})).toBe(false);
  });
  it("accepts a complete checkpoint and its provenance", () =>
    expect(validWorkspace(workspace)).toBe(true));
  it("rejects an invalid owner-document reference or timestamp", () => {
    expect(
      validWorkspace({
        ...workspace,
        id: "------------------------------------",
      }),
    ).toBe(false);
    expect(validWorkspace({ ...workspace, updatedAt: "yesterday" })).toBe(
      false,
    );
  });
  it("rejects malformed or oversized checkpoints before local persistence", () => {
    expect(
      validWorkspace({
        ...workspace,
        checkpoints: [{ id: "c", at: "bad", summary: "s" }],
      }),
    ).toBe(false);
    expect(
      validWorkspace({
        ...workspace,
        checkpoints: Array(65).fill(workspace.checkpoints[0]),
      }),
    ).toBe(false);
    expect(validWorkspace({ ...workspace, checkpoints: [null] })).toBe(false);
  });
});
