import { useEffect, useMemo, useState } from 'react'
import { createDossier, parseDossier, type Dossier, type ResearchCorpusKey } from '../../../packages/evidence-review/src/index'

const sessionKey = 'orbit.studio.research.session.v1'
const localKey = 'orbit.studio.research.local.v1'
const consentKey = 'orbit.studio.research.local-consent.v1'

type Store = { activeId: string; dossiers: Dossier[] }

function initialStore(): Store {
  const dossier = createDossier()
  return { activeId: dossier.id, dossiers: [dossier] }
}

function parseStore(raw: string | null): Store | undefined {
  if (!raw) return undefined
  try {
    const value = JSON.parse(raw) as { activeId?: unknown; dossiers?: unknown }
    if (typeof value.activeId !== 'string' || !Array.isArray(value.dossiers)) return undefined
    const dossiers = value.dossiers.slice(0, 24).map(parseDossier)
    if (!dossiers.length) return undefined
    return { activeId: dossiers.some((item) => item.id === value.activeId) ? value.activeId : dossiers[0].id, dossiers }
  } catch {
    return undefined
  }
}

function load(): { store: Store; localAllowed: boolean } {
  if (typeof window === 'undefined') return { store: initialStore(), localAllowed: false }
  const localAllowed = window.localStorage.getItem(consentKey) === 'yes'
  const store = parseStore(localAllowed ? window.localStorage.getItem(localKey) : window.sessionStorage.getItem(sessionKey))
  return { store: store ?? initialStore(), localAllowed }
}

export function useOrbitDossiers() {
  const boot = useMemo(load, [])
  const [store, setStore] = useState<Store>(boot.store)
  const [localAllowed, setLocalAllowed] = useState(boot.localAllowed)
  const [persistence, setPersistence] = useState(localAllowed ? 'Sauvegarde locale autorisée.' : 'Session seulement.')

  useEffect(() => {
    const payload = JSON.stringify(store)
    window.sessionStorage.setItem(sessionKey, payload)
    if (localAllowed) window.localStorage.setItem(localKey, payload)
  }, [store, localAllowed])

  const active = store.dossiers.find((item) => item.id === store.activeId) ?? store.dossiers[0]
  const replaceActive = (dossier: Dossier) => setStore((current) => ({
    activeId: dossier.id,
    dossiers: current.dossiers.some((item) => item.id === dossier.id)
      ? current.dossiers.map((item) => item.id === dossier.id ? dossier : item)
      : [dossier, ...current.dossiers].slice(0, 24),
  }))
  const select = (id: string) => setStore((current) => current.dossiers.some((item) => item.id === id)
    ? { ...current, activeId: id }
    : current)
  const create = (corpusKey?: ResearchCorpusKey) => {
    const dossier = createDossier()
    dossier.corpusKey = corpusKey
    replaceActive(dossier)
  }
  const importDossier = (value: unknown) => replaceActive(parseDossier(value))
  const allowLocal = async () => {
    window.localStorage.setItem(consentKey, 'yes')
    window.localStorage.setItem(localKey, JSON.stringify(store))
    setLocalAllowed(true)
    let durable = false
    try { durable = Boolean(await navigator.storage?.persist?.()) } catch { durable = false }
    setPersistence(durable
      ? 'Sauvegarde locale autorisée; le navigateur a accordé la persistance.'
      : 'Sauvegarde locale autorisée; la persistance du navigateur n’est pas garantie.')
  }
  const revokeLocal = () => {
    window.localStorage.removeItem(consentKey)
    window.localStorage.removeItem(localKey)
    setLocalAllowed(false)
    setPersistence('Sauvegarde locale révoquée; la session courante reste ouverte.')
  }
  return { active, dossiers: store.dossiers, localAllowed, persistence, replaceActive, select, create, importDossier, allowLocal, revokeLocal }
}
