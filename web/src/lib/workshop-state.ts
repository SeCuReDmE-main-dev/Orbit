import {
  createDossier,
  parseDossier,
  parseProposal,
  type Dossier,
} from "../../../packages/evidence-review/src/index";
let enabled = false;
let current = createDossier();
let dossiers: Dossier[] = [];
let readable = false,
  writable = false,
  local = false;
let storageMessage = "Session en mémoire · non conservée après fermeture";
let queue = Promise.resolve();
let storageRevision = 0;
export function workshopActive() {
  return enabled;
}
export function dossier() {
  return structuredClone(current);
}
export function allDossiers() {
  return dossiers.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt,
    example: d.example,
  }));
}
export function workshopPermissions() {
  return { readable, presentationAllowed: readable && writable };
}
export function storageState() {
  return { local, message: storageMessage };
}
function announce() {
  if (typeof document !== "undefined")
    document.dispatchEvent(new CustomEvent("orbit:workshop-updated"));
}
export function setPermissions(read: boolean, write: boolean) {
  readable = read;
  writable = read && write;
  announce();
}
export function setDossier(value: Dossier) {
  current = structuredClone(value);
  const index = dossiers.findIndex((d) => d.id === current.id);
  if (index < 0) dossiers.push(current);
  else dossiers[index] = current;
  if (local) persist();
  announce();
}
export function selectDossier(id: string) {
  const found = dossiers.find((d) => d.id === id);
  if (!found) return false;
  readable = writable = false;
  current = structuredClone(found);
  announce();
  return true;
}
export function addDossier(value = createDossier()) {
  readable = writable = false;
  setDossier(value);
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orbit-workshop-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("workspace");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function access(mode: IDBTransactionMode, value?: Dossier[]) {
  const db = await database();
  try {
    return await new Promise<any>((resolve, reject) => {
      const tx = db.transaction("workspace", mode),
        store = tx.objectStore("workspace");
      const req = store.get("dossiers");
      let conflict = false,
        result: unknown;
      req.onsuccess = () => {
        const saved = req.result;
        const revision =
          saved?.format === "orbit-workspace-v1" ? saved.revision : 0;
        if (mode === "readonly") {
          storageRevision = revision;
          result =
            saved?.format === "orbit-workspace-v1" ? saved.dossiers : saved;
          return;
        }
        if (revision !== storageRevision) {
          conflict = true;
          tx.abort();
          return;
        }
        store.put(
          {
            format: "orbit-workspace-v1",
            revision: revision + 1,
            dossiers: value,
          },
          "dossiers",
        );
      };
      tx.oncomplete = () => {
        if (mode === "readwrite") storageRevision++;
        resolve(result);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(
          conflict
            ? Error(
                "Un autre onglet a modifié la copie locale. Exportez votre session avant de recharger ; aucune version distante n’a été écrasée.",
              )
            : tx.error,
        );
    });
  } finally {
    db.close();
  }
}
function persist() {
  const snapshot = structuredClone(dossiers);
  queue = queue
    .then(async () => {
      if (!local) return;
      await access("readwrite", snapshot);
      storageMessage = "Copie locale enregistrée sur cet appareil";
    })
    .catch((e) => {
      storageMessage =
        e?.message || "Échec de sauvegarde locale · exportez le dossier";
      local = false;
    })
    .then(announce);
}
export async function enableLocalStorage() {
  // This is called only by the human's explicit storage choice.
  await queue;
  await access("readwrite", structuredClone(dossiers));
  localStorage.setItem("orbit.workshop.local-consent", "yes");
  local = true;
  let persistent = false;
  try {
    persistent = (await navigator.storage?.persist?.()) ?? false;
  } catch {
    /* Ordinary storage remains usable. */
  }
  storageMessage = persistent
    ? "Copie locale enregistrée · persistance accordée"
    : "Copie locale enregistrée · le navigateur peut libérer cet espace";
  announce();
}
export async function disableLocalStorage() {
  local = false;
  await queue;
  localStorage.removeItem("orbit.workshop.local-consent");
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("orbit-workshop-v1");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(Error("Fermez les autres onglets Orbit pour supprimer la copie."));
  });
  storageMessage = "Copie locale retirée · session en mémoire";
  announce();
  storageRevision = 0;
}
export async function activateWorkshop(id?: string) {
  enabled = true;
  readable = writable = false;
  try {
    if (localStorage.getItem("orbit.workshop.local-consent") === "yes") {
      const stored = await access("readonly");
      if (Array.isArray(stored) && stored.length <= 100)
        dossiers = stored.map(parseDossier);
      local = true;
      storageMessage = "Copie locale restaurée · partage désactivé";
    }
  } catch {
    storageMessage = "Copie locale illisible · aucune donnée écrasée";
    local = false;
  }
  if (!dossiers.length) dossiers = [current];
  current = structuredClone(dossiers.find((d) => d.id === id) ?? dossiers[0]);
  announce();
  return !id || current.id === id;
}
export function workshopRequest() {
  if (!readable)
    return {
      state: "CONSENT_REQUIRED",
      message: "Ask the human to enable dossier sharing in Orbit.",
    };
  return {
    state: current.question ? "QUESTION_READY" : "AWAITING_QUESTION",
    requestId: current.id,
    question: current.question,
    objective: current.objective,
    context: current.context,
    revision: current.revision,
    approvedPlan: current.approvedPlan ?? null,
    example: current.example,
    nextTool: "orbit_get_research_protocol",
  };
}
export function workshopRead(path: string) {
  if (!readable)
    return {
      state: "CONSENT_REQUIRED",
      message: "Enable dossier sharing in Orbit.",
    };
  const url = new URL(path, "https://orbit.invalid"),
    start = Number(url.searchParams.get("offset") ?? 0),
    count = Number(url.searchParams.get("limit") ?? 10);
  if (url.pathname.startsWith("/missions/")) {
    if (
      !["current", `mission_${current.id}`].includes(
        decodeURIComponent(url.pathname.split("/").pop()!),
      )
    )
      return { state: "NOT_FOUND" };
    return {
      state: "READY",
      mission: { id: `mission_${current.id}`, title: current.title },
      requestId: current.id,
      revision: current.revision,
      approvedPlan: current.approvedPlan ?? null,
      axes: current.axes,
      screeningCriteria: current.screeningCriteria,
      classificationEngine: current.classificationEngine ?? 'n',
      handoffs: current.handoffs ?? [],
      sourceDecisions: current.sourceDecisions.map(({ contentKey, ...decision }) => decision),
      extractions: current.extractions,
      knowledgeReads: current.knowledgeReads,
      answer: current.answer,
      report: current.report,
      claims: current.claims,
      reviews: current.reviews.map(({ contentKey, ...r }) => r),
      proposals: current.proposals.map(
        ({ id, stage, status, baseRevision }) => ({
          id,
          stage,
          status,
          baseRevision,
        }),
      ),
      evidenceStatus: "external-agent-reported",
      example: current.example,
    };
  }
  if (url.pathname === "/research-points")
    return {
      state: "READY",
      items: current.axes
        .slice(start, start + count)
        .map((title, i) => ({ id: `axis_${start + i}`, title })),
      total: current.axes.length,
      nextOffset: start + count < current.axes.length ? start + count : null,
    };
  if (url.pathname === "/sources") {
    const q = (url.searchParams.get("query") ?? "").toLowerCase(),
      items = current.sources.filter((s) =>
        `${s.title} ${s.url}`.toLowerCase().includes(q),
      );
    return {
      state: "READY",
      items: items.slice(start, start + count),
      total: items.length,
      nextOffset: start + count < items.length ? start + count : null,
    };
  }
  const source = current.sources.find(
    (s) => s.id === decodeURIComponent(url.pathname.split("/").pop() ?? ""),
  );
  return source
    ? { state: "READY", source,
        screening: current.sourceDecisions.find((item) => item.sourceId === source.id)?.decision ?? "pending",
        evidenceStatus: "external-agent-reported" }
    : { state: "NOT_FOUND" };
}
export function workshopPresent(input: Record<string, unknown>) {
  if (!readable || !writable)
    return {
      state: "CONSENT_REQUIRED",
      message: "Separate proposal permission is required.",
    };
  if (input.requestId !== current.id)
    throw Error("Request reference does not match the current dossier.");
  const ordered = (value: any): any => Array.isArray(value) ? value.map(ordered)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
  const submissionKey = JSON.stringify(ordered(input));
  const existing = input.submissionId ? current.proposals.find(p => p.submissionId === input.submissionId) : undefined;
  if (existing) {
    if (existing.submissionKey !== submissionKey) throw Error('SUBMISSION_CONFLICT: the same submission ID has different content.');
    const disposition = existing.status === 'pending' ? 'PROPOSAL_PENDING_HUMAN_REVIEW'
      : existing.status === 'accepted' ? 'PROPOSAL_ACCEPTED' : 'PROPOSAL_REJECTED';
    return { state: 'PRESENTED', disposition, proposalId: existing.id, revision: current.revision, duplicate: true, evidenceStatus: 'external-agent-reported' };
  }
  if (current.proposals.length >= 60)
    throw Error(
      "Export this dossier before starting another; proposal history is full.",
    );
  const proposal = parseProposal(input, current);
  if (input.submissionId) proposal.submissionKey = submissionKey;
  // No report, approved plan or human review is changed by this external write.
  setDossier({ ...current, proposals: [...current.proposals, proposal] });
  return {
    state: "PRESENTED",
    disposition: "PROPOSAL_PENDING_HUMAN_REVIEW",
    proposalId: proposal.id,
    revision: current.revision,
    evidenceStatus: "external-agent-reported",
  };
}
