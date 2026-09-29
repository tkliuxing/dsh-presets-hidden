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

  it('reads a chooser-policy-free roster as selection enabled', async () => {
    // DSH 0.1.7-rc.2 answers presets only; Developer tools are the sole picker gate there.
    const list = vi.fn(async () => ({
      ok: true,
      value: { presets: [{ id: 'standard', isDefault: true }] },
    }))
    const roster = new RosterController({ remote: { agentPresets: { list } } } as unknown as ClientContext)

    await roster.load()

    expect(roster.store.getSnapshot().modeSelectionEnabled).toBe(true)
    expect(roster.store.getSnapshot().status).toBe('ready')
  })

  it('keeps honouring a chooser policy an older Host still publishes', async () => {
    const list = vi.fn(async () => ({
      ok: true,
      value: { presets: [{ id: 'standard', isDefault: true }], modeSelectionEnabled: false },
    }))
    const roster = new RosterController({ remote: { agentPresets: { list } } } as unknown as ClientContext)

    await roster.load()

    expect(roster.store.getSnapshot().modeSelectionEnabled).toBe(false)
  })

  it('still withholds selection when no Host remote answers', async () => {
    const list = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'gateway/invocation-unavailable', message: 'unavailable' },
    }))
    const roster = new RosterController({ remote: { agentPresets: { list } } } as unknown as ClientContext)

    await roster.load()

    expect(roster.store.getSnapshot().modeSelectionEnabled).toBe(false)
  })
})
