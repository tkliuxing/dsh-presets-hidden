import { describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { RosterController } from '../src/client/roster-controller.ts'

describe('RosterController', () => {
  it('re-reads once when a reload arrives during a read', async () => {
    const answers = [
      { ok: true, value: { presets: [{ id: 'standard', isDefault: true }], modeSelectionEnabled: true } },
      { ok: true, value: { presets: [{ id: 'standard', isDefault: true }], modeSelectionEnabled: false } },
    ]
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const list = vi.fn(async () => {
      if (list.mock.calls.length === 1) await gate
      return answers[list.mock.calls.length - 1]
    })
    const roster = new RosterController({ remote: { agentPresets: { list } } } as unknown as ClientContext)

    const first = roster.load()
    const second = roster.load()
    const third = roster.load()
    release()
    await Promise.all([first, second, third])

    expect(list).toHaveBeenCalledTimes(2)
    expect(roster.store.getSnapshot().modeSelectionEnabled).toBe(false)
  })
})
