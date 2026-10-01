import {
  reviewFindings,
  type Dossier,
} from "../../../packages/evidence-review/src/index";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/** Deliberately small safe Markdown subset. Raw HTML and remote media never execute. */
export function reportMarkup(
  markdown: string,
  sources: Dossier["sources"] = [],
): string {
  const inline = (text: string) =>
    escape(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[\[source:([A-Za-z0-9_-]+)\]\]/g, (_, id) => {
        const i = sources.findIndex((s) => s.id === id);
        return i < 0
          ? `[Référence introuvable : ${escape(id)}]`
          : `<a href="#ref-${i + 1}" aria-label="Référence ${i + 1}">[${i + 1}]</a>`;
      });
  const lines = markdown.split("\n"),
    out: string[] = [];
  let paragraph: string[] = [],
    code: string[] | null = null,
    list = false;
  const flush = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
    if (list) {
      out.push("</ul>");
      list = false;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      flush();
      if (code) {
        out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
        code = null;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(Math.max(heading[1].length, 2), 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (line.includes("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? "")) {
      flush();
      const cells = (r: string) =>
        r
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((s) => s.trim());
      const headers = cells(line);
      i++;
      out.push(
        `<table><thead><tr>${headers.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>`,
      );
      while ((lines[i + 1] ?? "").includes("|")) {
        i++;
        out.push(
          `<tr>${cells(lines[i])
            .map((c) => `<td>${inline(c)}</td>`)
            .join("")}</tr>`,
        );
      }
      out.push("</tbody></table>");
      continue;
    }
    const item = /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
    if (item) {
      if (!list) {
        flush();
        out.push("<ul>");
        list = true;
      }
      out.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();
  if (code) out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
  return out.join("\n");
}

export function publicationHtml(d: Dossier): string {
  const findings = reviewFindings(d);
  const claimAuditRows = d.claims
    .map((claim) => {
      const disposition =
        claim.disposition === "supported"
          ? "Soutenue"
          : claim.disposition === "contested"
            ? "Contestée"
            : "Indéterminée";
      const context = claim.contextReads?.length
        ? claim.contextReads
            .map((read) => `${read.path} (${read.digest.slice(0, 16)}…)`)
            .join("<br>")
        : "Lectures Context du dossier (compatibilité ancienne)";
      return `<tr><td><strong>${escape(claim.statement)}</strong><br><span class="small">${disposition}</span></td><td>${escape(claim.scope || "Portée non fournie.")}<br><span class="small">${escape(claim.conditions?.join(" · ") || "Conditions non fournies.")} ${claim.effectiveAt ? `· ${escape(claim.effectiveAt)}` : ""}</span></td><td>${context}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><meta name="description" content="Dossier de recherche Orbit — document à relire"><title>${escape(d.title)}</title><style>
  @page{size:A4;margin:22mm 20mm 23mm;@bottom-right{content:counter(page);font:9pt Arial;color:#52617e}}
  *{box-sizing:border-box}body{margin:0;background:#e6e9f1;color:#17233a;font:11pt/1.5 Georgia,'Times New Roman',serif}main{max-width:210mm;margin:30px auto;padding:22mm 20mm;background:#fff;box-shadow:0 12px 50px #17233a22}h1,h2,h3,h4,.label,.meta,nav{font-family:Arial,'Segoe UI',sans-serif}h1{font-size:34pt;line-height:1.12;letter-spacing:-1.4px}h2{font-size:17pt;line-height:1.25;margin:22pt 0 9pt;color:#243367}h3{font-size:14pt;margin-top:22pt}h4{font-size:12pt}p{margin:0 0 9pt;orphans:3;widows:3}h1,h2,h3,h4{break-after:avoid}a{color:#17617a;overflow-wrap:anywhere}code{font:9pt Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:12pt;background:#f1f4f9}table{border-collapse:collapse;width:100%;font:9.5pt/1.5 Arial;margin:18pt 0;break-inside:avoid}thead{display:table-header-group}th{text-align:left;background:#e8edf8;color:#243367}th,td{padding:8pt;border-bottom:1px solid #d8ddeb;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}.cover{border-top:5px solid #6659b3;min-height:210mm;display:flex;flex-direction:column;justify-content:center;break-after:page}.label{font-size:10pt;letter-spacing:3px;color:#17617a;text-transform:uppercase}.rule{width:65px;border-top:3px solid #b67f30;margin:28pt 0}.meta{font-size:10pt;line-height:1.7;color:#52617e}.notice{padding:12pt;border-left:3px solid #b67f30;background:#faf6ed;font:10pt/1.6 Arial}.appendix{border-top:1px solid #d8ddeb;margin-top:24pt;padding-top:8pt}li{margin-bottom:7pt}blockquote{border-left:2px solid #7d91ed;padding-left:16pt;margin-left:0}nav{margin:16px auto;max-width:210mm;font-size:14px}.refs li{margin:0 0 13pt}.small{font-size:9pt;color:#52617e}
  @media print{body{background:white}main{max-width:none;margin:0;padding:0;box-shadow:none}nav{display:none}.cover{min-height:245mm}a{color:#17233a}thead{display:table-header-group}}
  </style></head><body><nav>Document de travail · utilisez Imprimer → Enregistrer au format PDF. Relisez les pages avant diffusion.</nav><main>
  <section class="cover"><p class="label">orbit. / dossier de recherche</p><h1>${escape(d.title)}</h1><div class="rule"></div><p>${escape(d.objective || d.question)}</p><p class="meta">Révision ${d.revision}<br>Date du dossier : ${escape(d.updatedAt.slice(0, 10))}<br>${d.sources.length} sources · ${d.claims.length} affirmations structurées</p><p class="notice">${d.example ? "EXEMPLE SYNTHÉTIQUE — sources fictives." : "Document de travail — auteur, usage de l’IA et autorisation de publication à compléter par la personne responsable."}<br>${findings.length} point(s) de contrôle restent à examiner.</p></section>
  <section><p class="label">Question étudiée</p><p>${escape(d.question)}</p><h2>Réponse actuelle</h2><p class="notice">${escape(d.answer || "Aucune réponse courte n’a été formulée. Le rapport et ses preuves doivent être lus avant de conclure.")}</p></section>
  <section><h2>Audit des conclusions</h2><p>Chaque ligne relie une conclusion proposée à sa portée et aux entrées Sanity Context déclarées. Le statut décrit ce que le dossier permet actuellement de dire ; il ne mesure pas une vérité scientifique.</p><table><thead><tr><th>Affirmation et statut</th><th>Portée, conditions, date/version</th><th>Entrée Context → affirmation → réponse</th></tr></thead><tbody>${claimAuditRows || '<tr><td colspan="3">Aucune affirmation structurée.</td></tr>'}</tbody></table></section>
  <section><h2>Méthode et sélection</h2><p>Les critères et décisions ci-dessous décrivent le travail consigné dans le dossier. Ils ne certifient pas la validité scientifique des sources.</p><h3>Critères</h3><ul>${d.screeningCriteria.map((criterion) => `<li>${escape(criterion)}</li>`).join("") || "<li>Aucun critère enregistré.</li>"}</ul><h3>Décisions sur les sources</h3><table><thead><tr><th>Source</th><th>Décision humaine</th><th>Motif</th></tr></thead><tbody>${d.sourceDecisions.map((decision) => `<tr><td>${escape(d.sources.find((source) => source.id === decision.sourceId)?.title ?? decision.sourceId)}</td><td>${decision.decision === "included" ? "Retenue" : "Écartée"}</td><td>${escape(decision.reason)}</td></tr>`).join("") || '<tr><td colspan="3">Aucune décision enregistrée.</td></tr>'}</tbody></table></section>
  <article>${reportMarkup(d.report || "Rapport en attente de rédaction.", d.sources)}</article>
  <section class="appendix"><h2>Extractions contrôlables</h2><table><thead><tr><th>Champ</th><th>Valeur</th><th>Passage</th></tr></thead><tbody>${d.extractions.map((row) => `<tr><td>${escape(row.field)}</td><td>${escape(row.value)}</td><td>${escape(row.quote)}</td></tr>`).join("") || '<tr><td colspan="3">Aucune extraction enregistrée.</td></tr>'}</tbody></table><h2>Entrées Sanity Context déclarées</h2><ul>${d.knowledgeReads.map((read) => `<li>${escape(read.path)} · empreinte ${escape(read.digest.slice(0, 16))}… · ${escape(read.retrievedAt)} · ${read.verifiedAt ? "revérifié par Orbit" : "non revérifié par Orbit"}</li>`).join("") || "<li>Aucune lecture conservée.</li>"}</ul><h2>Références et statut des lectures</h2><ol class="refs">${d.sources.map((s, i) => `<li id="ref-${i + 1}"><strong>${escape(s.title)}</strong><br><a href="${escape(s.url)}">${escape(s.url)}</a><br><span class="small">${escape(s.publisher ?? "Éditeur non renseigné")} · ${escape(s.status)} · ${escape(s.retrievedAt ?? "Date non renseignée")}</span></li>`).join("")}</ol><h2>Dossier de preuves associé</h2><p>Les passages exacts, affirmations, propositions et décisions sont fournis dans le fichier JSON associé. Cette annexe technique reste séparée pour garder le white paper lisible.</p><h2>Limites à examiner</h2><p>${findings.length} point(s) dans le dossier ; cinq premiers affichés ci-dessous.</p><ul>${findings.slice(0,5).map((f) => `<li>${escape(f.claimId)} — ${escape(f.message)}</li>`).join("") || "<li>Aucune alerte structurelle détectée ; la validité scientifique reste à examiner.</li>"}</ul><p class="small">Les liens, passages et décisions sont vérifiables dans le dossier JSON exporté. Cette mise en page ne constitue pas une validation scientifique ni une autorisation de publication.</p></section>
  </main></body></html>`;
}
