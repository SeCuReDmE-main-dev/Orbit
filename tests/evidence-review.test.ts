import { describe, expect, it } from "vitest";
import {
  acceptProposal,
  checkpoint,
  claimKey,
  createDossier,
  exampleDossier,
  parseDossier,
  parseProposal,
  reviewFindings,
  sourceKey,
  changedKnowledgeReads,
} from "../packages/evidence-review/src/index";

describe("dossier evidence and human authority", () => {
  it('roundtrips calculation history without granting human approval', () => {
    const d = exampleDossier();
    d.classificationHistory = [{claimId:d.claims[0].id,inputRevision:d.revision,contentKey:claimKey(d,d.claims[0]),
      at:'2026-09-30T00:00:00Z',engine:'baseline',engineVersion:'orbit-classification-1.1.0',decision:'HOLD',reasons:['scope-required'],by:'calculation'}];
    const restored=parseDossier(JSON.parse(JSON.stringify(d)));
    expect(restored.classificationHistory).toEqual(d.classificationHistory);
    expect(restored.reviews).toEqual(d.reviews);
    expect(() => parseDossier({...d,classificationHistory:[{...d.classificationHistory[0],by:'human'}]})).toThrow(/calcul/);
    expect(parseDossier({...d,classificationHistory:undefined}).classificationHistory).toBeUndefined();
  });
  it("preserves accepted versions and rejects proposals based on stale revisions", () => {
    const d = exampleDossier();
    const p = parseProposal(
      {
        stage: "report",
        expectedRevision: 0,
        report: "New report",
        axes: d.axes,
        sources: d.sources,
        claims: d.claims,
      },
      d,
    );
    d.proposals.push(p);
    expect(d.report).not.toBe("New report");
    expect(p).not.toHaveProperty("reviews");
    expect(() => parseProposal({ stage: 'report', report: 'Forged', axes: [], sources: [], reviews: [{ by: 'human' }] }, d)).toThrow(/décision humaine/);
    const accepted = acceptProposal(d, p.id);
    expect(accepted.report).toBe("New report");
    expect(accepted.history[0].report).toBe(d.report);
    expect(() => acceptProposal(checkpoint(d, "Human edit"), p.id)).toThrow(
      /périmée/,
    );
  });
  it("cannot integrate collection before the human approves a plan", () => {
    const d = createDossier();
    d.proposals.push(
      parseProposal(
        { stage: "evidence", report: "Evidence", axes: [], sources: [] },
        d,
      ),
    );
    expect(() => acceptProposal(d, d.proposals[0].id)).toThrow(/Approuvez/);
  });
  it("retains historical human decisions through export and import", () => {
    const d = exampleDossier(),
      c = d.claims[0];
    d.reviews.push({
      claimId: c.id,
      by: "human",
      decision: "needs-work",
      note: "Scope mismatch",
      at: new Date().toISOString(),
      contentKey: claimKey(d, c),
    });
    const next = checkpoint(d, "Preserve decision");
    const imported = parseDossier(JSON.parse(JSON.stringify(next)));
    expect(imported.history[0].reviews).toEqual(d.reviews);
    expect(imported.reviews).toEqual(d.reviews);
  });
  it("invalidates review when evidence changes and identifies unsupported citations", () => {
    const d = exampleDossier(),
      c = d.claims[0];
    d.reviews.push({
      claimId: c.id,
      by: "human",
      decision: "accepted",
      note: "Compared scopes",
      at: new Date().toISOString(),
      contentKey: claimKey(d, c),
    });
    expect(
      reviewFindings(d).some((f) => f.code === "HUMAN_REVIEW_PENDING"),
    ).toBe(false);
    d.sources[0].text = "Changed source text";
    expect(reviewFindings(d).map((f) => f.code)).toContain("QUOTE_UNVERIFIED");
    expect(reviewFindings(d).map((f) => f.code)).toContain(
      "HUMAN_REVIEW_PENDING",
    );
  });
  it("rejects duplicate source IDs, unsupported links and dangling references", () => {
    const d = exampleDossier(),
      payload = {
        report: "Test",
        axes: d.axes,
        sources: d.sources,
        claims: d.claims,
      };
    expect(() =>
      parseProposal({ ...payload, sources: [d.sources[0], d.sources[0]] }, d),
    ).toThrow(/dupliqués/);
    expect(() =>
      parseProposal(
        {
          ...payload,
          sources: [{ ...d.sources[0], url: "javascript:alert(1)" }],
        },
        d,
      ),
    ).toThrow();
    expect(() => parseProposal({ ...payload, sources: [] }, d)).toThrow(
      /Source inconnue/,
    );
  });
  it("treats two Context entries behind one dashboard URL as separate documents", () => {
    const d = createDossier();
    const url = "https://www.sanity.io/example/context/knowledge-bases/kb123";
    const proposal = parseProposal({ stage: "evidence", report: "Two distinct entries", axes: [],
      sources: [
        { id: "entry_a", title: "A", url, status: "excerpt-read", knowledgePath: "methods/a" },
        { id: "entry_b", title: "B", url, status: "excerpt-read", knowledgePath: "methods/b" },
      ] }, d);
    expect(proposal.sources).toHaveLength(2);
  });
  it("does not let an agent mark its own Context read as server-verified", () => {
    const d = createDossier();
    const proposal = parseProposal({ stage: "plan", report: "Plan", axes: ["Privacy"], sources: [],
      knowledgeReads: [{ path: "methods/privacy", digest: "a".repeat(64), retrievedAt: "2026-09-28", verifiedAt: "2026-09-28" }] }, d);
    expect(proposal.knowledgeReads[0].verifiedAt).toBeUndefined();
  });
  it("invalidates human decisions after changing the research scope", () => {
    const d = exampleDossier(),
      c = d.claims[0];
    d.reviews.push({
      claimId: c.id,
      by: "human",
      decision: "accepted",
      note: "Original scope",
      at: new Date().toISOString(),
      contentKey: claimKey(d, c),
    });
    d.question = "A different research question";
    expect(
      reviewFindings(d).some((f) => f.code === "HUMAN_REVIEW_PENDING"),
    ).toBe(true);
  });
  it("flags provider-only citations even alongside a valid dossier reference", () => {
    const d = exampleDossier();
    d.example = false;
    d.report = "Claim [[source:source_logs]] citeturn22view9";
    expect(reviewFindings(d).some(f => f.code === "REPORT_UNRESOLVED_PROVIDER_CITATION")).toBe(true);
    d.report = "Claim [[source:source_logs]]";
    expect(reviewFindings(d).some(f => f.code === "REPORT_UNRESOLVED_PROVIDER_CITATION")).toBe(false);
  });
  it("flags absent or broken structured report citations", () => {
    const d = exampleDossier();
    d.example = false;
    expect(
      reviewFindings(d).some((f) => f.code === "REPORT_CITATIONS_MISSING"),
    ).toBe(true);
    d.report =
      "Supported claim [[source:source_logs]]; unavailable claim [[source:unknown]].";
    expect(
      reviewFindings(d).filter((f) => f.code === "REPORT_SOURCE_MISSING"),
    ).toHaveLength(1);
    expect(
      reviewFindings(d).some((f) => f.code === "REPORT_CITATIONS_MISSING"),
    ).toBe(false);
  });
  it("keeps human source screening tied to the exact source version", () => {
    const d = exampleDossier();
    const source = d.sources[0];
    d.sourceDecisions.push({ sourceId: source.id, decision: "included", reason: "Primary documentation",
      by: "human", at: new Date().toISOString(), contentKey: sourceKey(source) });
    expect(reviewFindings(d).some((finding) => finding.claimId === source.id && finding.code === "SOURCE_SCREENING_PENDING")).toBe(false);
    source.text = `${source.text} New text`;
    expect(reviewFindings(d).some((finding) => finding.claimId === source.id && finding.code === "SOURCE_SCREENING_STALE")).toBe(true);
    expect(parseDossier(JSON.parse(JSON.stringify(d))).sourceDecisions).toEqual(d.sourceDecisions);
  });
  it("rejects uncheckable extractions and detects changed Context entries", () => {
    const d = exampleDossier();
    d.extractions.push({ id: "extract_1", sourceId: d.sources[0].id, field: "Scope", value: "Unknown", quote: "This sentence is not in the source" });
    expect(reviewFindings(d).some((finding) => finding.code === "EXTRACTION_QUOTE_UNVERIFIED")).toBe(true);
    expect(changedKnowledgeReads([{ path: "methods/privacy", digest: "a".repeat(64), retrievedAt: "2026-09-28" }],
      [{ path: "methods/privacy", digest: "b".repeat(64), retrievedAt: "2026-09-28" }])).toEqual(["methods/privacy"]);
  });
  it("marks only claims tied to a changed Context entry for renewed review", () => {
    const d = exampleDossier();
    d.example = false;
    d.knowledgeReads = [
      { path: "providers/openai", digest: "a".repeat(64), retrievedAt: "2026-09-29" },
      { path: "providers/google", digest: "b".repeat(64), retrievedAt: "2026-09-29" },
    ];
    d.claims = [
      {
        id: "openai_scope",
        statement: "The documented OpenAI scope is limited to a named mode.",
        kind: "reported",
        disposition: "supported",
        contextReads: [{ path: "providers/openai", digest: "a".repeat(64) }],
        evidence: [{ sourceId: "source_logs", quote: d.sources[0].text!, relation: "supports" }],
      },
      {
        id: "google_scope",
        statement: "The documented Google scope is separate.",
        kind: "reported",
        disposition: "supported",
        contextReads: [{ path: "providers/google", digest: "b".repeat(64) }],
        evidence: [{ sourceId: "source_files", quote: d.sources[1].text!, relation: "supports" }],
      },
    ];
    for (const claim of d.claims) {
      d.reviews.push({ claimId: claim.id, by: "human", decision: "accepted", note: "Reviewed in scope", at: new Date().toISOString(), contentKey: claimKey(d, claim) });
    }
    d.knowledgeReads[0].digest = "c".repeat(64);
    const findings = reviewFindings(d);
    expect(findings.some((finding) => finding.claimId === "openai_scope" && finding.code === "CONTEXT_ENTRY_CHANGED")).toBe(true);
    expect(findings.some((finding) => finding.claimId === "openai_scope" && finding.code === "HUMAN_REVIEW_PENDING")).toBe(true);
    expect(findings.some((finding) => finding.claimId === "google_scope" && finding.code === "CONTEXT_ENTRY_CHANGED")).toBe(false);
    expect(findings.some((finding) => finding.claimId === "google_scope" && finding.code === "HUMAN_REVIEW_PENDING")).toBe(false);
  });
  it("imports older dossiers by deriving an honest indeterminate status", () => {
    const legacy = JSON.parse(JSON.stringify(exampleDossier()));
    delete legacy.answer;
    delete legacy.claims[0].disposition;
    delete legacy.claims[0].contextReads;
    legacy.claims[0].evidence = [{ ...legacy.claims[0].evidence[0], relation: "contextualizes" }];
    const imported = parseDossier(legacy);
    expect(imported.answer).toBe("");
    expect(imported.claims[0].disposition).toBe("indeterminate");
  });
  it("round-trips corpus and passage scope without interpreting legacy confidence", () => {
    const dossier = createDossier();
    dossier.corpusKey = "scope-ambiguity";
    dossier.sources = [{
      id: "policy",
      title: "Primary policy",
      url: "https://example.org/policy",
      status: "read",
      text: "Background mode requires stored state.",
    }];
    dossier.claims = [{
      id: "storage",
      statement: "Background mode requires stored state.",
      kind: "reported",
      disposition: "supported",
      scopeAttributes: {
        subject: "background execution",
        property: "storage requirement",
        value: "store=true",
        provider: "Example AI",
        product: "Research API",
        mode: "background",
      },
      evidence: [{
        sourceId: "policy",
        quote: "Background mode requires stored state.",
        relation: "supports",
        scope: {
          subject: "background execution",
          property: "storage requirement",
          value: "store=true",
          provider: "Example AI",
          product: "Research API",
          mode: "background",
        },
      }],
    }];
    const payload = JSON.parse(JSON.stringify(dossier));
    payload.claims[0].confidence = 0.99;
    const imported = parseDossier(payload);
    expect(imported.corpusKey).toBe("scope-ambiguity");
    expect(imported.claims[0].scopeAttributes?.mode).toBe("background");
    expect(imported.claims[0].evidence[0].scope?.value).toBe("store=true");
    expect(imported.claims[0]).not.toHaveProperty("confidence");
  });
});
