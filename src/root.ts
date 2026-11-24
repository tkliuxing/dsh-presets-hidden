/** Locate the application root context across the cordis lines this plugin supports. */

import type { Context } from '@deepseek-ai/cordis'

/**
 * Symbol key cordis 4.2 uses for the root context — the key behind `Context.root`.
 *
 * The symbol registry is process-global and `Context.root` is created with
 * `Symbol.for`, so this reproduces the key exactly without importing cordis as a
 * value: the Host half keeps resolving cordis through the running dsh, never
 * through the plugin's own node_modules.
 */
export const ROOT_CONTEXT = Symbol.for('cordis.root')

/** A context read through whichever root carrier its cordis line defines. */
interface RootCarrier {
  readonly [key: symbol]: Context | undefined
  readonly root?: Context
}

/**
 * The root context of `ctx`, on both cordis lines this plugin supports.
 *
 * cordis 4.0/4.1 keep the root in the instance field `ctx.root`. cordis 4.2
 * removed that field in favour of `ctx[Context.root]` and makes reading the old
 * field throw `cannot get property "root" without inject`, so the symbol is
 * probed first and the field is only read when the symbol is absent — that is,
 * on the older lines.
 *
 * @param ctx - any live context.
 * @returns the root context, or undefined when the context carries neither
 *   carrier; nothing is guessed, so the caller decides how to report it.
 */
export function rootContext(ctx: Context): Context | undefined {
  const carrier = ctx as unknown as RootCarrier
  if (ROOT_CONTEXT in carrier) return carrier[ROOT_CONTEXT]
  return carrier.root
}
