import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { PresetRecord, RosterState } from './types.ts'

const INITIAL: RosterState = { status: 'idle', error: null, presets: [] }

/** Shares one live preset roster between the selector and settings page. */
export class RosterController {
  readonly store: SnapshotStore<RosterState> = createSnapshotStore(INITIAL)
  private inFlight: Promise<void> | undefined

  constructor(private readonly ctx: ClientContext) {}

  load(): Promise<void> {
    if (this.inFlight !== undefined) return this.inFlight
    this.inFlight = this.read().finally(() => { this.inFlight = undefined })
    return this.inFlight
  }

  private async read(): Promise<void> {
    const before = this.store.getSnapshot()
    this.store.set({ ...before, status: 'loading', error: null })
    const result = await this.ctx.remote.agentPresets.list()
    if (!result.ok) {
      if (result.error.code === 'gateway/invocation-unavailable') {
        this.store.set({ status: 'ready', error: null, presets: [] })
        return
      }
      this.store.set({ ...this.store.getSnapshot(), status: 'error', error: result.error.message })
      return
    }
    const presets: PresetRecord[] = result.value.presets.map(preset => ({
      id: preset.id,
      trust: preset.trust,
      ...(preset.name === undefined ? {} : { name: preset.name }),
      ...(preset.description === undefined ? {} : { description: preset.description }),
      ...(preset.broken === undefined ? {} : { broken: preset.broken }),
      ...(preset.isDefault === undefined ? {} : { isDefault: preset.isDefault }),
    }))
    this.store.set({ status: 'ready', error: null, presets })
  }
}
