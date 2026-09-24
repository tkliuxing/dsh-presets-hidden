import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the `mainView` session reference source merge.
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the ctx.configForms service merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { FilteredAgentPresetSeat } from './FilteredAgentPresetSeat.tsx'
import { PresetVisibilitySection } from './PresetVisibilitySection.tsx'
import { en, zh, type PresetVisibilityKey } from './locales.ts'
import { PRESET_VISIBILITY_NAMESPACE, type VisibilitySettings } from '../settings.ts'
import { RosterController } from './roster-controller.ts'
import { FilteredPresetSeatController } from './seat-controller.ts'
import { STYLES } from './styles.ts'
import type { SeatFace, VisibilityFace } from './types.ts'
import { VisibilityController } from './visibility-store.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.presetVisibility': PresetVisibilityKey
  }
}

const NS = 'settings.presetVisibility'
const STYLE_ID = 'dsh-presets-hidden/styles'

export const inject = ['slots', 'locale', 'remote', 'configForms', 'remote.agentPresets']

export function apply(ctx: ClientContext): void {
  const roster = new RosterController(ctx)
  const hostScope = ctx.configForms.get<VisibilitySettings>(PRESET_VISIBILITY_NAMESPACE)
  const visibility = new VisibilityController({ scope: hostScope })

  ctx.effect(() => {
    return () => { visibility.dispose() }
  }, 'presets-hidden: visibility controller lifecycle')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'presets-hidden: dictionaries')
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return () => {}
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-presets-hidden'
    style.dataset.pluginCss = STYLE_ID
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'presets-hidden: styles')

  const developerTools = ctx.configForms.developerTools.enabled

  const visibilityFace = (): VisibilityFace => ({
    hooks: {
      roster: roster.store,
      presetVisibility: visibility.store,
      showPresetPicker: developerTools,
    },
    load: () => roster.load(),
    toggle: id => { visibility.toggle(id) },
    showAll: () => { visibility.showAll() },
    move: (id, direction, rosterIds) => { visibility.move(id, direction, rosterIds) },
    resetOrder: () => { visibility.resetOrder() },
  })

  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'preset-visibility',
    order: 21,
    label: () => t('nav'),
    locale: NS,
    inject: visibilityFace,
  }, PresetVisibilitySection))

  ctx.effect(() => {
    const reload = (): void => { void roster.load() }
    const disposers = [
      // Preset declarations and the picker policy are ordinary profile Config
      // now, so any entry edit may move the roster; only our own writes cannot.
      ctx.remote.$on('settings/document-updated', (namespace) => {
        if (namespace !== PRESET_VISIBILITY_NAMESPACE) reload()
      }),
      ctx.on('connection/reset', reload),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'presets-hidden: roster refresh')

  ctx.inject(['sessions'], (scope: ClientContext) => {
    const seat = new FilteredPresetSeatController(
      scope,
      roster.store,
      visibility.store,
      () => {
        // The hero hands over to the session the main view retains, preferring a blank one.
        const retained = Object.values(scope.sessions.list.getSnapshot().byId)
          .filter(session => (session.retainedBy.mainView ?? 0) > 0)
        return retained.find(session => session.blank) ?? retained[0]
      },
      () => developerTools.getSnapshot(),
    )

    const seatFace = (): SeatFace => ({
      hooks: {
        roster: roster.store,
        presetVisibility: visibility.store,
        filteredPresetSeat: seat.store,
        showPresetPicker: developerTools,
      },
      load: async () => {
        await roster.load()
        await seat.reconcile()
      },
      select: id => seat.select(id),
    })

    scope.effect(() => {
      const stopRoster = roster.store.subscribe(() => { void seat.reconcile() })
      const stopVisibility = visibility.store.subscribe(() => { void seat.reconcile() })
      const stopDeveloperTools = developerTools.subscribe(() => { void seat.reconcile() })
      const stopSessions = scope.sessions.list.subscribe(() => { void seat.apply() })
      const unregister = scope.slots.inject('conversation.hero.agentPreset', () => scope.slots.register({
        name: 'conversation.hero.agentPreset',
        priority: -10,
        locale: NS,
        inject: seatFace,
      }, FilteredAgentPresetSeat))
      return () => {
        stopRoster()
        stopVisibility()
        stopDeveloperTools()
        stopSessions()
        unregister()
      }
    }, 'presets-hidden: filtered new-session selector')
  })
}
