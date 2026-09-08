import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { PresetRecord, RosterState, SeatState, VisibilityState } from './types.ts'
import { orderedPresets } from './visibility-store.ts'

type SessionLike = Pick<SessionSummary, 'id' | 'blank' | 'projectionValues'>

const INITIAL: SeatState = { current: '', busy: false, error: null }

function presetOf(session: SessionLike | undefined): string | undefined {
  const value = session?.projectionValues?.agentPreset
  return typeof value === 'string' ? value : undefined
}

function healthyVisible(
  roster: RosterState,
  visibility: VisibilityState,
): readonly PresetRecord[] {
  const hidden = new Set(visibility.hiddenIds)
  return orderedPresets(roster.presets, visibility.orderIds)
    .filter(preset => preset.broken === undefined && !hidden.has(preset.id))
}

/** Stages only visible presets for the next blank session. */
export class FilteredPresetSeatController {
  readonly store: SnapshotStore<SeatState> = createSnapshotStore(INITIAL)
  private staged: string | undefined
  private pendingProjection: { readonly sessionId: SessionSummary['id']; readonly preset: string } | undefined

  constructor(
    private readonly ctx: ClientContext,
    private readonly roster: SnapshotStore<RosterState>,
    private readonly visibility: SnapshotStore<VisibilityState>,
    private readonly currentSession: () => SessionLike | undefined,
  ) {}

  private set(patch: Partial<SeatState>): void {
    this.store.set({ ...this.store.getSnapshot(), ...patch })
  }

  private visiblePresets(): readonly PresetRecord[] {
    return healthyVisible(this.roster.getSnapshot(), this.visibility.getSnapshot())
  }

  private effectivePreset(session: SessionLike | undefined): string | undefined {
    if (this.pendingProjection === undefined) return presetOf(session)
    if (session === undefined || session.id !== this.pendingProjection.sessionId) {
      this.pendingProjection = undefined
      return presetOf(session)
    }
    const projected = presetOf(session)
    if (projected === this.pendingProjection.preset) {
      this.pendingProjection = undefined
      return projected
    }
    return this.pendingProjection.preset
  }

  private fallback(): string {
    const visible = this.visiblePresets()
    return visible.find(preset => preset.isDefault)?.id ?? visible[0]?.id ?? ''
  }

  async reconcile(): Promise<void> {
    if (this.store.getSnapshot().busy) return
    const visible = this.visiblePresets()
    const visibleIds = new Set(visible.map(preset => preset.id))
    const fallback = this.fallback()

    if (visible.length === 0) {
      this.staged = undefined
      this.set({ current: '', error: null })
      return
    }

    if (this.staged !== undefined && !visibleIds.has(this.staged)) this.staged = fallback
    if (this.staged !== undefined) {
      this.set({ current: this.staged, error: null })
      await this.apply()
      return
    }

    const session = this.currentSession()
    const actual = this.effectivePreset(session)
    if (actual !== undefined && visibleIds.has(actual)) {
      this.set({ current: actual, error: null })
      return
    }

    const healthy = this.roster.getSnapshot().presets.filter(preset => preset.broken === undefined)
    const hostDefault = healthy.find(preset => preset.isDefault)?.id ?? healthy[0]?.id
    const hiddenHostChoice = actual !== undefined
      ? !visibleIds.has(actual)
      : hostDefault !== undefined && !visibleIds.has(hostDefault)

    this.set({ current: fallback, error: null })
    if (session?.blank === true && hiddenHostChoice) {
      this.staged = fallback
      await this.apply()
    }
  }

  async select(id: string): Promise<string | undefined> {
    if (this.store.getSnapshot().busy) return undefined
    if (!this.visiblePresets().some(preset => preset.id === id)) return undefined
    this.staged = id
    this.set({ current: id, error: null })
    await this.apply()
    return this.store.getSnapshot().error ?? undefined
  }

  async apply(): Promise<void> {
    const staged = this.staged
    const session = this.currentSession()
    if (staged === undefined) {
      await this.reconcile()
      return
    }
    if (session === undefined) return
    if (!session.blank || presetOf(session) === staged) {
      this.staged = undefined
      await this.reconcile()
      return
    }

    this.set({ busy: true, error: null })
    const result = await this.ctx.remote.agentPresets.select(session.id, staged)
    this.staged = undefined
    if (!result.ok) {
      const reason = 'reason' in result.error.details && typeof result.error.details.reason === 'string'
        ? result.error.details.reason
        : result.error.message
      const actual = this.effectivePreset(session)
      const visibleIds = new Set(this.visiblePresets().map(preset => preset.id))
      this.set({
        busy: false,
        error: reason,
        current: actual !== undefined && visibleIds.has(actual) ? actual : this.fallback(),
      })
      return
    }
    this.pendingProjection = { sessionId: session.id, preset: result.value }
    this.set({ busy: false, error: null, current: result.value })
  }
}

export { healthyVisible }
