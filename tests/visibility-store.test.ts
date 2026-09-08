// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { VisibilitySettings } from '../src/settings.ts'
import {
  normalizeVisibilityState,
  orderedPresets,
  VisibilityController,
  VISIBILITY_STORAGE_KEY,
} from '../src/client/visibility-store.ts'

describe('VisibilityController', () => {
  beforeEach(() => { localStorage.clear() })

  it('normalizes persisted visibility and order ids', () => {
    expect(normalizeVisibilityState({
      hiddenIds: ['z', '', 'a', 'z', 42],
      orderIds: ['custom', 'standard', 'custom', null],
    })).toEqual({
      hiddenIds: ['a', 'z'],
      orderIds: ['custom', 'standard'],
    })
    expect(normalizeVisibilityState({ hiddenIds: 'standard' })).toEqual({
      hiddenIds: [],
      orderIds: [],
    })
  })

  it('survives malformed persisted JSON', () => {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, '{broken')
    const controller = new VisibilityController()
    expect(controller.store.getSnapshot()).toEqual({ hiddenIds: [], orderIds: [] })
  })

  it('toggles and persists hidden ids without losing order', () => {
    const controller = new VisibilityController()
    controller.move('standard', 1, ['standard', 'custom'])
    controller.toggle('standard')
    controller.toggle('minimal')
    expect(controller.store.getSnapshot()).toEqual({
      hiddenIds: ['minimal', 'standard'],
      orderIds: ['custom', 'standard'],
    })
    expect(JSON.parse(localStorage.getItem(VISIBILITY_STORAGE_KEY) ?? 'null')).toEqual({
      hiddenIds: ['minimal', 'standard'],
      orderIds: ['custom', 'standard'],
    })

    controller.toggle('standard')
    controller.showAll()
    expect(controller.store.getSnapshot()).toEqual({
      hiddenIds: [],
      orderIds: ['custom', 'standard'],
    })
  })

  it('orders known presets and appends new roster entries', () => {
    const presets = [{ id: 'standard' }, { id: 'custom' }, { id: 'new' }]
    expect(orderedPresets(presets, ['missing', 'custom', 'standard']).map(preset => preset.id))
      .toEqual(['custom', 'standard', 'new'])
  })

  it('moves presets and restores Host order', () => {
    const controller = new VisibilityController()
    controller.move('custom', -1, ['standard', 'custom', 'minimal'])
    expect(controller.store.getSnapshot().orderIds).toEqual(['custom', 'standard', 'minimal'])

    controller.move('custom', -1, ['standard', 'custom', 'minimal'])
    expect(controller.store.getSnapshot().orderIds).toEqual(['custom', 'standard', 'minimal'])

    controller.resetOrder()
    expect(controller.store.getSnapshot().orderIds).toEqual([])
  })
})

function createMockScope(initial: {
  status: 'loading' | 'ready' | 'unavailable'
  value?: VisibilitySettings
  user?: VisibilitySettings
  writable?: boolean
}): SettingsScope<VisibilitySettings> & { mutations: SettingsPathOpView[][]; setSnapshot(snapshot: typeof initial): void } {
  let snapshot = initial
  const listeners = new Set<() => void>()
  const mutations: SettingsPathOpView[][] = []

  const scope: SettingsScope<VisibilitySettings> = {
    getSnapshot: () => ({
      status: snapshot.status,
      value: snapshot.value,
      base: undefined,
      user: snapshot.user,
      revision: 1,
      writable: snapshot.writable ?? false,
      mode: snapshot.status === 'ready' ? 'host' : 'memory',
    }) as ReturnType<SettingsScope<VisibilitySettings>['getSnapshot']>,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    mutate: async (ops) => {
      mutations.push([...ops])
    },
    set: async () => {},
    unset: async () => {},
  }

  return Object.assign(scope, {
    mutations,
    setSnapshot(next: typeof initial) {
      snapshot = next
      for (const listener of listeners) listener()
    },
  })
}

describe('VisibilityController with Host scope', () => {
  beforeEach(() => { localStorage.clear() })

  it('adopts the Host value once the scope becomes ready', () => {
    const scope = createMockScope({ status: 'loading' })
    const controller = new VisibilityController({ scope })
    expect(controller.store.getSnapshot()).toEqual({ hiddenIds: [], orderIds: [] })

    scope.setSnapshot({
      status: 'ready',
      value: { hiddenIds: ['minimal'], orderIds: ['custom', 'standard'] },
      writable: true,
    })

    expect(controller.store.getSnapshot()).toEqual({
      hiddenIds: ['minimal'],
      orderIds: ['custom', 'standard'],
    })
  })

  it('migrates legacy localStorage data when the Host section is empty', () => {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify({
      hiddenIds: ['minimal'],
      orderIds: ['custom', 'standard'],
    }))
    const scope = createMockScope({ status: 'ready', value: { hiddenIds: [], orderIds: [] }, writable: true })
    new VisibilityController({ scope })

    expect(scope.mutations).toHaveLength(1)
    expect(scope.mutations[0]).toEqual([
      { op: 'set', path: ['hiddenIds'], value: ['minimal'] },
      { op: 'set', path: ['orderIds'], value: ['custom', 'standard'] },
    ])
    expect(localStorage.getItem(VISIBILITY_STORAGE_KEY)).toBeNull()
  })

  it('writes store changes to the Host scope when writable', () => {
    const scope = createMockScope({
      status: 'ready',
      value: { hiddenIds: [], orderIds: [] },
      writable: true,
    })
    const controller = new VisibilityController({ scope })
    controller.toggle('standard')
    controller.move('custom', -1, ['standard', 'custom'])

    expect(scope.mutations).toHaveLength(2)
    expect(scope.mutations[0]).toEqual([
      { op: 'set', path: ['hiddenIds'], value: ['standard'] },
      { op: 'set', path: ['orderIds'], value: [] },
    ])
    expect(scope.mutations[1]).toEqual([
      { op: 'set', path: ['hiddenIds'], value: ['standard'] },
      { op: 'set', path: ['orderIds'], value: ['custom', 'standard'] },
    ])
    expect(localStorage.getItem(VISIBILITY_STORAGE_KEY)).toBeNull()
  })

  it('falls back to localStorage when the Host scope is not writable', () => {
    const scope = createMockScope({
      status: 'ready',
      value: { hiddenIds: [], orderIds: [] },
      writable: false,
    })
    const controller = new VisibilityController({ scope })
    controller.toggle('standard')

    expect(scope.mutations).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(VISIBILITY_STORAGE_KEY) ?? 'null')).toEqual({
      hiddenIds: ['standard'],
      orderIds: [],
    })
  })
})
