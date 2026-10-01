import { describe, expect, it } from "vitest";
import { createDossier, type Claim, type ClaimScope } from "../packages/evidence-review/src/index";
import { assessTif, buildRelationGraph, compareClaims, type ContradictionRule } from "../packages/evidence-review/src/relations";

const scope = (value: string, extra: Partial<ClaimScope> = {}): ClaimScope => ({
  subject: "background execution",
  property: "availability",
  value,
  provider: "Example AI",
  product: "Research API",
  mode: "background",
  ...extra,
});

function claim(id: string, value: string, extra: Partial<ClaimScope> = {}): Claim {
  return { id, statement: `${id} says ${value}`, kind: "reported", disposition: "indeterminate",
    scopeAttributes: scope(value, extra), evidence: [] };
}

const rules: ContradictionRule[] = [{
  id: "availability-allowed-prohibited",
  attribute: "value:availability",
  left: "allowed",
  right: "prohibited",
  relation: "incompatible",
  justification: "The same operation cannot be both allowed and prohibited under identical conditions.",
  version: "1.0.0",
}];

describe("Orbit evidence relation engines", () => {
  it("keeps T and F independent and deduplicates the same source passage", () => {
    const dossier = createDossier();
    dossier.sources = [
      { id: "a", title: "Policy A", url: "https://example.org/a", status: "read", text: "Background mode is allowed." },
      { id: "b", title: "Policy B", url: "https://example.org/b", status: "read", text: "Background mode is prohibited." },
    ];
    const row = claim("availability", "allowed");
    row.evidence = [
      { sourceId: "a", quote: dossier.sources[0].text!, relation: "supports", scope: scope("allowed") },
      { sourceId: "a", quote: dossier.sources[0].text!, relation: "supports", scope: scope("allowed") },
      { sourceId: "b", quote: dossier.sources[1].text!, relation: "contradicts", scope: scope("prohibited") },
    ];
    const result = assessTif(dossier, row);
    expect(result.truth).toHaveLength(1);
    expect(result.falsity).toHaveLength(1);
    expect(result.priority).toBe("same-scope-conflict");
  });

  it("places unverified quotes and missing scopes in I instead of T or F", () => {
    const dossier = createDossier();
    dossier.sources = [{ id: "a", title: "Policy", url: "https://example.org/a", status: "read", text: "Actual text." }];
    const row = claim("availability", "allowed");
    row.evidence = [{ sourceId: "a", quote: "Invented text.", relation: "supports" }];
    const result = assessTif(dossier, row);
    expect(result.truth).toHaveLength(0);
    expect(result.falsity).toHaveLength(0);
    expect(result.indeterminacy.map((item) => item.code)).toContain("quote-unverified");
  });

  it("distinguishes a direct contradiction from a product scope difference", () => {
    expect(compareClaims(claim("a", "allowed"), claim("b", "prohibited"), rules).kind)
      .toBe("same-scope-contradiction");
    expect(compareClaims(claim("a", "allowed"), claim("b", "prohibited", { product: "Batch API" }), rules).kind)
      .toBe("different-scope");
  });

  it("requires explicit replacement before marking version succession", () => {
    const result = compareClaims(
      claim("old", "allowed", { version: "2025", effectiveFrom: "2025-01-01" }),
      claim("new", "prohibited", { version: "2026", effectiveFrom: "2026-01-01", supersedesVersion: "2025" }),
      rules,
    );
    expect(result.kind).toBe("version-succession");
  });

  it("does not invent a relation when the domain rule is absent", () => {
    expect(compareClaims(claim("a", "limited"), claim("b", "conditional"), []).kind)
      .toBe("indeterminate");
  });

  it("builds only relations for claims sharing subject and property", () => {
    const dossier = createDossier();
    dossier.claims = [claim("a", "allowed"), claim("b", "prohibited"), {
      ...claim("c", "available"),
      scopeAttributes: { ...scope("available"), subject: "file upload" },
    }];
    const graph = buildRelationGraph(dossier, rules);
    expect(graph).toHaveLength(1);
    expect(graph[0].kind).toBe("same-scope-contradiction");
  });
});
