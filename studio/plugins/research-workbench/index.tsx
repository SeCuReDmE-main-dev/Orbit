import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { definePlugin, useClient } from 'sanity'
import { Badge, Button, Card, Flex, Heading, Label, Stack, Text, TextArea, TextInput } from '@sanity/ui'
import {
  checkpoint,
  claimKey,
  createDossier,
  exportMarkdown,
  parseDossier,
  reviewFindings,
  type Claim,
  type ClaimScope,
  type Dossier,
  type Evidence,
  type ResearchCorpusKey,
} from '../../../packages/evidence-review/src/index'
import {
  buildRelationGraph,
  rankTif,
  type ClaimRelationKind,
  type ContradictionRule,
  type TifAssessment,
} from '../../../packages/evidence-review/src/relations'
import { useOrbitDossiers } from './state'
import { classifyDossier, traceImpact, handoffFindings, ENGINE_VERSION } from '../../../packages/evidence-review/src/classification'

type CorpusDoc = {
  _id: string
  key: ResearchCorpusKey
  title: string
  purpose: string
  status: 'incomplete' | 'ready' | 'retired'
  admissionCriteria?: string[]
  expectedCases?: string[]
  sourceCount: number
}

type SanitySource = {
  _id: string
  title: string
  url: string
  publisher?: string
  observedAt?: string
  excerpt?: string
  version?: string
}

type SanityClaim = {
  _id: string
  statement: string
  status?: string
  qualifier?: string
  scopeAttributes?: ClaimScope
  evidenceLinks?: Array<{
    source?: SanitySource
    quote?: string
    relation?: 'supports' | 'contradicts' | 'contextualizes'
    scopeAttributes?: ClaimScope
  }>
}

const corpusLabels: Record<ResearchCorpusKey, string> = {
  'clean-reference': 'Références nettes',
  'direct-contradiction': 'Contradictions directes',
  'scope-ambiguity': 'Ambiguïtés de portée',
  'version-evolution': 'Évolution',
}

const relationLabels: Record<ClaimRelationKind, string> = {
  'same-scope-contradiction': 'Contradiction de même portée',
  'different-scope': 'Portées différentes',
  'version-succession': 'Évolution de version',
  'version-difference': 'Versions différentes · remplacement non établi',
  contextual: 'Relation contextuelle',
  indeterminate: 'Relation indéterminée',
  unrelated: 'Sans relation',
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Shell({ title, subtitle, sidebar, children, footer }: {
  title: string
  subtitle: string
  sidebar: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return <Flex className="orbit-research-workbench" direction="column" style={{ height: '100%' }}>
    <style>{`
      .orbit-research-workbench [data-ui="Stack"] {
        row-gap: 1rem !important;
      }

      .orbit-research-workbench [data-ui="Heading"],
      .orbit-research-workbench [data-ui="Text"],
      .orbit-research-workbench [data-ui="Label"],
      .orbit-research-workbench [data-ui="Badge"] {
        overflow-wrap: anywhere;
      }

      .orbit-research-workbench [data-ui="Badge"] {
        width: fit-content;
      }
    `}</style>
    <Card padding={[3, 4]} borderBottom>
      <Stack space={2}>
        <Heading size={2}>{title}</Heading>
        <Text muted size={1}>{subtitle}</Text>
      </Stack>
    </Card>
    <Flex direction={['column', 'column', 'row']} flex={1} style={{ minHeight: 0 }}>
      <Card padding={3} borderRight style={{ flex: '0 0 260px', overflowY: 'auto' }}>{sidebar}</Card>
      <Card padding={[3, 4, 5]} flex={1} style={{ minWidth: 0, overflowY: 'auto' }}>{children}</Card>
    </Flex>
    {footer ? <Card padding={3} borderTop>{footer}</Card> : null}
  </Flex>
}

function useCorpora() {
  const client = useClient({ apiVersion: '2026-09-01' })
  const [corpora, setCorpora] = useState<CorpusDoc[]>([])
  const [state, setState] = useState('Lecture du Content Lake…')
  useEffect(() => {
    const controller = new AbortController()
    client.fetch<CorpusDoc[]>(`*[_type == "researchCorpus"] | order(title asc){_id,key,title,purpose,status,admissionCriteria,expectedCases,"sourceCount":count(sources)}`, {}, { signal: controller.signal })
      .then((rows) => { setCorpora(rows); setState(`${rows.length} corpus structuré(s) lu(s) dans le Content Lake.`) })
      .catch((error) => { if (error?.name !== 'AbortError') setState(`Content Lake indisponible : ${error?.message ?? 'erreur inconnue'}`) })
    return () => controller.abort()
  }, [client])
  return { corpora, state, client }
}

function CorpusList({ corpora, active, onSelect }: { corpora: CorpusDoc[]; active?: ResearchCorpusKey; onSelect: (key: ResearchCorpusKey) => void }) {
  return <Stack space={3}>
    <Label muted size={1}>CORPUS</Label>
    {corpora.map((corpus) => <Button key={corpus._id} mode={active === corpus.key ? 'default' : 'bleed'}
      text={`${corpus.title} · ${corpus.sourceCount}`} onClick={() => onSelect(corpus.key)} />)}
    {!corpora.length ? <Text muted size={1}>Aucun corpus publié dans le dataset.</Text> : null}
  </Stack>
}

function DossiersTool() {
  const store = useOrbitDossiers()
  const { corpora, state, client } = useCorpora()
  const [message, setMessage] = useState('Aucune recherche n’est lancée automatiquement.')
  const [kbState, setKbState] = useState('Passerelle Context non vérifiée.')
  const selected = corpora.find((item) => item.key === store.active.corpusKey)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/v1/knowledge/outline', { signal: controller.signal, headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw Error(`HTTP ${response.status}`)
        const body = await response.json()
        setKbState(body?.state === 'READY' ? 'Sanity Context MCP répond.' : `Sanity Context : ${body?.state ?? 'réponse inconnue'}`)
      })
      .catch((error) => { if (error?.name !== 'AbortError') setKbState(`Passerelle Context indisponible (${error?.message ?? 'erreur'}).`) })
    return () => controller.abort()
  }, [])

  const update = (field: 'title' | 'question' | 'objective', value: string) => {
    const next = structuredClone(store.active)
    next[field] = value
    next.updatedAt = new Date().toISOString()
    store.replaceActive(next)
  }

  async function importCorpus() {
    if (!store.active.corpusKey) return setMessage('Choisissez un corpus avant la lecture.')
    setMessage('Lecture des sources et affirmations structurées…')
    try {
      const corpus = await client.fetch<(CorpusDoc & { sources: SanitySource[] }) | null>(`*[_type == "researchCorpus" && key == $key][0]{_id,key,title,purpose,status,admissionCriteria,expectedCases,"sourceCount":count(sources),"sources":sources[]->{_id,title,url,publisher,observedAt,excerpt,version}}`, { key: store.active.corpusKey })
      if (!corpus) throw Error('Corpus introuvable.')
      const claims = await client.fetch<SanityClaim[]>(`*[_type == "claim" && corpus._ref == $id]{_id,statement,status,qualifier,scopeAttributes,"evidenceLinks":evidenceLinks[]{quote,relation,scopeAttributes,"source":source->{_id,title,url,publisher,observedAt,excerpt,version}}}`, { id: corpus._id })
      const dossier = createDossier()
      dossier.corpusKey = corpus.key
      dossier.title = corpus.title
      dossier.objective = corpus.purpose
      dossier.screeningCriteria = corpus.admissionCriteria ?? []
      const allSources = new Map<string, SanitySource>()
      for (const source of corpus.sources ?? []) allSources.set(source._id, source)
      for (const claim of claims) for (const link of claim.evidenceLinks ?? []) if (link.source?._id) allSources.set(link.source._id, link.source)
      dossier.sources = [...allSources.values()].map((source): Evidence => ({
        id: source._id,
        title: source.title,
        url: source.url,
        status: source.excerpt ? 'excerpt-read' : 'discovered',
        ...(source.excerpt ? { text: source.excerpt } : {}),
        ...(source.publisher ? { publisher: source.publisher } : {}),
        ...(source.observedAt ? { retrievedAt: source.observedAt } : {}),
        ...(source.version ? { version: source.version } : {}),
      }))
      dossier.claims = claims.map((item): Claim => ({
        id: item._id,
        statement: item.statement,
        kind: item.status === 'inferred' ? 'inferred' : 'reported',
        disposition: item.status === 'confirmed' ? 'supported' : 'indeterminate',
        ...(item.qualifier ? { scope: item.qualifier } : {}),
        ...(item.scopeAttributes ? { scopeAttributes: item.scopeAttributes } : {}),
        evidence: (item.evidenceLinks ?? []).flatMap((link) => link.source?._id && link.quote && link.relation
          ? [{ sourceId: link.source._id, quote: link.quote, relation: link.relation,
            ...(link.scopeAttributes ? { scope: link.scopeAttributes } : {}) }]
          : []),
      }))
      store.replaceActive(parseDossier(dossier))
      setMessage(`${dossier.sources.length} source(s) et ${dossier.claims.length} affirmation(s) chargées. Les passages absents restent indéterminés.`)
    } catch (error) { setMessage(`Lecture impossible : ${(error as Error).message}`) }
  }

  return <Shell title="Dossiers" subtitle="Question, corpus, lectures Context et admission des sources."
    sidebar={<Stack space={5}>
      <CorpusList corpora={corpora} active={store.active.corpusKey} onSelect={(key) => {
        const next = structuredClone(store.active); next.corpusKey = key; store.replaceActive(next)
      }} />
      <Stack space={3}>
        <Label muted size={1}>DOSSIERS DE CET APPAREIL</Label>
        {store.dossiers.map((item) => <Button key={item.id} mode={item.id === store.active.id ? 'default' : 'bleed'} text={item.title} onClick={() => store.select(item.id)} />)}
        <Button text="Nouveau dossier" mode="ghost" onClick={() => store.create(store.active.corpusKey)} />
      </Stack>
    </Stack>}
    footer={<Flex gap={3} wrap="wrap"><Text size={1}>{state}</Text><Text size={1}>{kbState}</Text><Text size={1}>{store.persistence}</Text></Flex>}>
    <Stack space={5} style={{ maxWidth: 900, margin: '0 auto' }}>
      <Stack space={2}>
        <Label>Titre</Label>
        <TextInput value={store.active.title} onChange={(event) => update('title', event.currentTarget.value)} />
      </Stack>
      <Stack space={2}>
        <Label>Question à laquelle la réponse ne peut pas se permettre d’être fausse</Label>
        <TextArea rows={4} value={store.active.question} onChange={(event) => update('question', event.currentTarget.value)} />
      </Stack>
      <Stack space={2}>
        <Label>Objectif et limites</Label>
        <TextArea rows={4} value={store.active.objective} onChange={(event) => update('objective', event.currentTarget.value)} />
      </Stack>
      <Card padding={4} radius={2} border>
        <Stack space={3}>
          <Heading size={1}>{selected?.title ?? 'Aucun corpus sélectionné'}</Heading>
          <Text>{selected?.purpose ?? 'Choisissez un corpus dans le panneau gauche.'}</Text>
          <Flex gap={3} wrap="wrap">
            <Button text="Lire le corpus structuré" disabled={!selected} onClick={importCorpus} />
            <Button text="Exporter JSON" mode="ghost" onClick={() => download(`orbit-${store.active.id}.json`, JSON.stringify(store.active, null, 2), 'application/json')} />
            <Button text="Importer JSON" mode="ghost" as="label"><input hidden type="file" accept="application/json,.json" onChange={async (event) => {
              const file = event.currentTarget.files?.[0]; if (!file) return
              try { store.importDossier(JSON.parse(await file.text())); setMessage('Dossier importé et validé.') }
              catch (error) { setMessage(`Import refusé : ${(error as Error).message}`) }
            }} /></Button>
          </Flex>
        </Stack>
      </Card>
      <Card padding={4} radius={2} tone="transparent" border>
        <Stack space={3}>
          <Heading size={1}>Conservation</Heading>
          <Text size={1}>Par défaut, le dossier reste dans cette session. Autoriser la copie locale est une action distincte.</Text>
          <Flex gap={3} wrap="wrap">
            {!store.localAllowed ? <Button text="Autoriser la sauvegarde locale" onClick={store.allowLocal} />
              : <Button text="Révoquer la sauvegarde locale" tone="caution" mode="ghost" onClick={store.revokeLocal} />}
          </Flex>
        </Stack>
      </Card>
      <Text muted>{message}</Text>
    </Stack>
  </Shell>
}

type TifFilter = 'review' | 'truth' | 'indeterminacy' | 'falsity'

function TifTool() {
  const store = useOrbitDossiers()
  const [filter, setFilter] = useState<TifFilter>('review')
  const [selected, setSelected] = useState<string>()
  const rows = useMemo(() => classifyDossier(store.active), [store.active])
  const visible = rows.filter((row) => filter === 'truth' ? row.truth.length : filter === 'falsity' ? row.falsity.length
    : filter === 'indeterminacy' ? row.indeterminacy.length : row.priority !== 'supported')
  const detail = selected ? rows.find((row) => row.claimId === selected) : undefined
  const claim = detail ? store.active.claims.find((item) => item.id === detail.claimId) : undefined
  const button = (id: TifFilter, label: string, count: number) => <Button mode={filter === id ? 'default' : 'bleed'} text={`${label} · ${count}`} onClick={() => { setFilter(id); setSelected(undefined) }} />
  return <Shell title="T · I · F" subtitle="Trois collections indépendantes de preuves. Aucun pourcentage de vérité."
    sidebar={<Stack space={3}>
      <Label muted size={1}>MOTEUR · CHOIX HUMAIN</Label>
      {(['n', 'p', 'baseline'] as const).map(engine => <Button key={engine} text={engine === 'n' ? 'N · preuves indépendantes' : engine === 'p' ? 'P · attributs' : 'Référence simple'} mode={(store.active.classificationEngine ?? 'n') === engine ? 'default' : 'ghost'} onClick={() => {
        const next = checkpoint(store.active, `Moteur choisi par l’utilisateur : ${engine}`); next.classificationEngine = engine; store.replaceActive(next);
      }} />)}
      <Label muted size={1}>VUES</Label>
      {button('review', 'À revoir', rows.filter((row) => row.priority !== 'supported').length)}
      {button('truth', 'Tout T', rows.filter((row) => row.truth.length).length)}
      {button('indeterminacy', 'Tout I', rows.filter((row) => row.indeterminacy.length).length)}
      {button('falsity', 'Tout F', rows.filter((row) => row.falsity.length).length)}
    </Stack>}
    footer={<Text size={1}>{store.active.title} · révision {store.active.revision} · {ENGINE_VERSION} · {rows.length} affirmation(s)</Text>}>
    {!detail ? <Stack space={4} style={{ maxWidth: 1000, margin: '0 auto' }}>
      {!visible.length ? <Card padding={5} border radius={2}><Text>Aucune affirmation dans cette vue. Chargez un corpus structuré depuis Dossiers.</Text></Card> : null}
      {visible.map((row) => {
        const item = store.active.claims.find((candidate) => candidate.id === row.claimId)
        return <Card key={row.claimId} padding={4} border radius={2} onClick={() => setSelected(row.claimId)} style={{ cursor: 'pointer' }}>
          <Stack space={3}>
            <Flex gap={2} wrap="wrap"><Badge tone="positive">T {row.truth.length}</Badge><Badge tone="caution">I {row.indeterminacy.length}</Badge><Badge tone="critical">F {row.falsity.length}</Badge><Badge>{row.decision}</Badge><Badge>{row.independentSources} origine(s)</Badge></Flex>
            <Heading size={1}>{item?.statement ?? row.claimId}</Heading>
            <Text muted size={1}>Ouvrir les passages et les raisons de classement.</Text>
          </Stack>
        </Card>
      })}
    </Stack> : <Stack space={5} style={{ maxWidth: 980, margin: '0 auto' }}>
      <Button text="Retour aux affirmations" mode="bleed" onClick={() => setSelected(undefined)} />
      <Heading size={2}>{claim?.statement}</Heading>
      <Text>{detail.decision} · {detail.reasons.join(' ')}</Text>
      {detail.hold ? <Text>Reprise : {detail.hold.resumeWhen} Deux demandes supplémentaires au maximum.</Text> : null}
      <Text muted size={1}>Le contrôle du passage ne prouve pas sa pertinence sémantique. Aucune décision humaine n’est attribuée par ce moteur.</Text>
      <EvidenceSection title="T · passages qui soutiennent" rows={detail.truth} empty="Aucun passage vérifié dans la même portée." />
      <Card padding={4} border radius={2}><Stack space={3}><Heading size={1}>I · raisons de suspendre</Heading>
        {detail.indeterminacy.length ? detail.indeterminacy.map((item, index) => <Text key={`${item.code}-${index}`}>{item.code} — {item.message}</Text>) : <Text muted>Aucune raison enregistrée.</Text>}
      </Stack></Card>
      <EvidenceSection title="F · passages qui réfutent" rows={detail.falsity} empty="Aucun passage vérifié dans la même portée." />
    </Stack>}
  </Shell>
}

function EvidenceSection({ title, rows, empty }: { title: string; rows: TifAssessment['truth']; empty: string }) {
  return <Card padding={4} border radius={2}><Stack space={3}><Heading size={1}>{title}</Heading>
    {rows.length ? rows.map((item) => <Card key={`${item.sourceId}-${item.quote}`} padding={3} tone="transparent" border>
      <Stack space={2}><Text weight="semibold">{item.title}</Text><Text>« {item.quote} »</Text><a href={item.url} target="_blank" rel="noreferrer">Ouvrir la source</a></Stack>
    </Card>) : <Text muted>{empty}</Text>}
  </Stack></Card>
}

function RelationsTool() {
  const store = useOrbitDossiers()
  const client = useClient({ apiVersion: '2026-09-01' })
  const [rules, setRules] = useState<ContradictionRule[]>([])
  const [filter, setFilter] = useState<ClaimRelationKind | 'all'>('all')
  const [selected, setSelected] = useState<string>()
  const [ruleState, setRuleState] = useState('Lecture des règles humaines…')
  useEffect(() => {
    const controller = new AbortController()
    client.fetch<Array<{ _id: string; attribute: string; left: string; right: string; relation: ContradictionRule['relation']; justification: string; ruleVersion: string }>>(
      `*[_type == "relationRule" && approvedByHuman == true]{_id,attribute,left,right,relation,justification,ruleVersion}`,
      {}, { signal: controller.signal }).then((items) => {
        setRules(items.map((item) => ({ id: item._id, attribute: item.attribute, left: item.left, right: item.right, relation: item.relation, justification: item.justification, version: item.ruleVersion })))
        setRuleState(`${items.length} règle(s) approuvée(s) chargée(s).`)
      }).catch((error) => { if (error?.name !== 'AbortError') setRuleState(`Règles indisponibles : ${error?.message ?? 'erreur'}`) })
    return () => controller.abort()
  }, [client])
  const relations = useMemo(() => buildRelationGraph(store.active, rules), [store.active, rules])
  const visible = relations.filter((row) => filter === 'all' || row.kind === filter)
  const detail = selected ? relations.find((row) => `${row.leftClaimId}:${row.rightClaimId}` === selected) : undefined
  const filters: Array<ClaimRelationKind | 'all'> = ['all', 'same-scope-contradiction', 'different-scope', 'version-difference', 'version-succession', 'indeterminate', 'contextual']
  return <Shell title="Relations" subtitle="Comparaisons par attribut et règles de domaine versionnées."
    sidebar={<Stack space={3}><Label muted size={1}>RELATIONS</Label>{filters.map((kind) => <Button key={kind}
      mode={filter === kind ? 'default' : 'bleed'} text={`${kind === 'all' ? 'Toutes' : relationLabels[kind]} · ${kind === 'all' ? relations.length : relations.filter((row) => row.kind === kind).length}`}
      onClick={() => { setFilter(kind); setSelected(undefined) }} />)}</Stack>}
    footer={<Text size={1}>{ruleState} Une paire sans règle reste indéterminée.</Text>}>
    {!detail ? <Stack space={4} style={{ maxWidth: 1000, margin: '0 auto' }}>
      {!visible.length ? <Card padding={5} border radius={2}><Text>Aucune relation comparable. Une affirmation a besoin de sujet, propriété, valeur et portée structurée.</Text></Card> : null}
      {visible.map((row) => {
        const left = store.active.claims.find((item) => item.id === row.leftClaimId)
        const right = store.active.claims.find((item) => item.id === row.rightClaimId)
        const id = `${row.leftClaimId}:${row.rightClaimId}`
        return <Card key={id} padding={4} border radius={2} style={{ cursor: 'pointer' }} onClick={() => setSelected(id)}>
          <Stack space={3}><Badge>{relationLabels[row.kind]}</Badge><Heading size={1}>{left?.statement}</Heading><Text>↔ {right?.statement}</Text><Text muted size={1}>{row.explanation}</Text></Stack>
        </Card>
      })}
    </Stack> : <Stack space={5} style={{ maxWidth: 980, margin: '0 auto' }}>
      <Button text="Retour aux relations" mode="bleed" onClick={() => setSelected(undefined)} />
      <Badge>{relationLabels[detail.kind]}</Badge>
      <Heading size={2}>{detail.explanation}</Heading>
      {detail.comparisons.map((item) => <Card key={item.attribute} padding={4} border radius={2}>
        <Stack space={2}><Heading size={1}>{item.attribute}</Heading><Text>{item.left ?? 'absent'} ↔ {item.right ?? 'absent'}</Text><Text>{item.relation} — {item.justification}</Text>{item.ruleId ? <Text muted size={1}>Règle : {item.ruleId}</Text> : null}</Stack>
      </Card>)}
    </Stack>}
  </Shell>
}

function AuditTool() {
  const store = useOrbitDossiers()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const findings = reviewFindings(store.active)
  const impact = traceImpact(store.active), transmissions = handoffFindings(store.active)
  function decide(claimId: string, decision: 'accepted' | 'needs-work') {
    const note = notes[claimId]?.trim()
    const claim = store.active.claims.find((item) => item.id === claimId)
    if (!claim || !note) return
    const next = checkpoint(store.active, `Revue humaine : ${decision}`)
    const savedClaim = next.claims.find((item) => item.id === claimId)
    if (!savedClaim) return
    next.reviews = next.reviews.filter((item) => item.claimId !== claimId)
    next.reviews.push({ claimId, decision, note, by: 'human', at: new Date().toISOString(), contentKey: claimKey(next, savedClaim) })
    store.replaceActive(next)
  }
  return <Shell title="Audit" subtitle="Réponse affectée, justification, décision humaine et export."
    sidebar={<Stack space={3}><Label muted size={1}>ÉTAT</Label>
      <Text>{store.active.claims.length} affirmation(s)</Text><Text>{findings.length} point(s) à examiner</Text>
      <Text>{store.active.reviews.length} décision(s) humaine(s)</Text>
      <Button text="Exporter JSON" onClick={() => download(`orbit-audit-${store.active.id}.json`, JSON.stringify(store.active, null, 2), 'application/json')} />
      <Button text="Exporter Markdown" mode="ghost" onClick={() => download(`orbit-audit-${store.active.id}.md`, exportMarkdown(store.active), 'text/markdown')} />
    </Stack>} footer={<Text size={1}>Une décision humaine est liée au contenu exact; toute modification la rend à revoir.</Text>}>
    <Stack space={5} style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Stack space={2}><Label>Réponse courte</Label><Card padding={4} border radius={2}><Text>{store.active.answer || 'Aucune réponse proposée.'}</Text></Card></Stack>
      <Stack space={3}><Heading size={1}>Dépendances et transmissions</Heading>
        <Text>{impact.affectedClaimIds.length} affirmation(s) à revoir · {impact.affectedResponseRevisions.length} révision(s) de réponse affectée(s).</Text>
        {impact.links.map((link, i) => <Text key={i}>{link.dependency} → {link.claimId} → réponse r{link.responseRevision} : {link.reason}</Text>)}
        {transmissions.map((row, i) => <Text key={i}>{row.handoffId} : {row.code} {row.claimId}</Text>)}
        <Text muted size={1}>Les identités de sous-agents sont déclarées. Plusieurs agents répétant une source ne constituent pas plusieurs preuves.</Text>
      </Stack>
      {store.active.claims.map((claim) => {
        const claimFindings = findings.filter((item) => item.claimId === claim.id)
        const review = store.active.reviews.find((item) => item.claimId === claim.id)
        return <Card key={claim.id} padding={4} border radius={2}><Stack space={4}>
          <Heading size={1}>{claim.statement}</Heading>
          <Flex gap={2} wrap="wrap"><Badge>{claim.disposition}</Badge>{review ? <Badge tone={review.decision === 'accepted' ? 'positive' : 'caution'}>{review.decision}</Badge> : <Badge tone="caution">revue requise</Badge>}</Flex>
          {claimFindings.length ? claimFindings.map((item) => <Text key={item.code}>{item.code} — {item.message}</Text>) : <Text muted>Aucun contrôle structurel ouvert.</Text>}
          <TextArea rows={3} placeholder="Justification humaine obligatoire" value={notes[claim.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [claim.id]: event.currentTarget.value }))} />
          <Flex gap={3}><Button text="Accepter" disabled={!notes[claim.id]?.trim()} onClick={() => decide(claim.id, 'accepted')} /><Button text="Demander une correction" tone="caution" mode="ghost" disabled={!notes[claim.id]?.trim()} onClick={() => decide(claim.id, 'needs-work')} /></Flex>
        </Stack></Card>
      })}
      {!store.active.claims.length ? <Card padding={5} border radius={2}><Text>Aucune affirmation à auditer. Chargez un corpus ou importez un dossier dans Dossiers.</Text></Card> : null}
    </Stack>
  </Shell>
}

export const orbitResearchWorkbench = definePlugin({
  name: 'orbit-research-workbench',
  tools: [
    { name: 'orbit-dossiers', title: 'Dossiers', component: DossiersTool },
    { name: 'orbit-tif', title: 'T · I · F', component: TifTool },
    { name: 'orbit-relations', title: 'Relations', component: RelationsTool },
    { name: 'orbit-audit', title: 'Audit', component: AuditTool },
  ],
})
