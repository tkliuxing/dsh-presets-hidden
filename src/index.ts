/** Host half: declares the live preset-visibility Config the browser form edits. */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { importLegacySection } from './legacy.ts'
import { HIDDEN_IDS_FIELD, ORDER_IDS_FIELD } from './settings.ts'

/** Live preset visibility; every field is volatile, so form edits apply without remounting. */
export interface Config {
  orderIds: Volatile<string[]>
  hiddenIds: Volatile<string[]>
}

/** The settings service projects these volatile fields into the `preset-visibility` form. */
export const Config = z.object({
  [ORDER_IDS_FIELD]: z.array(z.string()).default([]).volatile(),
  [HIDDEN_IDS_FIELD]: z.array(z.string()).default([]).volatile(),
})

export function apply(ctx: Context): void {
  // The browser half renders its own settings section; suppress the generated Plugins-page form.
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })

  // The settings service describes only active entries, so wait for the Loader to settle first.
  ctx.inject(['settings', 'profileContext'], (child) => {
    void child.root.loader.await()
      .then(() => importLegacySection(child.settings, child.profileContext.home))
      .then((imported) => {
        if (imported) child.logger.info('imported the legacy preset-visibility section into the active profile')
      })
      .catch((error: unknown) => { child.logger.warn(error) })
  })
}
