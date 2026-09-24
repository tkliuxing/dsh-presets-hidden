/**
 * One-shot import of the section DSH 0.1.5 kept in `$DSH_HOME/settings.yaml`.
 *
 * DSH 0.1.7 renames that document to `settings.yaml.imported` and imports each
 * section into the profile entry of the same id. Installs whose entry was not
 * yet `preset-visibility` at that moment left this plugin's section behind in
 * the renamed file; this reads it back once, while the profile stores no
 * override of either field.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SettingsForms } from '@deepseek-ai/dsh-settings'
import { parse } from 'yaml'
import {
  HIDDEN_IDS_FIELD, ORDER_IDS_FIELD, PRESET_VISIBILITY_NAMESPACE, hasUserOverride, type VisibilitySettings,
} from './settings.ts'

/** The removed global settings document after DSH's own one-shot import renamed it. */
export const LEGACY_DOCUMENT = 'settings.yaml.imported'

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id !== ''))]
}

/**
 * Extract this plugin's section from the parsed legacy document.
 * @param document - parsed `settings.yaml.imported`.
 * @returns the non-empty section, or undefined when there is nothing to import.
 */
export function legacySection(document: unknown): VisibilitySettings | undefined {
  if (typeof document !== 'object' || document === null) return undefined
  const section: unknown = Reflect.get(document, PRESET_VISIBILITY_NAMESPACE)
  if (typeof section !== 'object' || section === null) return undefined
  const orderIds = ids(Reflect.get(section, ORDER_IDS_FIELD))
  const hiddenIds = ids(Reflect.get(section, HIDDEN_IDS_FIELD))
  return orderIds.length === 0 && hiddenIds.length === 0 ? undefined : { orderIds, hiddenIds }
}

/**
 * Write the legacy section into the profile unless the profile already overrides a field.
 * @param settings - the Host settings service.
 * @param home - the DSH home directory holding the legacy document.
 * @returns whether a section was imported.
 */
export async function importLegacySection(
  settings: Pick<SettingsForms, 'describe' | 'update'>,
  home: string,
): Promise<boolean> {
  const pending = (): { revision: number } | undefined => {
    const descriptor = settings.describe().find(row => row.ns === PRESET_VISIBILITY_NAMESPACE)
    return descriptor === undefined || hasUserOverride(descriptor.user) ? undefined : descriptor
  }
  if (pending() === undefined) return false
  let text: string
  try {
    text = await readFile(join(home, LEGACY_DOCUMENT), 'utf8')
  } catch {
    return false
  }
  const section = legacySection(parse(text))
  // DSH's own first-boot import may have written this entry during the read.
  const target = section === undefined ? undefined : pending()
  if (section === undefined || target === undefined) return false
  try {
    await settings.update(PRESET_VISIBILITY_NAMESPACE, section, target.revision)
  } catch (error) {
    // A concurrent writer moved the revision first; its values stand.
    if (Reflect.get(Object(error), 'code') === 'SETTINGS_CONFLICT') return false
    throw error
  }
  return true
}
