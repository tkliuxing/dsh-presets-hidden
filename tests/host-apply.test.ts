import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import { ROOT_CONTEXT } from '../src/root.ts'

interface Injection {
  names: readonly string[]
  run: (child: unknown) => void
}

const ROOT_ERROR = 'cannot get property "root" without inject'

function harness(): { ctx: Context, injections: Injection[] } {
  const injections: Injection[] = []
  const inject = (names: readonly string[], run: (child: unknown) => void): void => {
    injections.push({ names, run })
  }
  return { ctx: { inject } as unknown as Context, injections }
}

/** The inject callback that performs the legacy import (the one asking for `profileContext`). */
function legacyImport(injections: Injection[]): Injection {
  const found = injections.find(injection => injection.names.includes('profileContext'))
  if (found === undefined) throw new Error('apply registered no settings/profileContext injection')
  return found
}

interface ChildParts {
  logger: { warn: ReturnType<typeof vi.fn>, info: ReturnType<typeof vi.fn> }
  awaitLoader: ReturnType<typeof vi.fn>
  child: object
}

function childOfRootCarrier(
  carrier: 'newer' | 'older' | 'unknown',
  awaitLoader = vi.fn(async () => {}),
): ChildParts {
  const logger = { warn: vi.fn(), info: vi.fn() }
  // No settings descriptor: importLegacySection returns before touching the file system.
  const base = { logger, settings: { describe: () => [] }, profileContext: { home: '/nonexistent' } }
  const root = { loader: { await: awaitLoader } }
  const proto = Object.create(base)
  if (carrier === 'newer') {
    // cordis 4.2: the root is behind the symbol and the removed field throws.
    Object.defineProperty(proto, ROOT_CONTEXT, { value: root, enumerable: false })
    Object.defineProperty(proto, 'root', { get(): never { throw new Error(ROOT_ERROR) }, enumerable: false })
  } else if (carrier === 'older') {
    // cordis 4.0/4.1: the root is the inherited `root` field.
    Object.defineProperty(proto, 'root', { value: root, enumerable: true })
  }
  return { logger, awaitLoader, child: Object.create(proto) }
}

/** Let the `.then` chain inside the inject callback settle. */
const settle = (): Promise<void> => new Promise(resolve => { setImmediate(resolve) })

describe('Host apply: legacy import across cordis lines', () => {
  it('waits for the Loader on a cordis 4.2 context instead of throwing on the removed `root` field', async () => {
    const { ctx, injections } = harness()
    apply(ctx)
    const { logger, awaitLoader, child } = childOfRootCarrier('newer')

    expect(() => legacyImport(injections).run(child)).not.toThrow()
    await settle()

    expect(awaitLoader).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('waits for the Loader on a cordis 4.0/4.1 context through the `root` field', async () => {
    const { ctx, injections } = harness()
    apply(ctx)
    const { logger, awaitLoader, child } = childOfRootCarrier('older')

    legacyImport(injections).run(child)
    await settle()

    expect(awaitLoader).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('says so instead of guessing when a context carries no root carrier', async () => {
    const { ctx, injections } = harness()
    apply(ctx)
    const { logger, awaitLoader, child } = childOfRootCarrier('unknown')

    legacyImport(injections).run(child)
    await settle()

    expect(awaitLoader).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(String(logger.warn.mock.calls[0]?.[0])).toContain('root context')
  })

  it('reports a failing legacy import through the Logger instead of throwing out of the inject callback', async () => {
    const { ctx, injections } = harness()
    apply(ctx)
    const awaitLoader = vi.fn(async () => { throw new Error('loader exploded') })
    const { logger, child } = childOfRootCarrier('newer', awaitLoader)

    legacyImport(injections).run(child)
    await settle()

    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(String(logger.warn.mock.calls[0]?.[0])).toContain('loader exploded')
  })
})
