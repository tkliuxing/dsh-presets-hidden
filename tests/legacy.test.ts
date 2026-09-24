import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGACY_DOCUMENT, importLegacySection, legacySection } from '../src/legacy.ts'

const DOCUMENT = `
ui-theme:
  preference: dark
preset-visibility:
  hiddenIds:
    - ptc
    - standard
  orderIds:
    - st
    - standard
    - ptc
`

function fakeSettings(user: unknown, ns = 'preset-visibility') {
  const update = vi.fn(async (_ns: string, _patch: object, _revision?: number) => {})
  return {
    update,
    describe: () => [{ ns, user, revision: 3 }] as never,
  }
}

describe('legacySection', () => {
  it('extracts and cleans this plugin section', () => {
    expect(legacySection({ 'preset-visibility': { hiddenIds: ['a', '', 'a', 1], orderIds: ['b'] } }))
      .toEqual({ hiddenIds: ['a'], orderIds: ['b'] })
  })

  it('ignores missing or empty sections', () => {
    expect(legacySection(null)).toBeUndefined()
    expect(legacySection({ other: {} })).toBeUndefined()
    expect(legacySection({ 'preset-visibility': { hiddenIds: [], orderIds: [] } })).toBeUndefined()
  })
})

describe('importLegacySection', () => {
  let home: string
  beforeEach(() => { home = mkdtempSync(join(tmpdir(), 'dph-legacy-')) })
  afterEach(() => { rmSync(home, { recursive: true, force: true }) })

  it('writes the renamed document section into a profile without overrides', async () => {
    writeFileSync(join(home, LEGACY_DOCUMENT), DOCUMENT)
    const settings = fakeSettings({})

    expect(await importLegacySection(settings, home)).toBe(true)
    expect(settings.update).toHaveBeenCalledWith('preset-visibility', {
      hiddenIds: ['ptc', 'standard'],
      orderIds: ['st', 'standard', 'ptc'],
    }, 3)
  })

  it('keeps an existing profile override', async () => {
    writeFileSync(join(home, LEGACY_DOCUMENT), DOCUMENT)
    const settings = fakeSettings({ hiddenIds: [] })

    expect(await importLegacySection(settings, home)).toBe(false)
    expect(settings.update).not.toHaveBeenCalled()
  })

  it('yields to a concurrent writer that moved the revision first', async () => {
    writeFileSync(join(home, LEGACY_DOCUMENT), DOCUMENT)
    const settings = fakeSettings({})
    settings.update.mockRejectedValueOnce(Object.assign(new Error('conflict'), { code: 'SETTINGS_CONFLICT' }))

    expect(await importLegacySection(settings, home)).toBe(false)
  })

  it('does nothing without the document or the served entry', async () => {
    expect(await importLegacySection(fakeSettings(undefined), home)).toBe(false)
    writeFileSync(join(home, LEGACY_DOCUMENT), DOCUMENT)
    const unserved = fakeSettings(undefined, 'ui-presets-hidden')
    expect(await importLegacySection(unserved, home)).toBe(false)
    expect(unserved.update).not.toHaveBeenCalled()
  })
})
