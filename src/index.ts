/** Host half: registers the durable preset-visibility settings namespace. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { PRESET_VISIBILITY_NAMESPACE, VisibilitySettingsSchema } from './settings.ts'

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(PRESET_VISIBILITY_NAMESPACE, VisibilitySettingsSchema)
  })
}
