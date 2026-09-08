import { describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SessionId } from '@deepseek-ai/dsh-session'
import { FilteredPresetSeatController, healthyVisible } from '../src/client/seat-controller.ts'
import type { RosterState, VisibilityState } from '../src/client/types.ts'

const roster: RosterState = {
  status: 'ready',
  error: null,
  presets: [
    { id: 'standard', trust: 'system', isDefault: true },
    { id: 'custom', trust: 'user' },
    { id: 'broken', trust: 'user', broken: 'invalid composition' },
  ],
}

describe('filtered preset seat', () => {
  it('applies preferred order before excluding hidden and broken presets', () => {
    expect(healthyVisible(roster, {
      hiddenIds: ['standard'],
      orderIds: ['broken', 'custom', 'standard'],
    }).map(preset => preset.id)).toEqual(['custom'])
  })

  it('moves a blank session away from a hidden Host default', async () => {
    const select = vi.fn(async () => ({ ok: true as const, value: 'custom' }))
    const ctx = { remote: { agentPresets: { select } } } as unknown as ClientContext
    const rosterStore = createSnapshotStore(roster)
    const visibilityStore = createSnapshotStore<VisibilityState>({
      hiddenIds: ['standard'],
      orderIds: [],
    })
    const controller = new FilteredPresetSeatController(
      ctx,
      rosterStore,
      visibilityStore,
      () => ({ id: SessionId('session-1'), blank: true, projectionValues: { agentPreset: 'standard' } }),
    )

    await controller.reconcile()

    expect(select).toHaveBeenCalledWith('session-1', 'custom')
    expect(controller.store.getSnapshot()).toEqual({ current: 'custom', busy: false, error: null })

    visibilityStore.set({ hiddenIds: ['standard'], orderIds: ['custom', 'standard'] })
    await controller.reconcile()
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('uses the first ordered preset when the Host default is hidden', async () => {
    const select = vi.fn(async (_sessionId, presetId: string) => ({ ok: true as const, value: presetId }))
    const ctx = { remote: { agentPresets: { select } } } as unknown as ClientContext
    const controller = new FilteredPresetSeatController(
      ctx,
      createSnapshotStore(roster),
      createSnapshotStore<VisibilityState>({
        hiddenIds: ['standard'],
        orderIds: ['broken', 'custom', 'standard'],
      }),
      () => ({ id: SessionId('session-1'), blank: true, projectionValues: { agentPreset: 'standard' } }),
    )

    await controller.reconcile()

    expect(select).toHaveBeenCalledWith('session-1', 'custom')
  })

  it('renders no selection when every healthy preset is hidden', async () => {
    const select = vi.fn()
    const ctx = { remote: { agentPresets: { select } } } as unknown as ClientContext
    const controller = new FilteredPresetSeatController(
      ctx,
      createSnapshotStore(roster),
      createSnapshotStore<VisibilityState>({ hiddenIds: ['standard', 'custom'], orderIds: [] }),
      () => ({ id: SessionId('session-1'), blank: true, projectionValues: { agentPreset: 'standard' } }),
    )

    await controller.reconcile()

    expect(select).not.toHaveBeenCalled()
    expect(controller.store.getSnapshot().current).toBe('')
  })
})
