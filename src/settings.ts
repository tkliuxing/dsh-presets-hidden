/** Host settings namespace for the preset visibility plugin. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the preset-visibility plugin. */
export const PRESET_VISIBILITY_NAMESPACE = 'preset-visibility'

/** Field carrying the ordered list of preset ids. */
export const ORDER_IDS_FIELD = 'orderIds'

/** Field carrying the list of hidden preset ids. */
export const HIDDEN_IDS_FIELD = 'hiddenIds'

/** Durable preset visibility section shared by the Host schema and the browser scope. */
export interface VisibilitySettings {
  /** Ordered list of preset ids. */
  orderIds: string[]
  /** List of hidden preset ids. */
  hiddenIds: string[]
}

/** Durable preset visibility schema; also the wire envelope the browser scope validates against. */
export const VisibilitySettingsSchema: z<VisibilitySettings> = z.object({
  [ORDER_IDS_FIELD]: z.array(z.string()).default([]),
  [HIDDEN_IDS_FIELD]: z.array(z.string()).default([]),
})
