type JSONSchema = Readonly<Record<string, unknown>>
type ToolOptions = Readonly<{ signal: AbortSignal }>
type WebMcpTool = Readonly<{
  name: string
  title: string
  description: string
  inputSchema: JSONSchema
  annotations: Readonly<{ readOnlyHint: true; untrustedContentHint?: boolean; consequentialHint: false }>
  execute: (input: Record<string, unknown>, options?: ToolOptions) => Promise<unknown>
}>
type ModelContext = { registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<void> }

declare global { interface Document { modelContext?: ModelContext } }

const BROKER = 'http://127.0.0.1:47831'
let registration: Promise<'registered' | 'unavailable'> | undefined

export function registerReadOnlyOrbitTools(): Promise<'registered' | 'unavailable'> {
  registration ??= register()
  return registration
}

async function register(): Promise<'registered' | 'unavailable'> {
  const modelContext = document.modelContext
  if (!modelContext?.registerTool) return 'unavailable'
  const lifetime = new AbortController()
  window.addEventListener('pagehide', () => lifetime.abort('Orbit Companion page closed.'), { once: true })
  for (const tool of tools()) await modelContext.registerTool(tool, { signal: lifetime.signal })
  return 'registered'
}

function tools(): WebMcpTool[] {
  const readOnly = { readOnlyHint: true as const, consequentialHint: false as const }
  return [
    {
      name: 'orbit_get_mission_summary', title: 'Get Orbit mission summary',
      description: 'Read one local Orbit Companion mission and its bounded checkpoint list from the loopback broker.',
      inputSchema: objectSchema({ missionId: { type: 'string', pattern: '^mission_[A-Za-z0-9_-]+$', maxLength: 128 } }, ['missionId']),
      annotations: readOnly,
      execute: async (input, options) => brokerJson(`/missions/${encodeURIComponent(requiredText(input.missionId, 'missionId', 128))}`, signalOf(options)),
    },
    {
      name: 'orbit_list_research_points', title: 'List Orbit research points',
      description: 'Read a bounded page of local research points from the loopback broker.',
      inputSchema: pagedSchema(), annotations: readOnly,
      execute: async (input, options) => brokerJson(`/research-points?${pageQuery(input)}`, signalOf(options)),
    },
    {
      name: 'orbit_search_sources', title: 'Search Orbit sources',
      description: 'Search verified local source records only. It never fetches the web.',
      inputSchema: objectSchema({ query: { type: 'string', minLength: 1, maxLength: 200 }, limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 } }, ['query']),
      annotations: { ...readOnly, untrustedContentHint: true },
      execute: async (input, options) => {
        const query = requiredText(input.query, 'query', 200)
        const limit = integer(input.limit, 10, 1, 25)
        return brokerJson(`/sources?query=${encodeURIComponent(query)}&limit=${limit}`, signalOf(options))
      },
    },
    {
      name: 'orbit_read_source_record', title: 'Read Orbit source record',
      description: 'Read one stored source record by local identifier without fetching its URL.',
      inputSchema: objectSchema({ sourceId: { type: 'string', minLength: 1, maxLength: 128 } }, ['sourceId']),
      annotations: { ...readOnly, untrustedContentHint: true },
      execute: async (input, options) => brokerJson(`/sources/${encodeURIComponent(requiredText(input.sourceId, 'sourceId', 128))}`, signalOf(options)),
    },
    {
      name: 'orbit_get_physics_snapshot', title: 'Get Orbit physics snapshot',
      description: 'Read the capabilities and limits of the current local orbital visual. No model or network call is made.',
      inputSchema: objectSchema({}, []), annotations: readOnly,
      execute: async (_input, options) => { checkAbort(signalOf(options)); return { state: 'READY', model: 'newtonian-two-body-velocity-verlet-v1', scientificQualification: false, newtonianGravity: true, fixedStepSeconds: 2, remoteCalls: 0 } },
    },
  ]
}

function objectSchema(properties: Record<string, unknown>, required: string[]): JSONSchema {
  return { type: 'object', properties, required, additionalProperties: false }
}

function pagedSchema(): JSONSchema {
  return objectSchema({ offset: { type: 'integer', minimum: 0, default: 0 }, limit: { type: 'integer', minimum: 1, maximum: 25, default: 10 } }, [])
}

function pageQuery(input: Record<string, unknown>): string {
  const offset = integer(input.offset, 0, 0, 10_000)
  const limit = integer(input.limit, 10, 1, 25)
  return new URLSearchParams({ offset: String(offset), limit: String(limit) }).toString()
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = value === undefined ? fallback : value
  if (!Number.isInteger(parsed) || Number(parsed) < min || Number(parsed) > max) throw new Error(`Expected an integer from ${min} to ${max}.`)
  return Number(parsed)
}

function requiredText(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new Error(`${name} must be a non-empty string up to ${maxLength} characters.`)
  return value.trim()
}

function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
}

function signalOf(options?: ToolOptions): AbortSignal {
  return options?.signal ?? new AbortController().signal
}

async function brokerJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${BROKER}${path}`, { signal, credentials: 'omit', cache: 'no-store' })
  const body: unknown = await response.json()
  if (!response.ok) throw new Error(`Orbit broker returned HTTP ${response.status}.`)
  return body
}
