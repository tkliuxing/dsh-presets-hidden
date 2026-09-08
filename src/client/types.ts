import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'

/** Preset fields consumed by the browser-only visibility surfaces. */
export interface PresetRecord {
  readonly id: string
  readonly trust: 'system' | 'user'
  readonly name?: string
  readonly description?: string
  readonly broken?: string
  readonly isDefault?: boolean
}

export interface RosterState {
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly presets: readonly PresetRecord[]
}

export interface VisibilityState {
  readonly hiddenIds: readonly string[]
  readonly orderIds: readonly string[]
}

export interface SeatState {
  readonly current: string
  readonly busy: boolean
  readonly error: string | null
}

export interface VisibilityFace {
  readonly hooks: {
    readonly roster: SnapshotStore<RosterState>
    readonly presetVisibility: SnapshotStore<VisibilityState>
  }
  readonly load: () => Promise<void>
  readonly toggle: (id: string) => void
  readonly showAll: () => void
  readonly move: (id: string, direction: -1 | 1, rosterIds: readonly string[]) => void
  readonly resetOrder: () => void
}

export interface SeatFace {
  readonly hooks: {
    readonly roster: SnapshotStore<RosterState>
    readonly presetVisibility: SnapshotStore<VisibilityState>
    readonly filteredPresetSeat: SnapshotStore<SeatState>
  }
  readonly load: () => Promise<void>
  readonly select: (id: string) => Promise<string | undefined>
}
