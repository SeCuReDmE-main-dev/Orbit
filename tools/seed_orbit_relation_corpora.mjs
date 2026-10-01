/**
 * Idempotent seed for Orbit's four logical research corpora.
 *
 * Dry-run by default. Pass --apply with SANITY_API_TOKEN loaded from the
 * project-private .env. Existing documents are never overwritten.
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectId = process.env.SANITY_PROJECT_ID || 'pzscx4w8'
const dataset = process.env.SANITY_DATASET || 'production'
const apiVersion = '2026-09-29'
const apply = process.argv.includes('--apply')
const observedAt = '2026-09-29T00:00:00.000Z'
const ref = (_ref, _key) => ({ _key, _type: 'reference', _ref })

const ids = {
  corpora: {
    clean: 'orbit-corpus-clean-reference',
    direct: 'orbit-corpus-direct-contradiction',
    scope: 'orbit-corpus-scope-ambiguity',
    version: 'orbit-corpus-version-evolution',
  },
  sources: {
    context: 'orbit-source-sanity-context-mcp-reference-20260903',
    geminiResearch: 'orbit-source-google-gemini-deep-research-20260923',
    geminiZdr: 'orbit-source-google-gemini-zdr-20260929',
    contextV1: 'orbit-source-sanity-context-package-1-0-0',
    contextV2: 'orbit-source-sanity-context-changelog-2-0-0',
  },
}

const passages = {
  context: "Context MCP is the hosted Model Context Protocol server behind Sanity Context. It gives agents structured, read-only access to your content: in GROQ mode, the schema and the documents your configuration allows; in Knowledge Base mode, the Knowledge Bases you choose to serve. It doesn't run the agent loop itself, and it can't write back to your dataset; see Mutations.",
  geminiResearch: 'Store requirement: Agent execution using `background=True` requires `store=True`.',
  geminiZdr: 'Interactions API: The Interactions API manages the active state of a conversation to enable multi-turn turns. By default, the Interactions API enables state storage. To ensure a zero-data footprint, you must explicitly set the `store` parameter to `false` in your API requests to opt out of the default state retention.',
  contextV1: 'Registers a document type for configuring AI agent access to your Sanity content. Each document defines a content filter that scopes what an agent can query.',
  contextV2: 'New setups create an MCP endpoint in the Context app instead.',
}

const sources = [
  {
    _id: ids.sources.context,
    _type: 'source',
    title: 'Context MCP reference',
    url: 'https://www.sanity.io/docs/ai/sanity-context-mcp',
    publisher: 'Sanity',
    version: 'Documentation observed 2026-09-29',
    observedAt,
    excerpt: passages.context,
    auditState: 'active',
    auditNote: 'Official product documentation; exact passage retained for the clean-reference case.',
    corpora: [ref(ids.corpora.clean, 'clean')],
  },
  {
    _id: ids.sources.geminiResearch,
    _type: 'source',
    title: 'Gemini Deep Research agent — limitations',
    url: 'https://ai.google.dev/gemini-api/docs/deep-research',
    publisher: 'Google AI for Developers',
    version: 'Last updated 2026-09-23 UTC',
    observedAt,
    excerpt: passages.geminiResearch,
    auditState: 'active',
    auditNote: 'Official documentation; this is a product constraint, not a general claim about every Gemini API request.',
    corpora: [ref(ids.corpora.scope, 'scope')],
  },
  {
    _id: ids.sources.geminiZdr,
    _type: 'source',
    title: 'Zero data retention in the Gemini Developer API',
    url: 'https://ai.google.dev/gemini-api/docs/zdr',
    publisher: 'Google AI for Developers',
    version: 'Documentation observed 2026-09-29',
    observedAt,
    excerpt: passages.geminiZdr,
    auditState: 'active',
    auditNote: 'Official documentation; the zero-data-footprint condition is compared with, but not conflated with, Deep Research execution.',
    corpora: [ref(ids.corpora.scope, 'scope')],
  },
  {
    _id: ids.sources.contextV1,
    _type: 'source',
    title: '@sanity/context 1.0.0 package documentation',
    url: 'https://unpkg.com/@sanity/context@1.0.0/README.md',
    publisher: 'Sanity (npm package artifact)',
    publishedAt: '2026-08-11T12:34:05.088Z',
    version: '1.0.0',
    observedAt,
    excerpt: passages.contextV1,
    auditState: 'active',
    auditNote: 'Immutable versioned package README used to establish the prior setup location.',
    corpora: [ref(ids.corpora.version, 'version')],
  },
  {
    _id: ids.sources.contextV2,
    _type: 'source',
    title: 'Insights moves to the Context app, and the Studio plugin is deprecated',
    url: 'https://www.sanity.io/docs/changelog/context-pkg-Mi4wLjA',
    publisher: 'Sanity',
    publishedAt: '2026-09-03T00:00:00.000Z',
    version: '2.0.0',
    observedAt,
    excerpt: passages.contextV2,
    auditState: 'active',
    auditNote: 'Official changelog; existing documents remain editable in Studio, while new setup moves to the Context app.',
    corpora: [ref(ids.corpora.version, 'version')],
  },
]

const scope = (value, overrides = {}) => ({
  _type: 'object',
  subject: 'Gemini Interactions API',
  property: 'storage requirement',
  value,
  provider: 'Google',
  ...overrides,
})

const evidenceLink = (sourceId, quote, relation, scopeAttributes, key) => ({
  _key: key,
  _type: 'object',
  source: ref(sourceId, `${key}-source`),
  quote,
  relation,
  scopeAttributes,
})

const claims = [
  {
    _id: 'orbit-claim-context-agent-loop-responsibility',
    _type: 'claim',
    statement: 'Sanity Context provides structured read-only retrieval; the application remains responsible for the agent loop.',
    status: 'confirmed',
    qualifier: 'Sanity Context MCP reference, observed 2026-09-29.',
    corpus: ref(ids.corpora.clean, 'corpus'),
    scopeAttributes: {
      _type: 'object', subject: 'Sanity Context MCP', property: 'agent loop responsibility',
      value: 'external agent required', provider: 'Sanity', product: 'Context MCP', version: '2026-09-03',
    },
    evidenceLinks: [evidenceLink(ids.sources.context, passages.context, 'supports', {
      _type: 'object', subject: 'Sanity Context MCP', property: 'agent loop responsibility',
      value: 'external agent required', provider: 'Sanity', product: 'Context MCP', version: '2026-09-03',
    }, 'context-read-only')],
    sources: [ref(ids.sources.context, 'context')],
  },
  {
    _id: 'orbit-claim-gemini-deep-research-store-true',
    _type: 'claim',
    statement: 'Gemini Deep Research background execution requires stored interaction state.',
    status: 'confirmed',
    qualifier: 'Gemini Deep Research agent, background execution.',
    corpus: ref(ids.corpora.scope, 'corpus'),
    scopeAttributes: scope('store=true', {
      product: 'Gemini Deep Research agent', mode: 'background=true', condition: 'execute Deep Research', version: '2026-09-23',
    }),
    evidenceLinks: [evidenceLink(ids.sources.geminiResearch, passages.geminiResearch, 'supports', scope('store=true', {
      product: 'Gemini Deep Research agent', mode: 'background=true', condition: 'execute Deep Research', version: '2026-09-23',
    }), 'deep-research-store')],
    sources: [ref(ids.sources.geminiResearch, 'gemini-research')],
  },
  {
    _id: 'orbit-claim-gemini-zero-footprint-store-false',
    _type: 'claim',
    statement: 'A Gemini Interactions API request seeking a zero-data footprint must opt out of default state retention.',
    status: 'confirmed',
    qualifier: 'Gemini Interactions API, zero-data-footprint condition; this is not evidence that Deep Research supports store=false.',
    corpus: ref(ids.corpora.scope, 'corpus'),
    scopeAttributes: scope('store=false', {
      product: 'Gemini Interactions API', mode: 'stateless request', condition: 'zero-data footprint', version: '2026-09-29',
    }),
    evidenceLinks: [evidenceLink(ids.sources.geminiZdr, passages.geminiZdr, 'supports', scope('store=false', {
      product: 'Gemini Interactions API', mode: 'stateless request', condition: 'zero-data footprint', version: '2026-09-29',
    }), 'zdr-store')],
    sources: [ref(ids.sources.geminiZdr, 'gemini-zdr')],
  },
  {
    _id: 'orbit-claim-sanity-context-setup-v1',
    _type: 'claim',
    statement: 'In @sanity/context 1.0.0, the Studio plugin registered the document used to configure agent access.',
    status: 'confirmed',
    qualifier: '@sanity/context 1.0.0 package artifact.',
    corpus: ref(ids.corpora.version, 'corpus'),
    scopeAttributes: {
      _type: 'object', subject: 'Sanity Context configuration', property: 'setup location', value: 'Studio plugin',
      provider: 'Sanity', product: 'Sanity Context', mode: 'new setup', version: '1.0.0', effectiveFrom: '2026-08-11',
    },
    evidenceLinks: [evidenceLink(ids.sources.contextV1, passages.contextV1, 'supports', {
      _type: 'object', subject: 'Sanity Context configuration', property: 'setup location', value: 'Studio plugin',
      provider: 'Sanity', product: 'Sanity Context', mode: 'new setup', version: '1.0.0', effectiveFrom: '2026-08-11',
    }, 'context-v1')],
    sources: [ref(ids.sources.contextV1, 'context-v1')],
  },
  {
    _id: 'orbit-claim-sanity-context-setup-v2',
    _type: 'claim',
    statement: 'From @sanity/context 2.0, new MCP setups are created in the Context app instead of through the Studio plugin.',
    status: 'confirmed',
    qualifier: '@sanity/context 2.0.0 changelog, published 2026-09-03.',
    corpus: ref(ids.corpora.version, 'corpus'),
    scopeAttributes: {
      _type: 'object', subject: 'Sanity Context configuration', property: 'setup location', value: 'Context app',
      provider: 'Sanity', product: 'Sanity Context', mode: 'new setup', version: '2.0.0', effectiveFrom: '2026-09-03',
    },
    evidenceLinks: [evidenceLink(ids.sources.contextV2, passages.contextV2, 'supports', {
      _type: 'object', subject: 'Sanity Context configuration', property: 'setup location', value: 'Context app',
      provider: 'Sanity', product: 'Sanity Context', mode: 'new setup', version: '2.0.0', effectiveFrom: '2026-09-03',
    }, 'context-v2')],
    sources: [ref(ids.sources.contextV2, 'context-v2')],
  },
]

const corpora = [
  {
    _id: ids.corpora.clean,
    _type: 'researchCorpus', key: 'clean-reference', title: 'Références nettes', status: 'ready',
    purpose: 'Vérifier qu’Orbit retrouve une réponse documentée et conserve le passage primaire qui la justifie.',
    admissionCriteria: ['Source officielle ou primaire.', 'Passage exact relu.', 'Portée et date enregistrées.'],
    expectedCases: ['Sanity Context sépare la récupération structurée de la boucle de l’agent.'],
    sources: [ref(ids.sources.context, 'context')],
    notes: 'Corpus logique du dataset production; il ne représente pas le compteur de documents de la Knowledge Base.',
  },
  {
    _id: ids.corpora.direct,
    _type: 'researchCorpus', key: 'direct-contradiction', title: 'Contradictions directes', status: 'incomplete',
    purpose: 'Conserver uniquement des paires de sources primaires incompatibles dans une portée identique.',
    admissionCriteria: ['Deux passages primaires relus.', 'Même sujet, propriété, produit, mode, condition, version et période.', 'Valeurs rendues incompatibles par une règle de domaine approuvée.'],
    expectedCases: ['Aucune paire n’est admise tant qu’une contradiction de même portée n’est pas démontrée.'],
    sources: [],
    notes: 'Délibérément incomplet au 2026-09-29; Orbit ne fabrique pas de désaccord pour remplir ce corpus.',
  },
  {
    _id: ids.corpora.scope,
    _type: 'researchCorpus', key: 'scope-ambiguity', title: 'Ambiguïtés de portée', status: 'ready',
    purpose: 'Montrer quand une opposition apparente disparaît après distinction du produit, du mode et de la condition.',
    admissionCriteria: ['Passages officiels relus.', 'Attributs de portée structurés séparément.', 'Aucune équivalence entre produits présumée.'],
    expectedCases: ['Gemini Deep Research exige store=true en arrière-plan; une requête Interactions API sans état demande store=false.'],
    sources: [ref(ids.sources.geminiResearch, 'deep-research'), ref(ids.sources.geminiZdr, 'zdr')],
    notes: 'Le cas documente une incompatibilité d’objectifs et de surfaces, pas une contradiction de documentation.',
  },
  {
    _id: ids.corpora.version,
    _type: 'researchCorpus', key: 'version-evolution', title: 'Évolution', status: 'ready',
    purpose: 'Repérer quand une version ou une date rend une ancienne conclusion à réexaminer.',
    admissionCriteria: ['Artefacts officiels versionnés.', 'Date ou version explicite.', 'Ancienne conclusion conservée avec sa provenance.'],
    expectedCases: ['@sanity/context 1.0 configurait l’accès dans Studio; 2.0 déplace les nouvelles configurations vers l’app Context.'],
    sources: [ref(ids.sources.contextV1, 'v1'), ref(ids.sources.contextV2, 'v2')],
    notes: 'L’ancien parcours reste pertinent pour les documents existants; la succession concerne les nouvelles configurations.',
  },
]

const candidateRules = [{
  _id: 'orbit-rule-candidate-storage-true-vs-false',
  _type: 'relationRule',
  attribute: 'value:storage requirement',
  left: 'store=true',
  right: 'store=false',
  relation: 'incompatible',
  justification: 'A single request cannot simultaneously set the same boolean storage parameter to true and false; scope must still match before Orbit reports a direct contradiction.',
  ruleVersion: 'candidate-1',
  corpus: ref(ids.corpora.scope, 'corpus'),
  sources: [ref(ids.sources.geminiResearch, 'deep-research'), ref(ids.sources.geminiZdr, 'zdr')],
  approvedByHuman: false,
}]

const documents = [...sources, ...claims, ...corpora, ...candidateRules]
const mutations = documents.map((document) => ({ createIfNotExists: document }))
const payload = JSON.stringify({ mutations })
const digest = createHash('sha256').update(payload).digest('hex')
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const receiptDirectory = path.join(root, '.orbit', 'sanity')
await mkdir(receiptDirectory, { recursive: true })
await writeFile(path.join(receiptDirectory, 'relation-corpora-seed.json'), JSON.stringify({
  projectId, dataset, documents, sha256: digest,
}, null, 2))

const result = {
  mode: apply ? 'apply-requested' : 'dry-run',
  projectId,
  dataset,
  documentCount: documents.length,
  corpusCount: corpora.length,
  sourceCount: sources.length,
  claimCount: claims.length,
  approvedRuleCount: candidateRules.filter((rule) => rule.approvedByHuman).length,
  candidateRuleCount: candidateRules.length,
  sha256: digest,
}

if (apply) {
  const token = process.env.SANITY_API_TOKEN
  if (!token) throw Error('BLOCKED_EXTERNAL: SANITY_API_TOKEN is absent from Orbit .env')
  const response = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: payload,
  })
  if (!response.ok) throw Error(`Sanity mutation rejected: HTTP ${response.status}; no credential printed`)
  const body = await response.json()
  result.mode = 'mutation-observed'
  result.transactionId = body.transactionId
  result.resultCount = Array.isArray(body.results) ? body.results.length : 0
}

await writeFile(path.join(receiptDirectory, 'relation-corpora-receipt.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result))
