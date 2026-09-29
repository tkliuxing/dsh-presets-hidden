import type { ObservableSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-store'

/** Preset fields consumed by the browser-only visibility surfaces. */
export interface PresetRecord {
  readonly id: string
  readonly name?: string
  readonly description?: string
  readonly broken?: string
  readonly isDefault?: boolean
}

export interface RosterState {
  readonly status: 'idle' | 'loading' | 'ready' | 'error'
  readonly error: string | null
  readonly presets: readonly PresetRecord[]
  /**
   * Whether the Host exposes preset selection on new-session surfaces. Hosts
   * that publish no chooser policy (DSH 0.1.7-rc.2 and later) report `true`:
   * there, Developer tools are the only gate over the picker.
   */
  readonly modeSelectionEnabled: boolean
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
    /** Developer-tools preference that gates the official picker. */
    readonly showPresetPicker: ObservableSnapshot<boolean>
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
    /** Developer-tools preference that gates the official picker. */
    readonly showPresetPicker: ObservableSnapshot<boolean>
  }
  readonly load: () => Promise<void>
  readonly select: (id: string) => Promise<string | undefined>
}
