/** Settings namespace and field names shared by the Host Config and the browser form. */

/**
 * Profile entry id the bundle patch mounts this plugin under. DSH serves a
 * plugin's volatile Config as the settings namespace named after its entry id,
 * and imports a removed `settings.yaml` section into the entry of the same id.
 */
export const PRESET_VISIBILITY_NAMESPACE = 'preset-visibility'

/** Field carrying the ordered list of preset ids. */
export const ORDER_IDS_FIELD = 'orderIds'

/** Field carrying the list of hidden preset ids. */
export const HIDDEN_IDS_FIELD = 'hiddenIds'

/** Plain preset visibility values as the browser form reads and writes them. */
export interface VisibilitySettings {
  /** Ordered list of preset ids. */
  orderIds: string[]
  /** List of hidden preset ids. */
  hiddenIds: string[]
}

/**
 * Whether a stored profile layer already overrides either field. Presence, not
 * value, marks an override: an explicitly emptied list is still a choice.
 */
export function hasUserOverride(user: unknown): boolean {
  if (typeof user !== 'object' || user === null) return false
  return Object.hasOwn(user, HIDDEN_IDS_FIELD) || Object.hasOwn(user, ORDER_IDS_FIELD)
}
