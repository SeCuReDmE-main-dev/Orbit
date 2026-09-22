import { DEFAULT_BUDGET, type BudgetLimits } from './budget.js'
import type { MissionId } from '@orbit/contracts'

export type MissionStatus = 'draft' | 'active' | 'blocked' | 'completed'

export type Mission = Readonly<{
  id: MissionId
  title: string
  status: MissionStatus
  budget: BudgetLimits
  createdAt: string
  updatedAt: string
}>

export type MissionCheckpoint = Readonly<{
  missionId: MissionId
  sequence: number
  label: string
  detail?: string
  createdAt: string
}>

export interface MissionStore {
  create(input: Pick<Mission, 'id' | 'title'> & Partial<Pick<Mission, 'status' | 'budget'>>): Mission
  get(id: MissionId): Mission | undefined
  list(): Mission[]
  checkpoint(input: Omit<MissionCheckpoint, 'sequence' | 'createdAt'>): MissionCheckpoint
  checkpoints(missionId: MissionId): MissionCheckpoint[]
}

export class InMemoryMissionStore implements MissionStore {
  private readonly missions = new Map<MissionId, Mission>()
  private readonly entries = new Map<MissionId, MissionCheckpoint[]>()

  create(input: Pick<Mission, 'id' | 'title'> & Partial<Pick<Mission, 'status' | 'budget'>>): Mission {
    if (!input.id.trim() || !input.title.trim()) throw new Error('A mission needs a non-empty id and title.')
    if (this.missions.has(input.id)) throw new Error(`Mission already exists: ${input.id}`)
    const now = new Date().toISOString()
    const mission: Mission = Object.freeze({
      id: input.id,
      title: input.title,
      status: input.status ?? 'draft',
      budget: input.budget ?? DEFAULT_BUDGET,
      createdAt: now,
      updatedAt: now,
    })
    this.missions.set(mission.id, mission)
    this.entries.set(mission.id, [])
    return mission
  }

  get(id: MissionId): Mission | undefined { return this.missions.get(id) }
  list(): Mission[] { return [...this.missions.values()] }

  checkpoint(input: Omit<MissionCheckpoint, 'sequence' | 'createdAt'>): MissionCheckpoint {
    if (!this.missions.has(input.missionId)) throw new Error(`Unknown mission: ${input.missionId}`)
    if (!input.label.trim()) throw new Error('A checkpoint needs a label.')
    const entries = this.entries.get(input.missionId)!
    const checkpoint: MissionCheckpoint = Object.freeze({
      ...input,
      sequence: entries.length + 1,
      createdAt: new Date().toISOString(),
    })
    entries.push(checkpoint)
    return checkpoint
  }

  checkpoints(missionId: MissionId): MissionCheckpoint[] { return [...(this.entries.get(missionId) ?? [])] }
}
