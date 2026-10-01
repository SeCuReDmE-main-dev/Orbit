import {
  currentDraft,
  parseDraft,
  readLegacyDraft,
  resetDraft,
  updateDraft,
  type CompanionDraft,
} from "./companion-state";
import type { OrbitSession } from "./orbit-session";

export type WorkspaceDocument = CompanionDraft & {
  id: string;
  revision: number;
  title: string;
  checkpoints: Array<{
    id: string;
    at: string;
    summary: string;
    provenance?: string;
  }>;
  updatedAt: string;
};
type Operation = {
  operationId: string;
  baseRevision: number;
  document: WorkspaceDocument;
};
type Stored = { document: WorkspaceDocument; pending?: Operation };

function openDatabase(owner: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      `orbit.private.v1.${encodeURIComponent(owner)}`,
      1,
    );
    request.onupgradeneeded = () =>
      request.result.createObjectStore("workspaces", {
        keyPath: "document.id",
      });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspaces", mode),
      request = action(tx.objectStore("workspaces"));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export function validWorkspace(value: unknown): value is WorkspaceDocument {
  const v = value as WorkspaceDocument;
  return (
    !!parseDraft(v) &&
    typeof v.id === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v.id) &&
    Number.isSafeInteger(v.revision) &&
    v.revision >= 0 &&
    typeof v.title === "string" &&
    v.title.length <= 255 &&
    typeof v.updatedAt === "string" &&
    Number.isFinite(Date.parse(v.updatedAt)) &&
    Array.isArray(v.checkpoints) &&
    v.checkpoints.length <= 64 &&
    v.checkpoints.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        c.id.length > 0 &&
        c.id.length <= 160 &&
        typeof c.at === "string" &&
        Number.isFinite(Date.parse(c.at)) &&
        typeof c.summary === "string" &&
        c.summary.length > 0 &&
        c.summary.length <= 2000 &&
        (c.provenance === undefined ||
          (typeof c.provenance === "string" && c.provenance.length <= 2000)),
    )
  );
}

/** Reject damaged or cross-document retry receipts before replaying a local cache. */
export function validStored(value: unknown): value is Stored {
  const item = value as Stored;
  if (!item || !validWorkspace(item.document)) return false;
  const pending = item.pending;
  return pending === undefined || !!(pending &&
    typeof pending.operationId === 'string' &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(pending.operationId) &&
    Number.isSafeInteger(pending.baseRevision) && pending.baseRevision >= 0 &&
    validWorkspace(pending.document) && pending.document.id === item.document.id &&
    pending.document.revision === pending.baseRevision);
}

/** Owns private research persistence. Opening IndexedDB is itself consent-gated. */
export function mountPrivateWorkspace() {
  let session: OrbitSession | undefined,
    db: IDBDatabase | undefined,
    epoch = 0,
    active: WorkspaceDocument | undefined,
    editorDirty = false,
    localGeneration = 0,
    suppress = false,
    busy = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const records = new Map<string, Stored>();
  const status = (message: string) => {
    const el = document.querySelector("[data-sync-status]");
    if (el) el.textContent = message;
  };
  const title = document.querySelector<HTMLInputElement>(
    "[data-workspace-title]",
  )!;
  const report =
    document.querySelector<HTMLTextAreaElement>("[data-report-body]")!;
  const list = document.querySelector<HTMLElement>("[data-workspace-list]")!;
  const legacy = document.querySelector<HTMLButtonElement>(
    "[data-legacy-import]",
  )!;
  function render() {
    list.replaceChildren();
    if (!records.size) {
      const p = document.createElement("p");
      p.className = "empty-note";
      p.textContent = "Votre première recherche commence avec une question.";
      list.append(p);
    }
    for (const { document: doc, pending } of records.values()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspace-record";
      button.textContent = `${doc.title} · ${pending ? "à synchroniser" : `révision ${doc.revision}`}`;
      button.addEventListener("click", () => select(doc));
      list.append(button);
    }
    if (!active) {
      title.value = "";
      report.value = "";
      return;
    }
    if (!editorDirty && document.activeElement !== title) title.value = active.title;
    if (!editorDirty && document.activeElement !== report) report.value = active.report;
    document
      .querySelectorAll<HTMLElement>(
        "[data-private-sources],[data-report-sources]",
      )
      .forEach((el) => {
        el.replaceChildren();
        if (!active!.sources.length) {
          const empty = document.createElement('li');
          empty.className = 'empty-note';
          empty.textContent = 'Aucune source enregistrée dans cette recherche.';
          el.append(empty);
        }
        for (const source of active!.sources) {
          const li = document.createElement("li"),
            a = document.createElement("a");
          a.href = source.url;
          a.textContent = source.title;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          li.append(a, document.createTextNode(` · ${source.status}`));
          el.append(li);
        }
      });
  }
  function select(doc: WorkspaceDocument) {
    commitEditor();
    active = structuredClone(doc);
    editorDirty = false;
    title.value = active.title;
    report.value = active.report;
    suppress = true;
    updateDraft(active);
    suppress = false;
    render();
    const q = document.querySelector<HTMLTextAreaElement>(
        "#companion-question",
      ),
      c = document.querySelector<HTMLTextAreaElement>("#companion-context");
    if (q) q.value = active.question;
    if (c) c.value = active.context;
    const answer = document.querySelector<HTMLElement>(
      "[data-companion-answer]",
    );
    if (answer) answer.textContent = active.report;
    document.dispatchEvent(new CustomEvent('orbit:workspace-selected'));
  }
  function fresh(value?: CompanionDraft) {
    select({
      ...currentDraft(),
      ...value,
      id: crypto.randomUUID(),
      revision: 0,
      title: value?.question.slice(0, 100) || "Nouvelle recherche",
      requestId: value?.requestId || crypto.randomUUID(),
      checkpoints: [],
      updatedAt: new Date().toISOString(),
    });
  }
  async function localSave(record: Stored, expectedEpoch = epoch) {
    if (expectedEpoch === epoch && db && session?.storageConsent.local)
      await transaction(db, "readwrite", (s) => s.put(structuredClone(record)));
  }
  async function flush() {
    if (busy || !session?.user) return;
    busy = true;
    let completed = false;
    const start = epoch,
      owner = session.user.id;
    try {
      for (const [id, record] of records) {
        if (!record.pending) continue;
        const operation = structuredClone(record.pending);
        const response = await fetch(`/api/v1/workspaces/${id}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": session.csrfToken,
          },
          body: JSON.stringify(operation),
        });
        if (start !== epoch || session?.user?.id !== owner) return;
        if (response.status === 401) {
          document.dispatchEvent(new CustomEvent("orbit:session-expired"));
          return;
        }
        const result = await response.json();
        if (start !== epoch || session?.user?.id !== owner) return;
        if (
          response.status === 409 &&
          result.error === "REVISION_CONFLICT" &&
          validWorkspace(result.conflict)
        ) {
          const fork = {
            ...record.document,
            id: crypto.randomUUID(),
            revision: 0,
            title: record.document.title.slice(0, 235) + " · version locale",
          };
          const forkRecord = {
            document: fork,
            pending: {
              operationId: crypto.randomUUID(),
              baseRevision: 0,
              document: fork,
            },
          };
          records.set(fork.id, forkRecord);
          await localSave(forkRecord, start);
          if (start !== epoch) return;
          if (validWorkspace(result.current)) {
            records.set(id, { document: result.current });
            await localSave({ document: result.current }, start);
            if (start !== epoch) return;
          }
          if (active?.id === id) select(fork);
          status("Conflit conservé : deux versions distinctes.");
          render();
          return;
        }
        if (!response.ok || !validWorkspace(result.document))
          throw new Error("Sync unavailable");
        // Edits made during a request get a fresh operation against its confirmed revision.
        const latest = records.get(id)!;
        const newer =
          JSON.stringify(latest.document) !==
          JSON.stringify(operation.document);
        const confirmed: Stored = {
          document: newer
            ? { ...latest.document, revision: result.document.revision }
            : result.document,
        };
        if (newer)
          confirmed.pending = {
            operationId: crypto.randomUUID(),
            baseRevision: result.document.revision,
            document: structuredClone(confirmed.document),
          };
        records.set(id, confirmed);
        await localSave(confirmed, start);
        if (start !== epoch) return;
        if (active?.id === id) active = structuredClone(confirmed.document);
      }
      status(
        Array.from(records.values()).some((r) => r.pending)
          ? "Modifications en attente"
          : "Enregistré dans votre compte",
      );
      render();
      completed = true;
    } catch {
      if (start !== epoch) return;
      status(
        db
          ? "Hors connexion · copie locale conservée"
          : "Non synchronisé · gardez cet onglet ouvert",
      );
    } finally {
      if (start === epoch) busy = false;
      if (
        completed &&
        start === epoch &&
        Array.from(records.values()).some((r) => r.pending)
      )
        timer = setTimeout(() => void flush(), 500);
    }
  }
  async function queue() {
    if (!session?.user || !active) return;
    const started = epoch;
    active = {
      ...active,
      ...currentDraft(),
      updatedAt: new Date().toISOString(),
    };
    const previous = records.get(active.id);
    const pending = previous?.pending ?? {
      operationId: crypto.randomUUID(),
      baseRevision: active.revision,
      document: structuredClone(active),
    };
    // Never rewrite a receipt: a lost response can mean the server already committed it.
    // Later edits are queued against the revision returned by that exact operation.
    const record = { document: structuredClone(active), pending };
    records.set(active.id, record);
    try {
      await localSave(record, started);
    } catch {
      if (started !== epoch) return;
      status("Stockage local indisponible · sauvegarde cloud en cours");
    }
    if (started !== epoch) return;
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 700);
  }
  document.addEventListener("orbit:draft-updated", () => {
    if (!suppress && session?.user) {
      if (!active) fresh();
      void queue();
    }
  });
  function commitEditor() {
    if (!editorDirty || !active || !session?.user) return;
    editorDirty = false;
    active.title = title.value.trim().slice(0, 255) || 'Recherche Orbit';
    updateDraft({ report: report.value.slice(0, 40000) });
  }
  for (const field of [title, report]) {
    field.addEventListener('input', () => { editorDirty = true; });
    field.addEventListener('change', commitEditor);
  }
  document.addEventListener('orbit:view-change', commitEditor);
  document
    .querySelector("[data-workspace-new]")!
    .addEventListener("click", () => {
      commitEditor();
      suppress = true;
      resetDraft();
      suppress = false;
      fresh();
      void queue();
      document
        .querySelector<HTMLAnchorElement>('[data-view-link="companion"]')
        ?.click();
    });
  document
    .querySelector("[data-report-save]")!
    .addEventListener("click", () => {
      if (!active) fresh();
      editorDirty = false;
      active!.title = title.value.trim().slice(0, 255) || "Recherche Orbit";
      updateDraft({ report: report.value.slice(0, 40000) });
      void flush();
    });
  legacy.addEventListener("click", () => {
    const old = readLegacyDraft();
    if (!old) return;
    fresh(old);
    void queue();
    legacy.hidden = true;
    status("Ancien brouillon importé explicitement dans ce compte");
  });
  async function configureLocal(allow: boolean) {
    if (!session?.user) return;
    const localStart = ++localGeneration;
    session.storageConsent.local = allow;
    if (allow) {
      const owner = session.user.id,
        start = epoch;
      try {
        const opened = await openDatabase(owner);
        if (start !== epoch || localStart !== localGeneration) {
          opened.close();
          return;
        }
        db = opened;
        const stored = await transaction<Stored[]>(db, "readonly", (s) =>
          s.getAll(),
        );
        if (start !== epoch || localStart !== localGeneration) return;
        for (const item of stored)
          if (validStored(item) && !records.has(item.document.id))
            records.set(item.document.id, item);
        for (const item of records.values()) await localSave(item, start);
        if (start !== epoch || localStart !== localGeneration) return;
        const durable = await navigator.storage?.persist?.();
        if (start !== epoch || localStart !== localGeneration) return;
        status(
          durable
            ? "Copie locale protégée contre l’éviction automatique"
            : "Copie locale autorisée · le navigateur peut libérer cet espace",
        );
      } catch {
        status("Le navigateur a refusé le stockage local");
      }
    } else {
      // Deleting an optional cache does not create a database if none existed.
      db?.close();
      db = undefined;
      const deletion = indexedDB.deleteDatabase(
        `orbit.private.v1.${encodeURIComponent(session.user.id)}`,
      );
      deletion.onblocked = () =>
        status(
          "Fermez les autres onglets Orbit pour terminer le retrait de la copie locale.",
        );
      deletion.onerror = () =>
        status("Copie locale non supprimée : réessayez depuis les réglages.");
    }
  }
  document.addEventListener("orbit:storage-consent", (event) => {
    void configureLocal((event as CustomEvent).detail.local);
  });
  const close = () => {
    epoch++;
    busy = false;
    localGeneration++;
    editorDirty = false;
    session = undefined;
    clearTimeout(timer);
    db?.close();
    db = undefined;
    records.clear();
    active = undefined;
    suppress = true;
    resetDraft();
    suppress = false;
    render();
    document.querySelectorAll<HTMLElement>('[data-private-sources],[data-report-sources]').forEach(el => el.replaceChildren());
    for (const selector of ['#companion-question','#companion-context']) {
      const input = document.querySelector<HTMLTextAreaElement>(selector);
      if(input) input.value = '';
    }
    const answer = document.querySelector<HTMLElement>('[data-companion-answer]');
    if(answer) answer.textContent = '';
  };
  document.addEventListener("orbit:logout", close);
  document.addEventListener("orbit:session-expired", close);
  document.addEventListener("orbit:session-ready", async (event) => {
    close();
    session = (event as CustomEvent<{ session: OrbitSession }>).detail.session;
    if (!session.user) return;
    const start = epoch;
    legacy.hidden = !readLegacyDraft();
    if (session.storageConsent.local) await configureLocal(true);
    if (start !== epoch) return;
    try {
      const response = await fetch("/api/v1/workspaces", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Cloud unavailable");
      const result = await response.json();
      if (start !== epoch) return;
      for (const doc of result.items ?? [])
        if (validWorkspace(doc) && !records.get(doc.id)?.pending) {
          records.set(doc.id, { document: doc });
          await localSave({ document: doc }, start);
          if (start !== epoch) return;
        }
      status("Votre espace est synchronisé");
    } catch {
      if (start !== epoch) return;
      status(
        db
          ? "Recherches locales · cloud indisponible"
          : "Cloud indisponible · gardez cet onglet ouvert",
      );
    }
    if (start !== epoch) return;
    const first = records.values().next().value as Stored | undefined;
    if (first) select(first.document);
    else fresh();
    render();
    void flush();
  });
  window.addEventListener("online", () => {
    void flush();
  });
  window.addEventListener("pagehide", () => {
    db?.close();
    db = undefined;
  });
}
