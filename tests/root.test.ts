import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { ROOT_CONTEXT, rootContext } from '../src/root.ts'

const asContext = (value: object): Context => value as Context

/** Model of a cordis 4.2 context: the root sits under the symbol, and reading `root` throws. */
function newerLine(): { root: object, ctx: Context } {
  const root = { loader: {} }
  const proto = Object.create(null)
  Object.defineProperty(proto, ROOT_CONTEXT, { value: root, enumerable: false })
  Object.defineProperty(proto, 'root', {
    get(): never { throw new Error('cannot get property "root" without inject') },
    enumerable: false,
  })
  return { root, ctx: asContext(Object.create(proto)) }
}

/** Model of a cordis 4.0/4.1 context: the root is the inherited `root` field. */
function olderLine(): { root: object, ctx: Context } {
  const root: Record<string, unknown> = { loader: {} }
  root.root = root
  return { root, ctx: asContext(Object.create(root)) }
}

describe('rootContext', () => {
  it('reads the root a cordis 4.2 context carries under Symbol.for("cordis.root")', () => {
    const { root, ctx } = newerLine()
    expect(rootContext(ctx)).toBe(root)
  })

  it('never reads the removed `root` field on a cordis 4.2 context', () => {
    // The 4.2 getter throws; reaching it would fail this test instead of returning the root.
    expect(() => rootContext(newerLine().ctx)).not.toThrow()
  })

  it('falls back to the `root` field a cordis 4.0/4.1 context carries', () => {
    const { root, ctx } = olderLine()
    expect(rootContext(ctx)).toBe(root)
  })

  it('finds the root through the inherited context chain, not just on the direct context', () => {
    const newer = newerLine()
    expect(rootContext(asContext(Object.create(newer.ctx as object)))).toBe(newer.root)
    const older = olderLine()
    expect(rootContext(asContext(Object.create(older.ctx as object)))).toBe(older.root)
  })

  it('reports a context carrying neither carrier as unknown instead of guessing', () => {
    expect(rootContext(asContext({}))).toBeUndefined()
  })
})
