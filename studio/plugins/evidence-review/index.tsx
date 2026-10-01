import { useState } from "react";
import { definePlugin } from "sanity";
import { Button, Card, Flex, Heading, Stack, Text, TextArea } from "@sanity/ui";
import {
  checkpoint,
  claimKey,
  exportMarkdown,
  parseDossier,
  reviewFindings,
  type Dossier,
} from "../../../packages/evidence-review/src/index";

function EvidenceReviewTool() {
  const [dossier, setDossier] = useState<Dossier>();
  const [message, setMessage] = useState(
    "Choose an Orbit dossier. Files stay in this browser session; nothing is written to Sanity.",
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  function download(type: "json" | "md") {
    if (!dossier) return;
    const content =
      type === "json"
        ? JSON.stringify(dossier, null, 2)
        : exportMarkdown(dossier);
    const url = URL.createObjectURL(
      new Blob([content], {
        type: type === "json" ? "application/json" : "text/markdown",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-reviewed-${dossier.id}.${type}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function decide(id: string, decision: "accepted" | "needs-work") {
    if (!dossier) return;
    const claim = dossier.claims.find((c) => c.id === id),
      note = notes[id]?.trim();
    if (!claim || !note) {
      setMessage("Add a reason before recording your decision.");
      return;
    }
    try {
      const next = checkpoint(dossier, "Human review in Sanity Studio");
      next.reviews = next.reviews.filter((r) => r.claimId !== id);
      next.reviews.push({
        claimId: id,
        decision,
        note,
        by: "human",
        at: new Date().toISOString(),
        contentKey: claimKey(dossier, claim),
      });
      setDossier(next);
      setMessage(
        "Decision recorded in this session. Export the dossier to retain it.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <Card padding={[3, 4, 5]} style={{ height: "100%", overflowY: "auto" }}>
      <Stack gap={5} style={{ maxWidth: 980, margin: "0 auto" }}>
        <Heading size={3}>Orbit · Evidence review</Heading>
        <Text muted>
          Review claims, exact passages and human decisions using the same
          format as the research workshop.
        </Text>
        <label>
          Import an Orbit evidence dossier (.json)
          <input
            type="file"
            accept=".json,application/json"
            style={{ display: "block", marginTop: 12 }}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 8_000_000) throw Error("File exceeds 8 MB.");
                setDossier(parseDossier(JSON.parse(await file.text())));
                setNotes({});
                setMessage(
                  "Imported. Existing decisions are claims from this file, not newly verified identities. Review the evidence before accepting.",
                );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          />
        </label>
        <Card padding={3} tone="primary" radius={2}>
          <Text size={1} role="status">
            {message}
          </Text>
        </Card>
        {dossier && (
          <>
            <Stack gap={3}>
              <Heading size={2}>{dossier.title}</Heading>
              <Text>{dossier.question || "No question recorded"}</Text>
              <Card padding={3} radius={2} border>
                <Stack gap={2}>
                  <Text muted size={1}>
                    CURRENT ORBIT ANSWER AFFECTED BY THESE CLAIMS
                  </Text>
                  <Text>
                    {dossier.answer ||
                      "No short answer has been proposed for this dossier."}
                  </Text>
                  <Text muted size={1}>
                    This answer is a dossier proposal, not a Sanity Knowledge Base write.
                  </Text>
                </Stack>
              </Card>
              <Text muted>
                Revision {dossier.revision} · {dossier.sources.length} sources ·{" "}
                {reviewFindings(dossier).length} checks to examine
                {dossier.example ? " · SYNTHETIC EXAMPLE" : ""}
              </Text>
              <Flex gap={3} wrap="wrap">
                <Button
                  text="Export reviewed dossier"
                  onClick={() => download("json")}
                />
                <Button
                  text="Export report"
                  mode="ghost"
                  onClick={() => download("md")}
                />
              </Flex>
            </Stack>
            {!dossier.claims.length && (
              <Text>
                No structured claims in this dossier. Request claims with source
                IDs and exact passages from your agent.
              </Text>
            )}
            {dossier.claims.map((claim) => {
              const current = dossier.reviews.find(
                (r) =>
                  r.claimId === claim.id &&
                  r.contentKey === claimKey(dossier, claim),
              );
              return (
                <Card key={claim.id} padding={4} border radius={2}>
                  <Stack gap={4}>
                    <Text muted size={1}>
                      {claim.kind} · agent conclusion: {claim.disposition}
                    </Text>
                    <Heading size={1}>{claim.statement}</Heading>
                    <Card padding={3} radius={2} tone="transparent" border>
                      <Stack gap={2}>
                        <Text size={1}>
                          Scope: {claim.scope || "Not provided by the agent."}
                        </Text>
                        {claim.effectiveAt && (
                          <Text size={1}>
                            Document date or version: {claim.effectiveAt}
                          </Text>
                        )}
                        <Text size={1}>
                          Conditions: {claim.conditions?.length
                            ? claim.conditions.join(" · ")
                            : "None recorded."}
                        </Text>
                      </Stack>
                    </Card>
                    <Stack gap={2}>
                      <Text muted size={1}>
                        SANITY CONTEXT ENTRY → CLAIM → CURRENT ANSWER
                      </Text>
                      {claim.contextReads?.length ? (
                        claim.contextReads.map((read) => {
                          const current = dossier.knowledgeReads.find(
                            (entry) => entry.path === read.path,
                          );
                          const changed = !current || current.digest !== read.digest;
                          return (
                            <Text key={`${read.path}-${read.digest}`} size={1}>
                              {read.path} · {read.digest.slice(0, 16)}… ·{" "}
                              {changed ? "changed or unavailable — re-review required" : "current"}
                            </Text>
                          );
                        })
                      ) : (
                        <Text size={1} muted>
                          Legacy claim: it depends on the dossier-level Context reads below.
                        </Text>
                      )}
                    </Stack>
                    {claim.evidence.map((e, i) => {
                      const source = dossier.sources.find(
                        (s) => s.id === e.sourceId,
                      );
                      return (
                        <Stack gap={3} key={`${e.sourceId}-${i}`}>
                          <Text size={1}>
                            {e.relation} · {source?.title || "Missing source"} ·{" "}
                            {source?.status}
                          </Text>
                          <blockquote
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.65,
                              margin: 0,
                              paddingLeft: 16,
                              borderLeft: "2px solid #7d91ed",
                            }}
                          >
                            {e.quote}
                          </blockquote>
                          {source && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open original source ↗
                            </a>
                          )}
                        </Stack>
                      );
                    })}
                    <Text size={1}>
                      Agent assessment: {claim.assessment || "Not provided"}
                    </Text>
                    {claim.correction && (
                      <Text size={1}>
                        Proposed correction: {claim.correction}
                      </Text>
                    )}
                    <ul>
                      {reviewFindings(dossier)
                        .filter((f) => f.claimId === claim.id)
                        .map((f, i) => (
                          <li key={i} style={{ marginBottom: 8 }}>
                            {f.message}
                          </li>
                        ))}
                    </ul>
                    {current && (
                      <Text size={1}>
                        Recorded decision: {current.decision} — {current.note}
                      </Text>
                    )}
                    <label>
                      Reason for your decision
                      <TextArea
                        value={notes[claim.id] ?? ""}
                        rows={3}
                        maxLength={3000}
                        onChange={(event) =>
                          setNotes({
                            ...notes,
                            [claim.id]: event.currentTarget.value,
                          })
                        }
                      />
                    </label>
                    <Flex gap={3} wrap="wrap">
                      <Button
                        text="Accept after review"
                        onClick={() => decide(claim.id, "accepted")}
                      />
                      <Button
                        text="Request a correction"
                        mode="ghost"
                        onClick={() => decide(claim.id, "needs-work")}
                      />
                    </Flex>
                  </Stack>
                </Card>
              );
            })}
          </>
        )}
        <Text muted size={1}>
          These checks verify evidence links and recorded decisions. They do not
          prove a source is true or modify the Knowledge Base.
        </Text>
      </Stack>
    </Card>
  );
}

export const orbitEvidenceReview = definePlugin({
  name: "orbit-evidence-review",
  tools: [
    {
      name: "orbit-evidence-review",
      title: "Orbit Evidence",
      component: EvidenceReviewTool,
    },
  ],
});
