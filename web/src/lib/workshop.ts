import {
  acceptProposal,
  changedKnowledgeReads,
  checkpoint,
  claimKey,
  createDossier,
  exampleDossier,
  exportMarkdown,
  parseDossier,
  parseEvidence,
  reviewFindings,
  sourceKey,
  type Dossier,
  type Stage,
} from "../../../packages/evidence-review/src/index";
import {
  activateWorkshop,
  addDossier,
  allDossiers,
  dossier,
  disableLocalStorage,
  enableLocalStorage,
  selectDossier,
  setDossier,
  setPermissions,
  storageState,
  workshopPermissions,
} from "./workshop-state";
import { orbitTools, registerOrbitTools } from "./webmcp";
import { classifyEvidence, traceImpact, handoffFindings } from '../../../packages/evidence-review/src/classification';
import { reportMarkup, publicationHtml } from "./research-report";
import {
  driveConnected,
  disconnectDrive,
  prepareDrivePicker,
} from "./drive-import";
import { readLegacyDraft } from "./companion-state";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const labels = {
  question: "Question",
  plan: "Plan",
  evidence: "Preuves",
  review: "Vérification",
  report: "Rapport",
};
const sourceLabels = {
  discovered: "Repérée",
  "excerpt-read": "Extrait lu",
  read: "Lecture déclarée",
};
const dispositionLabels = {
  supported: "Soutenue",
  contested: "Contestée",
  indeterminate: "Indéterminée",
};
const guidedCases = {
  provider: {
    title: "Conditions documentées d’une recherche différée",
    question:
      "Sous quelles conditions documentées une recherche approfondie en arrière-plan peut-elle coexister avec des exigences de zero data retention sur des surfaces OpenAI et Google nommées ?",
    objective:
      "Distinguer fournisseur, produit, mode d’exécution, conservation des données et date de chaque passage avant toute conclusion comparative.",
    context:
      "Cas de démonstration guidé. Il ne présume ni contradiction ni compatibilité. Lire les entrées Sanity Context pertinentes, puis comparer les documents originaux cités ; une entrée Context résume une source, elle ne prouve pas que l’original a été relu.",
    axes: [
      "Fournisseur, produit et surface concernés",
      "Mode d’exécution et conditions de recherche différée",
      "Conservation des données et exigences ZDR",
      "Date, version et portée de chaque document",
      "Désaccord réel ou différence de périmètre",
    ],
    criteria: [
      "Document officiel avec date ou version identifiable",
      "Passage exact conservé dans le dossier",
      "Périmètre produit et mode d’exécution explicités",
      "Aucune généralisation d’un fournisseur ou produit à un autre",
    ],
  },
  sanity: {
    title: "Quand la structure Sanity change la réponse",
    question:
      "Quelles distinctions documentées dans Sanity Context exigent une lecture structurée de la Knowledge Base plutôt qu’une recherche par mots-clés seule ?",
    objective:
      "Montrer les chemins, sources, versions et portées qui changent une conclusion, puis comparer le résultat à une recherche textuelle sur le même corpus.",
    context:
      "Cas de démonstration guidé. Il ne présume pas qu’un conflit existe. Vérifier le sommaire Context, les entrées sélectionnées et les documents Sanity originaux avant de qualifier une différence comme contradictoire.",
    axes: [
      "Rôle de la Knowledge Base et du Context MCP",
      "Chemin et provenance des entrées",
      "Version, disponibilité et limites documentées",
      "Distinction entre conflit et portée différente",
      "Comparaison contrôlée avec recherche textuelle",
    ],
    criteria: [
      "Documentation Sanity officielle ou source primaire liée",
      "Entrée Context et passage original distingués",
      "Même question et même corpus pour la comparaison",
      "Conclusion indéterminée si la portée reste absente",
    ],
  },
} as const;
const button = (action: string, label: string, cls = "secondary", id = "") =>
  `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${cls}">${label}</button>`;
const field = (
  label: string,
  name: string,
  value: string,
  max: number,
  rows = 0,
  cls = "",
) =>
  `<label class="field"><span>${label}</span>${rows ? `<textarea name="${name}" rows="${rows}" maxlength="${max}" class="${cls}">${esc(value)}</textarea>` : `<input name="${name}" value="${esc(value)}" maxlength="${max}" />`}</label>`;
const textDocument = reportMarkup;
async function contentDigest(content: unknown): Promise<string> {
  const text = Array.isArray(content)
    ? content.filter((block) => block?.type === "text").map((block) => String(block.text ?? "")).join("\n")
    : JSON.stringify(content);
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function mountWorkshop() {
  const surface = document.querySelector<HTMLElement>("[data-surface]")!,
    dialog = document.querySelector<HTMLDialogElement>("[data-dialog]")!,
    noticeEl = document.querySelector<HTMLElement>("[data-notice]")!,
    importer = document.querySelector<HTMLInputElement>("[data-import]")!;
  const events = new AbortController(),
    scroll = new Map<string, number>();
  let disposeMap: (() => void) | undefined,
    mapGeneration = 0,
    lastRender = "",
    dirty = false,
    toastTimer = 0,
    editingReport = false,
    tour = 0;
  let openDrive: (() => void) | undefined;
  let lastUrl = location.href,
    navigationIndex = 0;
  let webmcp = "Vérification…",
    sanity = "Pas encore consulté",
    outline: any,
    entryResult: any;
  const currentRoute = () => new URLSearchParams(location.search);
  const currentView = () => currentRoute().get("view") ?? "question";
  const notice = (text: string) => {
    noticeEl.textContent = text;
    noticeEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (noticeEl.hidden = true), 8000);
  };
  const modal = (html: string) => {
    dialog.querySelector("[data-dialog-content]")!.innerHTML = html;
    if (!dialog.open) dialog.showModal();
  };
  const commit = (d: Dossier) => {
    dirty = false;
    setDossier(d);
  };
  function go(view: string, extra: Record<string, string> = {}) {
    if (dirty) {
      notice(
        "Enregistrez vos modifications avec le bouton de cette vue avant de continuer.",
      );
      return;
    }
    scroll.set(location.search, surface.scrollTop);
    const params = new URLSearchParams({
      dossier: dossier().id,
      view,
      ...extra,
    });
    history.pushState({ orbitIndex: ++navigationIndex }, "", `/app/?${params}`);
    lastUrl = location.href;
    dialog.close();
    editingReport = false;
    render(true);
    surface.focus({ preventScroll: true });
  }
  function header(title: string, intro: string, actions = "") {
    return `<header class="view-head"><div><p class="eyebrow">Dossier de recherche</p><h1>${title}</h1>${intro ? `<p>${intro}</p>` : ""}</div>${actions ? `<div class="actions">${actions}</div>` : ""}</header>`;
  }
  function empty(
    title: string,
    detail: string,
    action = "sharing",
    label = "Partager avec mon agent",
  ) {
    return `<section class="empty"><h2>${title}</h2><p>${detail}</p><div class="actions">${button(action, label)}</div></section>`;
  }
  function proposals(d: Dossier, stage: string) {
    return d.proposals
      .filter(
        (p) =>
          p.status === "pending" &&
          (p.stage === stage || (stage === "review" && p.stage === "evidence")),
      )
      .map(
        (p) =>
          `<article class="proposal"><header><strong>Proposition de l’agent · ${esc(labels[p.stage])}</strong><span class="badge ${p.baseRevision === d.revision ? "violet" : "amber"}">${p.baseRevision === d.revision ? "À examiner" : "Version périmée"}</span></header><pre>${esc(p.report)}</pre><p class="muted">${p.axes.length} axes · ${p.sources.length} sources · ${p.claims.length} affirmations · révision ${p.baseRevision}</p><div class="actions">${button("accept-proposal", "Intégrer cette proposition", "primary", p.id)}${button("reject-proposal", "Écarter", "secondary", p.id)}</div></article>`,
      )
      .join("");
  }
  function question(d: Dossier) {
    return `<div class="reading">${header("Qu’allons-nous éclaircir ?", "Une bonne recherche commence par une question précise.")}
    <form data-form="question" class="question-form">${field("Votre question", "question", d.question, 2000, 3, "question-input")}${field("Le résultat que vous cherchez", "objective", d.objective, 3000)}${field("Contexte, contraintes et liens utiles", "context", d.context, 12000, 3)}<div class="form-bottom"><small>Votre question reste dans cette session tant que vous ne la partagez pas.</small><button class="primary" type="submit">Enregistrer la question →</button></div></form>
    <section class="case-starters"><p class="eyebrow">Cas de démonstration</p><h2>Partir d’une distinction qui compte.</h2><p>Ces deux dossiers posent un cadre de travail. Ils n’ajoutent ni sources, ni conclusion, ni conflit présumé.</p><div class="case-grid"><button data-action="case-provider" class="case-card"><span>Cas 01</span><strong>Politiques de fournisseurs IA</strong><small>Mode d’exécution, conservation, ZDR et date.</small></button><button data-action="case-sanity" class="case-card"><span>Cas 02</span><strong>Documentation Sanity</strong><small>Chemins Context, versions et portée utile.</small></button></div></section>
    <div class="intro-line"><p>Votre agent prépare le plan. Orbit conserve les preuves et vous aide à examiner les conclusions.</p>${button("example", "Découvrir un exemple", "text-link")}</div>${proposals(d, "question")}</div>`;
  }
  function plan(d: Dossier) {
    return `<div class="reading">${header("Donner une direction à la recherche.", "Des axes utiles, un périmètre explicite et un plan que vous approuvez.", button("sanity", "Consulter Sanity"))}
      <p class="status-note ${d.approvedPlan !== undefined ? "cyan" : ""}">${d.approvedPlan !== undefined ? `Plan approuvé à la révision ${d.approvedPlan}.` : "Le plan doit être approuvé avant d’intégrer les preuves ou le rapport."}</p>
      <form data-form="plan">${field("Axes de recherche · un par ligne, neuf au maximum", "axes", d.axes.join("\n"), 2708, 5, "axis-editor")}${field("Critères d’inclusion ou d’exclusion · un par ligne", "criteria", d.screeningCriteria.join("\n"), 3612, 4)}<p class="muted">Budget de ce dossier : jusqu’à 30 sources. Ces plafonds ne sont pas des quotas à remplir. Votre agent gère ses propres recherches externes.</p><div class="actions"><button class="secondary" type="submit">Enregistrer le plan</button>${button("approve-plan", "Approuver ce plan", "primary")}</div></form>${proposals(d, "plan")}
      ${!d.axes.length ? `<div class="intro-line"><p>Votre agent peut consulter les méthodes Sanity et proposer des axes adaptés à votre question.</p>${button("sharing", "Partager la question", "text-link")}</div>` : ""}</div>`;
  }
  function sourceScreening(d: Dossier, sourceId: string) {
    const decision = d.sourceDecisions.find((item) => item.sourceId === sourceId);
    const source = d.sources.find((item) => item.id === sourceId)!;
    const current = decision?.contentKey === sourceKey(source);
    return `<section class="screening"><h2>Décision sur cette source</h2><p>${decision && current ? `${decision.decision === "included" ? "Incluse" : "Écartée"} : ${esc(decision.reason)}` : decision ? "Décision périmée : la source a changé." : "À examiner selon les critères du plan."}</p><div class="actions">${button("screen-include", "Inclure", "secondary", sourceId)}${button("screen-exclude", "Écarter", "secondary", sourceId)}</div></section>`;
  }
  function sourceExtractions(d: Dossier, sourceId: string) {
    const rows = d.extractions.filter((item) => item.sourceId === sourceId);
    return `<section class="screening"><h2>Éléments extraits</h2>${rows.length ? rows.map((row) => `<p><strong>${esc(row.field)} :</strong> ${esc(row.value)}<br><small>Passage : « ${esc(row.quote)} »</small></p>`).join("") : '<p class="muted">Aucune extraction pour cette source.</p>'}</section>`;
  }
  function evidence(d: Dossier) {
    const route = currentRoute(),
      source = d.sources.find((s) => s.id === route.get("source"));
    if (route.has("source"))
       return source
        ? `<div class="reading source-detail">${button("back-evidence", "← Retour aux preuves", "text-link back-link")}${header(esc(source.title), "")}<div class="meta"><span>${sourceLabels[source.status]}</span><span>${esc(source.publisher ?? "Éditeur non renseigné")}</span><span>${esc(source.retrievedAt ?? "Date de consultation non renseignée")}</span>${source.knowledgePath ? `<span class="badge violet">Entrée Context · ${esc(source.knowledgePath)}</span>` : ""}</div>${source.knowledgePath ? `<p class="status-note cyan">Cette fiche contient une entrée Sanity Context. Elle peut résumer ou relier un document original ; elle ne prouve pas que le document original a été lu. Son empreinte est ${esc(source.contentHash?.slice(0, 16) ?? "non conservée")}.</p>` : ""}<a class="source-url" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${source.knowledgePath ? "Ouvrir la fiche Context ↗" : "Ouvrir la source originale ↗"}</a>${sourceScreening(d, source.id)}${sourceExtractions(d, source.id)}<h2 style="margin-top:32px">Passage conservé</h2>${source.text ? `<blockquote>${esc(source.text)}</blockquote>` : '<p class="status-note">Aucun extrait conservé : une URL seule ne vérifie pas une affirmation.</p>'}<h2>Affirmations liées</h2>${
            d.claims
              .filter((c) => c.evidence.some((e) => e.sourceId === source.id))
              .map(
                (c) =>
                  `<p>${button("claim", esc(c.statement), "text-link", c.id)}</p>`,
              )
              .join("") || '<p class="muted">Aucune affirmation liée.</p>'
          }<p class="muted">La lecture et le contenu sont déclarés par l’agent ou la personne qui a ajouté cette fiche.</p></div>`
        : `<div class="reading">${empty("Source introuvable", "Cette référence n’existe pas dans le dossier actif.", "back-evidence", "Retour aux preuves")}</div>`;
    if (route.get("map") === "1")
      return `<div class="wide">${header("La carte des preuves.", "Les liens représentent les relations déclarées. La position n’est pas une mesure de vérité.", button("back-evidence", "Revenir à la liste"))}<div class="map-legend"><span>● Cyan · sources</span><span>● Violet · affirmations</span><span>Ambre · axes / contradictions</span><label>Liens <select data-map-filter aria-label="Filtrer les relations"><option value="">Tous</option><option value="supports">Soutient</option><option value="contradicts">Contredit</option><option value="contextualizes">Contextualise</option></select></label></div><div class="map-host" data-evidence-map><canvas aria-label="Carte interactive des sources et affirmations" tabindex="0"></canvas><p data-map-status></p></div><p class="muted">Glissez pour déplacer la carte. Sélectionnez un élément pour lire sa fiche.</p><div class="map-node-list">${d.axes.map((axis, i) => button("axis", esc(axis), "secondary", `axis_${i}`)).join("")}${d.sources.map((s) => button("source", esc(s.title), "secondary", s.id)).join("")}${d.claims.map((c) => button("claim", esc(c.statement), "secondary", c.id)).join("")}</div></div>`;
    const q = route.get("q") ?? "",
      status = route.get("status") ?? "",
      filtered = d.sources.filter(
        (s) =>
          `${s.title} ${s.url}`.toLowerCase().includes(q.toLowerCase()) &&
          (!status || s.status === status),
      );
    return `<div class="wide">${header("Remonter jusqu’à la source.", "Une référence est un point de départ. Son passage et son périmètre font la différence.", button("map", "Carte des preuves") + button("drive", "Google Drive") + button("add-source", "Ajouter une source"))}
    <form data-form="filter" class="filter-bar"><input name="q" value="${esc(q)}" placeholder="Titre ou URL…" aria-label="Filtrer les sources" /><select name="status" aria-label="Statut de lecture"><option value="">Tous les statuts</option>${Object.entries(
      sourceLabels,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${status === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select><button class="secondary" type="submit">Filtrer</button><span class="count-note">${filtered.length} / ${d.sources.length} sources</span></form>
    ${d.sources.length ? `<ul class="record-list">${filtered.map((s, i) => `<li class="record-row"><span class="record-index">${String(i + 1).padStart(2, "0")}</span><div class="record-main">${button("source", esc(s.title), "", s.id)}<small>${esc(new URL(s.url).hostname)}</small></div><span class="badge ${s.status === "discovered" ? "amber" : "cyan"}">${sourceLabels[s.status]}</span><span class="badge violet">${esc(d.sourceDecisions.find((item) => item.sourceId === s.id)?.decision ?? "À examiner")}</span>${button("source", "Lire ↗", "text-link", s.id)}</li>`).join("")}</ul>` : empty("Votre bibliothèque commence ici.", "Les sources de votre recherche apparaîtront dans cette vue. Vous pouvez en ajouter une ou recevoir une proposition de votre agent.", "add-source", "Ajouter une source")}${proposals(d, "evidence")}</div>`;
  }
  function review(d: Dossier) {
    const selected = currentRoute().get("claim"),
      claims = selected ? d.claims.filter((c) => c.id === selected) : d.claims,
      findings = reviewFindings(d);
    return `<div class="reading">${selected ? button("review", "← Toutes les affirmations", "text-link back-link") : ""}${header("Ce que les preuves permettent de dire.", "L’analyse de l’agent et votre décision restent distinctes.", button("verify-context", "Revérifier Sanity") + button("history", "Historique"))}
    <p class="status-note">${findings.length} point(s) à examiner · ${d.claims.length} affirmation(s). Aucun pourcentage de vérité n’est calculé.</p>
    ${
      findings.some((f) => f.claimId === "report")
        ? `<section class="status-note amber"><h2>Références du rapport</h2><ul>${findings
            .filter((f) => f.claimId === "report")
            .map((f) => `<li>${esc(f.message)}</li>`)
            .join("")}</ul></section>`
        : ""
    }
    ${
      claims.length
        ? claims
            .map((c) => {
              const reviewed = d.reviews.find(
                (r) => r.claimId === c.id && r.contentKey === claimKey(d, c),
              );
              const classification = classifyEvidence(d, c);
              const comparisons = (['baseline', 'n', 'p'] as const).map(engine => classifyEvidence(d, c, engine));
              const comparisonTable = `<details class="classification-comparison"><summary>Comparer les trois moteurs sur ces mêmes passages</summary><p>Calcul à la révision ${d.revision}. Il ne modifie ni le moteur sélectionné ni une décision humaine.</p><table><thead><tr><th>Moteur</th><th>Décision</th><th>Soutiens</th><th>Incertitudes</th><th>Réfutations</th></tr></thead><tbody>${comparisons.map(row => `<tr><th>${row.engine === 'baseline' ? 'Standard · trois états' : row.engine === 'n' ? 'N · ensembles indépendants' : 'P · attributs et règles'}</th><td>${esc(row.decision)}</td><td>${row.truth.length}</td><td>${row.indeterminacy.length}</td><td>${row.falsity.length}</td></tr>`).join('')}</tbody></table>${comparisons.map(row => `<details><summary>${esc(row.engine.toUpperCase())} · ${esc(row.engineVersion)}</summary><ul>${row.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul><pre>${esc(JSON.stringify(row.representation, null, 2))}</pre></details>`).join('')}<p class="muted">Des décisions identiques sont possibles. Le classement porte sur les relations proposées et vérifiables, pas sur une probabilité de vérité.</p></details>`;
              const conditions = c.conditions?.length ? `<ul class="conditions-list">${c.conditions.map((condition) => `<li>${esc(condition)}</li>`).join("")}</ul>` : '<p class="muted">Aucune condition déclarée.</p>';
              const contextReads = c.contextReads?.length ? `<ul class="context-dependencies">${c.contextReads.map((read) => `<li><code>${esc(read.path)}</code> · ${esc(read.digest.slice(0, 16))}…</li>`).join("")}</ul>` : '<p class="muted">Aucune dépendance Context explicite : ce dossier ancien dépend de toutes ses lectures Context conservées.</p>';
              return `<article class="review-item"><div class="claim-labels"><span class="badge violet">${esc(c.kind)}</span><span class="badge disposition ${esc(c.disposition)}">${dispositionLabels[c.disposition]}</span></div><h2 style="margin-top:16px">${esc(c.statement)}</h2><section class="claim-scope"><h3>Portée et conditions</h3><p>${esc(c.scope || "Portée non fournie par l’agent.")}</p>${c.effectiveAt ? `<p><strong>Date / version :</strong> ${esc(c.effectiveAt)}</p>` : ""}${conditions}<h3>Entrées Sanity Context dont dépend cette conclusion</h3>${contextReads}</section>${c.evidence
                .map((e) => {
                  const s = d.sources.find((s) => s.id === e.sourceId);
                  return `<div class="review-proof"><small>${esc(e.relation)} · ${s ? esc(s.title) : "Source absente"}</small><p>${esc(e.quote)}</p>${s ? button("source", "Examiner la source ↗", "text-link", s.id) : ""}</div>`;
                })
                .join(
                  "",
                )}<section class="classification-panel"><h3>Classement ${esc(classification.engine.toUpperCase())} · ${esc(classification.decision)}</h3><p>Soutiens ${classification.truth.length} · Incertitudes ${classification.indeterminacy.length} · Réfutations ${classification.falsity.length} · ${classification.independentSources} origine(s) distincte(s)</p><ul>${classification.reasons.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul><p class="muted">Relations déclarées par l’agent; un passage exact ne prouve pas la vérité de l’affirmation.</p>${classification.hold ? `<p><strong>Reprise :</strong> ${esc(classification.hold.resumeWhen)}</p>` : ""}${comparisonTable}<div class="actions">${button("clarify-claim", "Préciser les conditions / reprendre HOLD", "secondary", c.id)}${button("record-classification", "Conserver les trois calculs", "secondary", c.id)}${button("classification-history", "Calculs précédents", "text-link", c.id)}</div></section><h3>Appréciation proposée par l’agent</h3><p>${esc(c.assessment ?? "Aucune appréciation fournie.")}</p>${c.correction ? `<p><strong>Reformulation proposée :</strong> ${esc(c.correction)}</p>` : ""}<ul class="review-list">${findings
                .filter((f) => f.claimId === c.id)
                .map((f) => `<li>${esc(f.message)}</li>`)
                .join(
                  "",
                )}</ul>${reviewed ? `<p class="badge cyan">Revue humaine : ${reviewed.decision === "accepted" ? "acceptée" : "correction demandée"}</p><p>${esc(reviewed.note)}</p>` : ""}<div class="review-actions">${button("review-accept", "Accepter après examen", "secondary", c.id)}${button("review-reject", "Demander une correction", "secondary", c.id)}</div></article>`;
            })
            .join("")
        : empty(
            "Les affirmations restent à examiner.",
            "Demandez à l’agent de déposer ses affirmations, les passages exacts et les relations aux sources. Une simple liste d’URL ne suffit pas.",
          )
    }${proposals(d, "review")}<section class="status-note"><h3>Continuité des preuves</h3><p>${traceImpact(d).affectedClaimIds.length} affirmation(s) à revoir après changement de dépendance · ${handoffFindings(d).length} point(s) dans les transmissions entre agents.</p></section></div>`;
  }
  function report(d: Dossier) {
    return `<div class="reading">${header("Un rapport que vous pouvez vérifier.", `Révision ${d.revision} · ${d.sources.length} références`, button("edit-report", editingReport ? "Lire le document" : "Modifier") + button("export-paper", "White paper / PDF") + button("export-md", "Exporter .md"))}
    ${editingReport ? `<form data-form="report">${field("Titre", "title", d.title, 500)}${field("Réponse courte · ce qu’Orbit peut dire maintenant", "answer", d.answer, 10000, 4)}${field("Texte du rapport · Markdown simple", "report", d.report, 40000, 16, "report-editor")}<button class="primary" type="submit">Enregistrer une nouvelle version</button></form>` : d.report ? `<section class="answer-card"><p class="eyebrow">Réponse actuelle</p><p>${esc(d.answer || "Aucune réponse courte n’a encore été formulée. Consultez le rapport et les affirmations avant de conclure.")}</p><small>${d.claims.filter((claim) => claim.disposition === "supported").length} soutenue(s) · ${d.claims.filter((claim) => claim.disposition === "contested").length} contestée(s) · ${d.claims.filter((claim) => claim.disposition === "indeterminate").length} indéterminée(s)</small></section><article class="report-document">${textDocument(d.report, d.sources)}</article>` : empty("Le rapport se construit à partir des preuves.", "Recevez une proposition de l’agent ou rédigez votre brouillon. Les points non vérifiés restent visibles à l’export.", "edit-report", "Rédiger un brouillon")}
    ${proposals(d, "report")}<section class="report-references"><h2>Références du dossier</h2>${d.sources.map((s, i) => `<p id="ref-${i + 1}">${i + 1}. ${button("source", esc(s.title), "text-link", s.id)}</p>`).join("") || '<p class="muted">Aucune référence enregistrée.</p>'}<div class="actions">${button("review", `${reviewFindings(d).length} point(s) à examiner`)}${button("export-json", "Exporter le dossier de preuves")}${button("history", "Historique")}</div></section></div>`;
  }
  function render(force = false) {
    const d = dossier(),
      view = currentView(),
      fingerprint = JSON.stringify([
        location.search,
        d.id,
        d.revision,
        d.proposals.map((p) => [p.id, p.status]),
        editingReport,
      ]);
    document.querySelector("[data-dossier-title]")!.textContent = d.title;
    document.querySelector("[data-storage-state]")!.textContent =
      storageState().message;
    document.querySelector("[data-sharing-label]")!.textContent =
      workshopPermissions().readable
        ? "Dossier partagé"
        : "Partager avec mon agent";
    document.querySelector<HTMLElement>(".agent-access")!.dataset.enabled =
      String(workshopPermissions().readable);
    document.querySelector("[data-count=evidence]")!.textContent = d.sources
      .length
      ? String(d.sources.length)
      : "";
    document.querySelector("[data-count=review]")!.textContent = d.claims.length
      ? String(reviewFindings(d).length)
      : "";
    document.querySelectorAll<HTMLAnchorElement>("[data-view]").forEach((a) => {
      a.href = `/app/?dossier=${d.id}&view=${a.dataset.view}`;
      if (a.dataset.view === view) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (!force && (fingerprint === lastRender || dirty)) return;
    lastRender = fingerprint;
    disposeMap?.();
    disposeMap = undefined;
    const generation = ++mapGeneration;
    const views: Record<string, (d: Dossier) => string> = {
      question,
      plan,
      evidence,
      review,
      report,
    };
    if (view === "dossiers")
      surface.innerHTML = `<div class="wide">${header("Vos dossiers.", "Une question, un fil de preuves, une recherche que vous pouvez reprendre.", button("new", "Nouvelle recherche", "primary"))}<ul class="record-list">${allDossiers()
        .map(
          (d) =>
            `<li class="record-row"><div class="record-main">${button("open-dossier", esc(d.title), "", d.id)}<small>${esc(new Date(d.updatedAt).toLocaleString("fr-CA"))}${d.example ? " · exemple synthétique" : ""}</small></div>${button("open-dossier", "Ouvrir →", "text-link", d.id)}</li>`,
        )
        .join(
          "",
        )}</ul><div class="intro-line">${button("import", "Importer un dossier")}${button("legacy", "Importer un ancien brouillon")}${button("example", "Explorer l’exemple", "text-link")}</div></div>`;
    else
      surface.innerHTML =
        (d.example
          ? '<div class="reading example-banner">EXEMPLE SYNTHÉTIQUE · sources fictives · aucune recherche réelle</div>'
          : "") + (views[view] ?? question)(d);
    const pending = d.proposals.filter((p) => p.status === "pending").length;
    document.querySelector("[data-stage-action]")!.innerHTML = pending
      ? `<span>${pending} proposition(s)</span>${button("pending", "Examiner", "primary")}`
      : view === "question"
        ? button("plan", "Voir le plan →", "text-link")
        : view === "plan"
          ? button("evidence", "Voir les preuves →", "text-link")
          : view === "evidence"
            ? button("review", "Vérifier →", "text-link")
            : view === "review"
              ? button("report", "Lire le rapport →", "text-link")
              : button("export-json", "Exporter le dossier", "text-link");
    surface.scrollTop = scroll.get(location.search) ?? 0;
    if (currentRoute().get("map") === "1" && view === "evidence")
      void import("./evidence-map")
        .then(({ mountEvidenceMap }) => {
          if (generation !== mapGeneration) return;
          disposeMap = mountEvidenceMap(
            surface.querySelector<HTMLElement>("[data-evidence-map]")!,
            d,
            (type, id) => void action(type, id),
          );
        })
        .catch(() =>
          notice(
            "Carte indisponible : la liste fournit toutes les mêmes références.",
          ),
        );
  }
  function sharing() {
    const p = workshopPermissions();
    modal(
      `<p class="eyebrow">Votre agent · vos choix</p><h2>Partager ce dossier.</h2><p>Votre agent de navigateur utilise sa propre connexion IA. Orbit ne lance aucun modèle.</p><label class="check-row"><input type="checkbox" data-consent="read" ${p.readable ? "checked" : ""}/><span>Autoriser la lecture du dossier<small>Question, contexte, sources, rapport et décisions.</small></span></label><label class="check-row"><input type="checkbox" data-consent="write" ${p.presentationAllowed ? "checked" : ""}/><span>Recevoir les propositions de l’agent<small>Elles attendent votre revue ; elles ne remplacent pas le travail approuvé.</small></span></label><p>WebMCP : ${esc(webmcp)}. Le partage est révoqué au changement de dossier et au rechargement.</p>${button("copy-prompt", "Copier la consigne de démarrage", "primary")}<div class="dialog-divider"></div><p>La révocation bloque les outils d’Orbit. Elle n’arrête pas les recherches externes déjà lancées par votre agent.</p>`,
    );
  }
  function storage() {
    modal(
      `<p class="eyebrow">Vos données</p><h2>Reprendre plus tard.</h2><p>${esc(storageState().message)}. La copie locale est accessible aux personnes qui utilisent ce profil de navigateur.</p><div class="actions">${button(storageState().local ? "disable-storage" : "enable-storage", storageState().local ? "Retirer la copie locale" : "Autoriser une copie locale", "primary")}${button("export-json", "Exporter un fichier JSON")}</div><p>Aucune synchronisation ni transmission automatique dans Sanity. Sans copie locale ni export, fermer la session perd le dossier.</p>`,
    );
  }
  function download(name: string, type: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function action(name: string, id = "") {
    if (dirty && ["accept-proposal", "export-paper", "export-md", "export-json", "import", "legacy"].includes(name)) {
      throw Error("Enregistrez vos modifications avant cette action.");
    }
    const d = dossier();
    if (name === 'clarify-claim') {
      const claim = d.claims.find(item=>item.id===id);
      if (!claim) throw Error('Affirmation absente.');
      const scopeFields = (prefix:string,scope:unknown = {}) =>
        [['subject','Sujet'],['property','Propriété'],['value','Valeur affirmée'],['provider','Fournisseur'],['product','Produit'],['mode','Mode'],['condition','Condition'],['version','Version']]
          .map(([key,label])=>field(label,prefix+key,(scope as Record<string,string> | undefined)?.[key] ?? '',300)).join('');
      modal(`<h2>Préciser l’affirmation et ses preuves.</h2><p>Chaque passage garde sa propre portée. Laisser un attribut vide conserve l’incertitude ; la portée de la question n’est pas copiée dans les sources.</p><form data-form="claim-scope" data-id="${esc(id)}"><h3>Portée de l’affirmation</h3>${scopeFields('claim.',claim.scopeAttributes as Record<string,string>)}${claim.evidence.map((proof,index)=>`<section><h3>Passage ${index+1} · ${esc(d.sources.find(source=>source.id===proof.sourceId)?.title ?? proof.sourceId)}</h3>${field('Citation exacte','proof.'+index+'.quote',proof.quote,4000,3)}${scopeFields('proof.'+index+'.',proof.scope as Record<string,string>)}</section>`).join('')}<p>Cette modification crée une révision et demande un nouveau calcul. Elle n’accorde aucune approbation humaine.</p><button class="primary" type="submit">Enregistrer puis réexaminer</button></form>`);
      return;
    }
    if (name === 'record-classification') {
      if (dirty) throw Error('Enregistrez vos modifications avant le calcul.');
      const claim = d.claims.find(item => item.id === id);
      if (!claim) throw Error('Affirmation absente.');
      if ((d.classificationHistory?.length ?? 0) > 237) throw Error('Historique de calcul plein : exportez le dossier. Aucun résultat ne sera effacé.');
      const next = structuredClone(d);
      next.classificationHistory ??= [];
      const contentKey = await contentDigest(claimKey(d,claim));
      if (dossier().id !== d.id || dossier().revision !== d.revision) throw Error('Dossier modifié pendant le calcul.');
      for (const engine of ['baseline','n','p'] as const) {
        const result = classifyEvidence(d,claim,engine);
        next.classificationHistory.push({claimId:id,inputRevision:d.revision,contentKey,
          at:new Date().toISOString(),engine,engineVersion:result.engineVersion,decision:result.decision,reasons:result.reasons,by:'calculation'});
      }
      setDossier(next); notice('Trois calculs conservés. Aucune revue humaine accordée.'); return;
    }
    if (name === 'classification-history') {
      const claim = d.claims.find(item => item.id === id);
      const entries = (d.classificationHistory ?? []).filter(item=>item.claimId===id);
      const currentKey = claim ? await contentDigest(claimKey(d,claim)) : undefined;
      if (dossier().id !== d.id || dossier().revision !== d.revision) throw Error('Dossier modifié pendant la lecture.');
      modal(`<h2>Historique des calculs.</h2><p>Résultats dérivés, séparés de votre revue humaine.</p>${entries.map(item=>`<section><h3>${esc(item.engine)} · ${esc(item.decision)}</h3><p>${esc(item.engineVersion)} · révision ${item.inputRevision} · ${esc(item.at)}</p><p>${currentKey && item.contentKey===currentKey ? 'Preuves et portée inchangées' : 'À revoir : données modifiées ou affirmation absente'}</p><ul>${item.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul></section>`).join('') || '<p>Aucun calcul conservé.</p>'}`);
      return;
    }
    if (
      ["question", "plan", "evidence", "review", "report", "dossiers"].includes(
        name,
      )
    ) {
      go(name);
      return;
    }
    if (name === "axis") {
      go("plan", { axis: id });
      notice("Axe sélectionné : " + d.axes[Number(id.slice(5))]);
      return;
    }
    if (name === "source") {
      const previous = currentRoute();
      const returnTo = {
        q: previous.get("q") ?? "",
        status: previous.get("status") ?? "",
      };
      go("evidence", { source: id });
      history.replaceState({ ...history.state, evidenceReturn: returnTo }, "");
      return;
    }
    if (name === "screen-include" || name === "screen-exclude") {
      if (!d.sources.some((source) => source.id === id)) throw Error("Source introuvable.");
      modal(`<h2>${name === "screen-include" ? "Inclure" : "Écarter"} cette source</h2><p>Comparez-la aux critères du plan. La décision sera liée au contenu actuel.</p><form data-form="source-screening" data-id="${esc(id)}" data-decision="${name === "screen-include" ? "included" : "excluded"}">${field("Motif de la décision", "reason", "", 2000, 3)}<button class="primary" type="submit">Enregistrer ma décision</button></form>`);
      return;
    }
    if (name === "claim") {
      go("review", { claim: id });
      return;
    }
    if (name === "back-evidence") {
      const saved = history.state?.evidenceReturn;
      if (saved) {
        go("evidence", saved);
      } else {
        go("evidence");
      }
      return;
    }
    if (name === "map") {
      go("evidence", { map: "1" });
      return;
    }
    if (name === "sharing") {
      sharing();
      return;
    }
    if (name === "storage") {
      storage();
      return;
    }
    if (name === "new" || name === "example") {
      if (dirty)
        throw Error(
          "Enregistrez vos modifications avant de changer de dossier.",
        );
      addDossier(name === "example" ? exampleDossier() : createDossier());
      go(name === "example" ? "review" : "question");
      return;
    }
    if (name === "case-provider" || name === "case-sanity") {
      if (dirty) throw Error("Enregistrez vos modifications avant d’ouvrir un autre cas.");
      const seed = guidedCases[name === "case-provider" ? "provider" : "sanity"];
      const next = createDossier();
      next.title = seed.title;
      next.question = seed.question;
      next.objective = seed.objective;
      next.context = seed.context;
      next.axes = [...seed.axes];
      next.screeningCriteria = [...seed.criteria];
      addDossier(next);
      go("question");
      notice("Cas guidé créé. Vérifiez et ajustez la question avant d’approuver le plan.");
      return;
    }
    if (name === "open-dossier") {
      if (dirty) throw Error("Enregistrez vos modifications.");
      if (!selectDossier(id)) throw Error("Dossier introuvable.");
      go("question");
      return;
    }
    if (name === "approve-plan") {
      if (dirty) throw Error("Enregistrez les axes avant de les approuver.");
      if (!d.question.trim() || !d.axes.length)
        throw Error("Ajoutez une question et au moins un axe.");
      const next = checkpoint(d, "Plan approuvé par l’humain");
      next.approvedPlan = next.revision;
      commit(next);
      notice("Plan approuvé. Votre agent peut poursuivre.");
      return;
    }
    if (name === "accept-proposal") {
      commit(acceptProposal(d, id));
      notice(
        "Proposition intégrée. L’ancienne version reste dans l’historique.",
      );
      return;
    }
    if (name === "reject-proposal") {
      const p = d.proposals.find((p) => p.id === id);
      if (p) p.status = "rejected";
      setDossier(d);
      return;
    }
    if (name === "pending") {
      const p = d.proposals.find((p) => p.status === "pending");
      if (p) go(p.stage);
      return;
    }
    if (name === "edit-report") {
      if (dirty)
        throw Error("Enregistrez le rapport avant de quitter l’édition.");
      editingReport = !editingReport;
      render(true);
      return;
    }
    if (name === "export-paper") {
      download(
        `orbit-whitepaper-${d.id}.html`,
        "text/html;charset=utf-8",
        publicationHtml(d),
      );
      notice(
        "Document exporté. Ouvrez-le puis Imprimer → PDF ; le dossier de preuves reste un export séparé.",
      );
      return;
    }
    if (name === "drive") {
      modal(
        `<h2>Vos documents Google Drive.</h2><p>Choisissez un Google Doc, un fichier texte ou Markdown. Orbit lit uniquement le document sélectionné. Les 12 000 premiers caractères sont conservés comme extrait, avec son lien. PDF, images et tableaux nécessitent encore une extraction séparée.</p><p>Les extraits seront lisibles par votre agent si vous partagez ce dossier. Google demande un accès aux fichiers choisis ; Orbit utilise uniquement des appels de lecture.</p><div class="actions">${button("drive-prepare", "Préparer la connexion Google", "primary")}${driveConnected() ? button("drive-disconnect", "Déconnecter Google") : ""}</div>`,
      );
      return;
    }
    if (name === "drive-disconnect") {
      await disconnectDrive();
      notice(
        "Autorisation Drive révoquée. Les extraits déjà ajoutés restent dans votre dossier.",
      );
      action("drive");
      return;
    }
    if (name === "drive-prepare") {
      if (d.sources.length >= 30)
        throw Error("Budget de trente sources atteint.");
      const targetId = d.id;
      openDrive = await prepareDrivePicker(
        (source) => {
          const active = dossier();
          if (active.id !== targetId) {
            notice("Dossier changé pendant la sélection : import annulé.");
            return;
          }
          if (active.sources.some((s) => s.id === source.id)) {
            notice("Ce document est déjà présent.");
            return;
          }
          if (active.sources.length >= 30) {
            notice("Budget de trente sources atteint.");
            return;
          }
          const next = checkpoint(active, "Extrait Drive choisi par l’humain");
          next.sources.push(source);
          commit(next);
          go("evidence", { source: source.id });
          notice(
            "Extrait Drive importé, limité à 12 000 caractères ; le document original conserve le texte complet.",
          );
        },
        (error) => notice(error.message),
      );
      modal(
        `<h2>Sélectionner un document.</h2><p>Le prochain clic ouvre Google. Choisissez votre compte, puis accordez l’accès aux fichiers que vous sélectionnez.</p>${button("drive-open", "Continuer avec Google", "primary")}`,
      );
      return;
    }
    if (name === "drive-open") {
      dialog.close();
      openDrive?.();
      return;
    }
    if (name === "export-md") {
      download(
        `orbit-${d.id}.md`,
        "text/markdown;charset=utf-8",
        exportMarkdown(d),
      );
      return;
    }
    if (name === "export-json") {
      download(
        `orbit-${d.id}.json`,
        "application/json",
        JSON.stringify(d, null, 2),
      );
      return;
    }
    if (name === "import") {
      importer.click();
      return;
    }
    if (name === "legacy") {
      const old = readLegacyDraft();
      if (!old)
        throw Error(
          "Aucun ancien brouillon anonyme trouvé dans ce navigateur. Les dossiers liés à un compte doivent être exportés depuis leur ancien espace.",
        );
      const fresh = createDossier();
      Object.assign(fresh, {
        question: old.question,
        context: old.context,
        axes: old.axes,
        sources: old.sources,
        report: old.report,
        title: old.question.slice(0, 90) || "Brouillon importé",
      });
      addDossier(parseDossier(fresh));
      go("question");
      notice("Brouillon importé explicitement, sans partage.");
      return;
    }
    if (name === "enable-storage") {
      await enableLocalStorage();
      storage();
      return;
    }
    if (name === "disable-storage") {
      await disableLocalStorage();
      storage();
      return;
    }
    if (name === "copy-prompt") {
      await navigator.clipboard.writeText(
        "Sur cette page Orbit, appelle orbit_get_capabilities puis orbit_get_research_protocol. Si je partage le dossier, lis orbit_get_research_request et orbit_get_mission_summary pour obtenir requestId et revision. Lis réellement le sommaire Sanity via orbit_sanity_initial_context, sélectionne seulement les chemins utiles, puis lis-les avec orbit_sanity_read_entries. Propose d’abord un plan via orbit_present_research (stage: plan, expectedRevision). Attends mon approbation avant toute proposition de preuves ou de rapport. Pour chaque affirmation, conserve les passages exacts, le type de relation, la portée (fournisseur, produit, mode, version), les conditions, la date ou version, et les chemins/digests Context concernés. Marque la conclusion soutenue, contestée ou indéterminée ; ne transforme jamais une différence de portée en conflit. Distingue une entrée Knowledge Base de son document original. Pour le rapport, dépose une réponse courte, des citations [[source:ID]], les affirmations structurées et les limites. Ne prétends jamais avoir relu une URL, une décision humaine ou une approbation qui n’a pas été fournie. Signale les accès et preuves manquants.",
      );
      notice("Consigne copiée. Collez-la dans votre agent navigateur.");
      return;
    }
    if (name === 'engine') {
      if (!['baseline', 'n', 'p'].includes(id)) throw Error('Moteur inconnu.');
      const next = checkpoint(d, 'Moteur choisi par l’humain');
      next.classificationEngine = id as Dossier['classificationEngine'];
      setPermissions(false, false);
      commit(next);
      notice('Moteur changé. Les accès de l’agent sont révoqués; partagez de nouveau ce dossier pour la prochaine mission.');
      dialog.close();
      return;
    }
    if (name === "settings") {
      modal(
        `<h2>Votre espace Orbit.</h2><p>${esc(storageState().message)}</p><div class="actions">${button("storage", "Stockage")}${button("sharing", "Autorisations")}${button("sanity", "Connexion Sanity")}${button("history", "Historique")}</div><div class="dialog-divider"></div><h3>Moteur de classement : ${esc(d.classificationEngine ?? 'n')}</h3><p>Changer le moteur crée une révision et révoque le partage. Le benchmark n’a pas encore établi de supériorité.</p><div class="actions">${button('engine', 'N · preuves indépendantes', 'secondary', 'n')}${button('engine', 'P · relations par attributs', 'secondary', 'p')}${button('engine', 'Référence simple', 'secondary', 'baseline')}</div><p>Texte et données restent utilisables sans WebGL. Le mouvement réduit suit les préférences de votre système.</p><a href="/guide/">Lire le guide complet ↗</a>`,
      );
      return;
    }
    if (name === "search") {
      modal(
        `<h2>Rechercher dans le dossier.</h2><label class="field"><span>Titre, URL ou affirmation</span><input data-search autofocus /></label><div class="search-results" data-search-results></div>`,
      );
      dialog.querySelector<HTMLInputElement>("[data-search]")!.focus();
      return;
    }
    if (name === "help") {
      tour = 0;
      action("tour");
      return;
    }
    if (name === "tour") {
      const steps = [
        [
          "Posez votre question.",
          "Dans Question, précisez le résultat attendu, puis enregistrez.",
          "question",
        ],
        [
          "Examinez une preuve.",
          "Dans Preuves, ouvrez une source : vérifiez son passage et son périmètre.",
          "evidence",
        ],
        [
          "Reprenez votre recherche.",
          "Exportez le dossier ou autorisez sa copie locale. Le rapport reste modifiable.",
          "report",
        ],
      ];
      const s = steps[tour];
      go(s[2]);
      modal(
        `<p class="eyebrow">Le parcours · ${tour + 1}/3</p><h2>${s[0]}</h2><p>${s[1]}</p>${button(tour < 2 ? "tour-next" : "tour-close", tour < 2 ? "Étape suivante" : "Commencer", "primary")}`,
      );
      return;
    }
    if (name === "tour-next") {
      tour++;
      action("tour");
      return;
    }
    if (name === "tour-close") {
      dialog.close();
      return;
    }
    if (name === "history") {
      modal(
        `<h2>Versions conservées.</h2><p>Révision actuelle : ${d.revision}. Les versions antérieures sont consultables et incluses dans l’export.</p>${d.history.map((h) => `<div class="history-row"><strong>Révision ${h.revision}</strong><p>${esc(h.reason)} · ${esc(h.at)}</p>${button("history-detail", "Examiner", "text-link", String(h.revision))}</div>`).join("") || "<p>Aucune modification enregistrée.</p>"}`,
      );
      return;
    }
    if (name === "history-detail") {
      const h = d.history.find((h) => h.revision === Number(id));
      if (h)
        modal(
          `<h2>Révision ${h.revision}</h2><p>${esc(h.reason)}</p><pre class="readable-text">${esc(JSON.stringify(h, null, 2))}</pre>`,
        );
      return;
    }
    if (name === "add-source") {
      modal(
        `<h2>Ajouter une preuve.</h2><form data-form="source">${field("Titre", "title", "", 500)}${field("URL originale", "url", "", 2000)}${field("Passage conservé", "text", "", 12000, 4)}<label class="field"><span>Lecture effectuée</span><select name="status"><option value="discovered">URL repérée seulement</option><option value="excerpt-read">Extrait lu</option><option value="read">Document lu</option></select></label><button class="primary" type="submit">Ajouter au dossier</button></form>`,
      );
      return;
    }
    if (name === "review-accept" || name === "review-reject") {
      modal(
        `<h2>${name === "review-accept" ? "Accepter après examen" : "Demander une correction"}</h2><form data-form="human-review" data-id="${esc(id)}" data-decision="${name === "review-accept" ? "accepted" : "needs-work"}">${field("Votre justification", "note", "", 3000, 4)}<p>Cette décision sera enregistrée comme une revue humaine de la version actuelle.</p><button class="primary" type="submit">Enregistrer ma décision</button></form>`,
      );
      return;
    }
    if (name === "sanity") {
      modal(
        `<h2>La méthode, à sa source.</h2><p>Lecture de la base publique de méthodes, sans envoyer votre question. État : <strong>${esc(sanity)}</strong>.</p><div class="actions">${button("sanity-outline", "Lire le sommaire", "primary")}</div>${outline ? `<pre class="readable-text">${esc(JSON.stringify(outline.content, null, 2))}</pre><form data-form="sanity-entry">${field("Chemin exact d’une entrée du sommaire", "path", "", 200)}<button class="secondary" type="submit">Lire cette entrée</button></form>` : ""}${entryResult ? `${entryResult.provenance?.status === "incomplete" ? `<p class="status-note amber"><strong>Provenance incomplète.</strong> ${esc(String(entryResult.provenance.referencesWithoutOriginalUrl))} référence(s) sans URL d’origine dans le texte reçu. Aucun lien n’est déduit du titre ; les documents originaux restent à vérifier. <a href="/guide/#context-provenance">Comprendre ce contrôle ↗</a></p>` : ""}<pre class="readable-text">${esc(JSON.stringify(entryResult.content, null, 2))}</pre>` : ""}`,
      );
      return;
    }
    if (name === "sanity-outline") {
      notice("Lecture de Sanity Context…");
      const result: any = await orbitTools()
        .find((t) => t.name === "orbit_sanity_initial_context")!
        .execute({});
      sanity =
        result.state === "READY"
          ? `Lu à ${result.retrievedAt}`
          : `Indisponible · ${result.reason}`;
      if (result.state === "READY") outline = result;
      action("sanity");
      return;
    }
    if (name === "verify-context") {
      if (!d.knowledgeReads.length) {
        notice("Aucune entrée Sanity conservée dans ce dossier. Ouvrez une entrée depuis le plan.");
        return;
      }
      notice("Revérification des entrées Sanity conservées…");
      const previous = d.knowledgeReads;
      const current = [];
      for (const entry of previous) {
        const result: any = await orbitTools()
          .find((tool) => tool.name === "orbit_sanity_read_entries")!
          .execute({ paths: [entry.path] });
        if (result.state !== "READY") throw Error(`Sanity indisponible : ${result.reason}`);
        current.push({ path: entry.path, digest: await contentDigest(result.content),
          retrievedAt: result.retrievedAt, verifiedAt: new Date().toISOString() });
      }
      const changed = changedKnowledgeReads(previous, current);
      const next = changed.length
        ? checkpoint(d, "Entrées Sanity modifiées")
        : structuredClone(d);
      next.knowledgeReads = next.knowledgeReads.map((entry) =>
        current.find((read) => read.path === entry.path) ?? entry);
      if (changed.length) next.approvedPlan = undefined;
      commit(next);
      notice(`${previous.length} entrée(s) revérifiée(s)${changed.length ? ` · ${changed.length} modifiée(s) : revoir les conclusions liées` : " · aucune modification détectée"}.`);
      return;
    }
  }
  document.addEventListener(
    "click",
    (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-action],[data-view],[data-close]",
      );
      if (!target) return;
      if (target.hasAttribute("data-close")) {
        dialog.close();
        return;
      }
      event.preventDefault();
      if (target.dataset.view) {
        go(target.dataset.view);
        return;
      }
      void action(target.dataset.action!, target.dataset.id).catch((e) =>
        notice(e.message),
      );
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "submit",
    (event) => {
      const form = (event.target as HTMLElement).closest<HTMLFormElement>(
        "[data-form]",
      );
      if (!form) return;
      event.preventDefault();
      void (async () => {
        const data = new FormData(form),
          value = (key: string) => String(data.get(key) ?? "").trim(),
          d = dossier();
        switch (form.dataset.form) {
          case "question": {
            if (!value("question")) throw Error("Ajoutez votre question.");
            const next = checkpoint(d, "Question modifiée par l’humain");
            next.question = value("question");
            next.objective = value("objective");
            next.context = value("context");
            next.title = next.question.slice(0, 100);
            next.approvedPlan = undefined;
            commit(next);
            notice("Question enregistrée.");
            break;
          }
          case "plan": {
            const axes = value("axes")
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);
            const criteria = value("criteria").split("\n").map((x) => x.trim()).filter(Boolean);
            if (axes.length > 9 || axes.some((a) => a.length > 300))
              throw Error("Neuf axes maximum, 300 caractères par axe.");
            if (criteria.length > 12 || criteria.some((item) => item.length > 300))
              throw Error("Douze critères maximum, 300 caractères par critère.");
            const next = checkpoint(d, "Axes modifiés par l’humain");
            next.axes = axes;
            next.screeningCriteria = criteria;
            next.approvedPlan = undefined;
            commit(next);
            notice("Axes enregistrés.");
            break;
          }
          case "filter":
            go("evidence", { q: value("q"), status: value("status") });
            break;
          case "report": {
            const next = checkpoint(d, "Rapport modifié par l’humain");
            next.title = value("title") || d.title;
            next.answer = value("answer");
            next.report = value("report");
            editingReport = false;
            commit(next);
            notice("Nouvelle version conservée.");
            break;
          }
          case "source": {
            if (d.sources.length >= 30)
              throw Error("Budget de trente sources atteint.");
            const source = parseEvidence({
              id: `source_${crypto.randomUUID()}`,
              title: value("title"),
              url: value("url"),
              text: value("text"),
              status: value("status"),
              retrievedAt: new Date().toISOString(),
            });
            const next = checkpoint(d, "Source ajoutée manuellement");
            next.sources.push(source);
            commit(next);
            dialog.close();
            go("evidence");
            break;
          }
          case "human-review": {
            const c = d.claims.find((c) => c.id === form.dataset.id);
            if (!c) throw Error("Affirmation introuvable.");
            if (!value("note")) throw Error("Ajoutez une justification.");
            const next = checkpoint(d, "Revue humaine enregistrée");
            next.reviews = next.reviews.filter((r) => r.claimId !== c.id);
            next.reviews.push({
              claimId: c.id,
              decision: form.dataset.decision as "accepted" | "needs-work",
              note: value("note"),
              by: "human",
              at: new Date().toISOString(),
              contentKey: claimKey(d, c),
            });
            commit(next);
            dialog.close();
            notice("Décision enregistrée.");
            break;
          }
          case 'claim-scope': {
            const next = checkpoint(d,'Portée et passages précisés manuellement');
            const claim = next.claims.find(item=>item.id===form.dataset.id);
            if (!claim) throw Error('Affirmation absente.');
            const readScope = (prefix:string,previous:unknown) => {
              const scope = {...(previous ?? {}) as Record<string,unknown>};
              for (const key of ['subject','property','value','provider','product','mode','condition','version']) {
                const entered = value(prefix+key); if (entered) scope[key]=entered; else delete scope[key];
              }
              return scope;
            };
            const target = readScope('claim.',claim.scopeAttributes);
            claim.scopeAttributes = target as typeof claim.scopeAttributes;
            claim.evidence = claim.evidence.map((proof,index)=>{
              const scope=readScope('proof.'+index+'.',proof.scope);
              return {...proof,quote:value('proof.'+index+'.quote'),scope:Object.keys(scope).length ? scope as typeof proof.scope : undefined};
            });
            commit(parseDossier(next)); dialog.close(); notice('Nouvelle révision enregistrée. Vérifiez le classement et les raisons de HOLD.'); break;
          }
          case "source-screening": {
            const source = d.sources.find((item) => item.id === form.dataset.id);
            if (!source) throw Error("Source introuvable.");
            if (!value("reason")) throw Error("Expliquez cette décision.");
            const next = checkpoint(d, "Admission d’une source décidée par l’humain");
            next.sourceDecisions = next.sourceDecisions.filter((item) => item.sourceId !== source.id);
            next.sourceDecisions.push({ sourceId: source.id,
              decision: form.dataset.decision as "included" | "excluded", reason: value("reason"),
              by: "human", at: new Date().toISOString(), contentKey: sourceKey(source) });
            commit(next);
            dialog.close();
            notice("Décision enregistrée pour cette version de la source.");
            break;
          }
          case "sanity-entry": {
            const path = value("path");
            const result: any = await orbitTools()
              .find((t) => t.name === "orbit_sanity_read_entries")!
              .execute({ paths: [path] });
            if (result.state !== "READY")
              throw Error(`Sanity indisponible : ${result.reason}`);
            const next = checkpoint(d, "Entrée Sanity consultée");
            next.knowledgeReads = next.knowledgeReads.filter((entry) => entry.path !== path);
            next.knowledgeReads.push({ path, digest: await contentDigest(result.content),
              retrievedAt: result.retrievedAt, verifiedAt: new Date().toISOString() });
            commit(next);
            entryResult = result;
            sanity = `Entrée lue à ${result.retrievedAt}`;
            action("sanity");
            break;
          }
        }
      })().catch((e) => notice(e.message));
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "change",
    (event) => {
      const el = event.target as HTMLInputElement;
      if (el.dataset.consent) {
        const read = dialog.querySelector<HTMLInputElement>(
            "[data-consent=read]",
          )!.checked,
          write = dialog.querySelector<HTMLInputElement>(
            "[data-consent=write]",
          )!;
        if (!read) write.checked = false;
        setPermissions(read, write.checked);
      }
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "input",
    (event) => {
      const el = event.target as HTMLInputElement;
      if (el.hasAttribute("data-search")) {
        const q = el.value.toLowerCase(),
          d = dossier();
        dialog.querySelector("[data-search-results]")!.innerHTML =
          [
            ...d.sources
              .filter((s) => `${s.title} ${s.url}`.toLowerCase().includes(q))
              .map((s) => button("source", esc(s.title), "", s.id)),
            ...d.claims
              .filter((c) => c.statement.toLowerCase().includes(q))
              .map((c) => button("claim", esc(c.statement), "", c.id)),
          ].join("") || "<p>Aucun résultat.</p>";
        return;
      }
      if (
        el.closest("[data-form=question],[data-form=plan],[data-form=report]")
      )
        dirty = true;
    },
    { signal: events.signal },
  );
  importer.addEventListener(
    "change",
    () =>
      void (async () => {
        const file = importer.files?.[0];
        if (!file) return;
        if (file.size > 8_000_000)
          throw Error("Dossier trop volumineux (8 Mo maximum).");
        const imported = parseDossier(JSON.parse(await file.text()));
        imported.id = createDossier().id;
        addDossier(imported);
        go("question");
        notice(
          "Dossier importé comme copie indépendante ; les décisions proviennent du fichier importé.",
        );
        importer.value = "";
      })().catch((e) => notice(e.message)),
    { signal: events.signal },
  );
  window.addEventListener(
    "popstate",
    () => {
      if (dirty) {
        const delta = navigationIndex - (history.state?.orbitIndex ?? 0);
        if (delta) history.go(delta);
        else history.replaceState({ orbitIndex: navigationIndex }, "", lastUrl);
        notice(
          "Modifications conservées à l’écran : enregistrez avant de naviguer.",
        );
        return;
      }
      navigationIndex = history.state?.orbitIndex ?? 0;
      lastUrl = location.href;
      dialog.close();
      const id = currentRoute().get("dossier");
      if (id && id !== dossier().id && !selectDossier(id))
        notice("Ce dossier n’est pas disponible dans cette session.");
      render(true);
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        action("search");
      }
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "beforeunload",
    (event) => {
      if (dirty || (!storageState().local && !!dossier().question)) {
        event.preventDefault();
        event.returnValue = "";
      }
    },
    { signal: events.signal },
  );
  document.addEventListener("orbit:workshop-updated", () => render(), {
    signal: events.signal,
  });
  const found = await activateWorkshop(
    currentRoute().get("dossier") ?? undefined,
  );
  if (!found)
    notice(
      "Le dossier demandé n’est pas conservé sur cet appareil. Importez sa sauvegarde pour le reprendre.",
    );
  history.replaceState(
    { orbitIndex: 0 },
    "",
    `/app/?${new URLSearchParams({ ...Object.fromEntries(currentRoute()), dossier: dossier().id })}`,
  );
  render(true);
  try {
    webmcp =
      (await registerOrbitTools()) === "registered"
        ? `${orbitTools().length} outils disponibles`
        : "non disponible dans ce navigateur";
  } catch {
    webmcp = "enregistrement indisponible";
  }
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) {
        events.abort();
        disposeMap?.();
        clearTimeout(toastTimer);
      }
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) void registerOrbitTools();
    },
    { signal: events.signal },
  );
}
