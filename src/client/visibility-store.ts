import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  HIDDEN_IDS_FIELD, ORDER_IDS_FIELD, type VisibilitySettings,
} from '../settings.ts'
import type { VisibilityState } from './types.ts'

/** Browser-local preference key. Kept as a fallback for non-loopback pages. */
export const VISIBILITY_STORAGE_KEY = 'dsh.presets-hidden.visibility.v1'

function stringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

export function normalizeVisibilityState(value: unknown): VisibilityState {
  if (typeof value !== 'object' || value === null) return { hiddenIds: [], orderIds: [] }
  const candidate = value as { hiddenIds?: unknown; orderIds?: unknown }
  return {
    hiddenIds: stringIds(candidate.hiddenIds).sort((left, right) => left.localeCompare(right)),
    orderIds: stringIds(candidate.orderIds),
  }
}

export function orderedPresets<T extends { readonly id: string }>(
  presets: readonly T[],
  orderIds: readonly string[],
): T[] {
  const byId = new Map(presets.map(preset => [preset.id, preset]))
  const ordered: T[] = []
  for (const id of orderIds) {
    const preset = byId.get(id)
    if (preset === undefined) continue
    ordered.push(preset)
    byId.delete(id)
  }
  for (const preset of presets) {
    if (byId.delete(preset.id)) ordered.push(preset)
  }
  return ordered
}

function readLocalStorageState(): VisibilityState {
  if (typeof localStorage === 'undefined') return { hiddenIds: [], orderIds: [] }
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY)
    return raw === null
      ? { hiddenIds: [], orderIds: [] }
      : normalizeVisibilityState(JSON.parse(raw))
  } catch {
    return { hiddenIds: [], orderIds: [] }
  }
}

function writeLocalStorageState(state: VisibilityState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage failure keeps the live preference usable for this page lifetime.
  }
}

function clearLocalStorageState(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(VISIBILITY_STORAGE_KEY)
  } catch {
    // Non-fatal: stale localStorage is harmless and will be re-migrated if needed.
  }
}

function stateEqual(a: VisibilityState, b: VisibilityState): boolean {
  if (a.hiddenIds.length !== b.hiddenIds.length) return false
  if (a.orderIds.length !== b.orderIds.length) return false
  for (let i = 0; i < a.hiddenIds.length; i++) {
    if (a.hiddenIds[i] !== b.hiddenIds[i]) return false
  }
  for (let i = 0; i < a.orderIds.length; i++) {
    if (a.orderIds[i] !== b.orderIds[i]) return false
  }
  return true
}

function opsForState(state: VisibilityState): SettingsPathOpView[] {
  return [
    { op: 'set', path: [HIDDEN_IDS_FIELD], value: [...state.hiddenIds] },
    { op: 'set', path: [ORDER_IDS_FIELD], value: [...state.orderIds] },
  ]
}

export interface VisibilityControllerOptions {
  /** Optional Host-backed settings scope; when absent or unavailable, localStorage is used. */
  scope?: SettingsScope<VisibilitySettings>
}

/** Owns preset visibility and order preferences, preferring Host settings when available. */
export class VisibilityController {
  readonly store: SnapshotStore<VisibilityState>
  private readonly scope: SettingsScope<VisibilitySettings> | undefined
  private readonly unsubscribe: (() => void) | undefined
  private applyingFromScope = false

  constructor(options?: VisibilityControllerOptions) {
    const scope = options?.scope
    this.scope = scope
    const initialState = this.resolveInitialState(scope)
    this.store = createSnapshotStore(initialState)

    if (scope !== undefined) {
      this.unsubscribe = scope.subscribe(() => { this.onScopeChange() })
      this.onScopeChange()
      this.store.subscribe(() => { this.onStoreChange() })
    } else {
      this.store.subscribe(() => { writeLocalStorageState(this.store.getSnapshot()) })
    }
  }

  /** Release scope subscriptions. Call when the owning plugin fiber disposes. */
  dispose(): void {
    this.unsubscribe?.()
  }

  isHidden(id: string): boolean {
    return this.store.getSnapshot().hiddenIds.includes(id)
  }

  toggle(id: string): void {
    const state = this.store.getSnapshot()
    const hiddenIds = state.hiddenIds.includes(id)
      ? state.hiddenIds.filter(value => value !== id)
      : [...state.hiddenIds, id].sort((left, right) => left.localeCompare(right))
    this.store.set({ ...state, hiddenIds })
  }

  showAll(): void {
    const state = this.store.getSnapshot()
    if (state.hiddenIds.length === 0) return
    this.store.set({ ...state, hiddenIds: [] })
  }

  move(id: string, direction: -1 | 1, rosterIds: readonly string[]): void {
    const state = this.store.getSnapshot()
    const orderedIds = orderedPresets(
      rosterIds.map(value => ({ id: value })),
      state.orderIds,
    ).map(value => value.id)
    const from = orderedIds.indexOf(id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= orderedIds.length) return
    const target = orderedIds[to]
    if (target === undefined) return
    orderedIds[from] = target
    orderedIds[to] = id
    this.store.set({ ...state, orderIds: orderedIds })
  }

  resetOrder(): void {
    const state = this.store.getSnapshot()
    if (state.orderIds.length === 0) return
    this.store.set({ ...state, orderIds: [] })
  }

  private resolveInitialState(scope?: SettingsScope<VisibilitySettings>): VisibilityState {
    if (scope !== undefined) {
      const snapshot = scope.getSnapshot()
      if (snapshot.status === 'ready' && snapshot.value !== undefined) {
        return normalizeVisibilityState(snapshot.value)
      }
    }
    return readLocalStorageState()
  }

  private onScopeChange(): void {
    const snapshot = this.scope!.getSnapshot()

    // Migrate legacy localStorage data once: the Host scope is ready and has no
    // user-overridden section yet, but the browser still holds old state.
    if (snapshot.status === 'ready' && snapshot.user === undefined) {
      const localState = readLocalStorageState()
      if (localState.hiddenIds.length > 0 || localState.orderIds.length > 0) {
        void this.scope!.mutate(opsForState(localState))
        clearLocalStorageState()
        return
      }
    }

    if (snapshot.status !== 'ready' || snapshot.value === undefined) return

    const normalized = normalizeVisibilityState(snapshot.value)
    if (!stateEqual(normalized, this.store.getSnapshot())) {
      this.applyingFromScope = true
      this.store.set(normalized)
      this.applyingFromScope = false
    }
  }

  private onStoreChange(): void {
    if (this.applyingFromScope) return
    const state = this.store.getSnapshot()
    const snapshot = this.scope!.getSnapshot()
    if (snapshot.status === 'ready' && snapshot.writable) {
      void this.scope!.mutate(opsForState(state))
    } else {
      writeLocalStorageState(state)
    }
  }
}
