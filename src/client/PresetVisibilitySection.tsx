import { useEffect, useMemo, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconChevronDownOutline14,
  IconChevronUpOutline14,
  IconRefreshOutline16,
  IconSearchOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
import type { VisibilityFace } from './types.ts'
import type { PresetVisibilityKey } from './locales.ts'
import { searchablePresetText } from './locales.ts'
import { orderedPresets } from './visibility-store.ts'

export type PresetVisibilitySectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.presetVisibility'>
  & InjectFace<VisibilityFace>

type Filter = 'all' | 'visible' | 'hidden'

export function PresetVisibilitySection(props: PresetVisibilitySectionProps) {
  const {
    load, move, resetOrder, showAll, t, toggle, usePresetVisibility, useRoster,
  } = props
  const roster = useRoster(snapshot => snapshot)
  const visibility = usePresetVisibility(snapshot => snapshot)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const hidden = useMemo(() => new Set(visibility.hiddenIds), [visibility.hiddenIds])

  useEffect(() => {
    void load()
  }, [load])

  const rows = orderedPresets(roster.presets, visibility.orderIds).map((preset) => {
    const text = presetDisplayText(preset, t)
    return { preset, text, hidden: hidden.has(preset.id) }
  })
  const rosterIds = rows.map(row => row.preset.id)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = rows.filter((row) => {
    if (filter === 'visible' && row.hidden) return false
    if (filter === 'hidden' && !row.hidden) return false
    return normalizedQuery === '' || searchablePresetText(
      row.preset,
      row.text.name,
      row.text.description,
    ).includes(normalizedQuery)
  })
  const visibleCount = rows.filter(row => !row.hidden).length
  const healthyCount = rows.filter(row => row.preset.broken === undefined).length
  const visibleHealthyCount = rows.filter(row => !row.hidden && row.preset.broken === undefined).length
  const canReorder = normalizedQuery === '' && filter === 'all'

  const segments: readonly [Filter, PresetVisibilityKey][] = [
    ['all', 'filterAll'],
    ['visible', 'filterVisible'],
    ['hidden', 'filterHidden'],
  ]

  return (
    <div className="dph-section">
      <header className="dph-heading">
        <div>
          <h2 className="dph-title">{t('title')}</h2>
          <p className="dph-intro">{t('intro')}</p>
        </div>
        <span className="dph-summary">{t('summary', { visible: visibleCount, total: rows.length })}</span>
      </header>

      <div className="dph-toolbar">
        <label className="dph-search">
          <span className="dph-sr-only">{t('searchLabel')}</span>
          <IconSearchOutline16 />
          <input
            type="search"
            value={query}
            placeholder={t('searchPlaceholder')}
            onChange={event => { setQuery(event.target.value) }}
          />
        </label>
        <div className="dph-segments" role="group" aria-label={t('filterLabel')}>
          {segments.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => { setFilter(id) }}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="dph-toolbar__actions">
          <button
            type="button"
            className="dph-reset"
            disabled={visibility.hiddenIds.length === 0}
            onClick={showAll}
          >
            {t('showAll')}
          </button>
          <button
            type="button"
            className="dph-reset"
            disabled={visibility.orderIds.length === 0}
            onClick={resetOrder}
          >
            <IconRefreshOutline16 size={14} />
            {t('resetOrder')}
          </button>
        </div>
      </div>

      {healthyCount > 0 && visibleHealthyCount === 0
        ? <p className="dph-notice" role="status">{t('allHiddenNotice')}</p>
        : null}
      {roster.status === 'loading' && rows.length === 0
        ? <p className="dph-empty" role="status">{t('loading')}</p>
        : null}
      {roster.status === 'error'
        ? (
          <p className="dph-error" role="alert">
            {`${t('loadError')} ${roster.error ?? ''}`}
            <button type="button" onClick={() => { void load() }}>{t('retry')}</button>
          </p>
        )
        : null}
      {roster.status === 'ready' && rows.length === 0
        ? <p className="dph-empty">{t('emptyRoster')}</p>
        : null}
      {rows.length > 0 && filtered.length === 0
        ? <p className="dph-empty">{t('emptyFilter')}</p>
        : null}

      {filtered.length > 0
        ? (
          <section className="dph-group">
            <h3 className="dph-group__head">
              {t('orderGroup')}
              <span className="dph-group__count">{filtered.length}</span>
            </h3>
            <ul className="dph-list">
              {filtered.map(({ preset, text, hidden: isHidden }) => {
                const position = rows.findIndex(row => row.preset.id === preset.id)
                const reorderTitle = canReorder ? undefined : t('reorderFilteredHint')
                return (
                  <li key={preset.id} className="dph-row" data-hidden={isHidden}>
                    <div className="dph-row__copy">
                      <div className="dph-row__top">
                        <span className="dph-row__name">{text.name}</span>
                        <span className="dph-badge">
                          {t(preset.trust === 'system' ? 'builtInBadge' : 'customBadge')}
                        </span>
                        {preset.isDefault === true
                          ? <span className="dph-badge">{t('defaultBadge')}</span>
                          : null}
                        {preset.broken !== undefined
                          ? <span className="dph-badge dph-badge--error" title={preset.broken}>{t('brokenBadge')}</span>
                          : null}
                      </div>
                      <span className="dph-row__desc">{text.description ?? t('noDescription')}</span>
                      <code className="dph-row__id">{preset.id}</code>
                    </div>
                    <div className="dph-row__control">
                      <div className="dph-order-actions">
                        <button
                          type="button"
                          className="dph-icon-button"
                          disabled={!canReorder || position === 0}
                          title={reorderTitle ?? t('moveUp')}
                          aria-label={t('moveUpLabel', { name: text.name })}
                          onClick={() => { move(preset.id, -1, rosterIds) }}
                        >
                          <IconChevronUpOutline14 />
                        </button>
                        <button
                          type="button"
                          className="dph-icon-button"
                          disabled={!canReorder || position === rows.length - 1}
                          title={reorderTitle ?? t('moveDown')}
                          aria-label={t('moveDownLabel', { name: text.name })}
                          onClick={() => { move(preset.id, 1, rosterIds) }}
                        >
                          <IconChevronDownOutline14 />
                        </button>
                      </div>
                      <span className="dph-row__state">{t(isHidden ? 'hidden' : 'visible')}</span>
                      <button
                        type="button"
                        role="switch"
                        className="dph-switch"
                        aria-checked={!isHidden}
                        aria-label={t('switchLabel', { name: text.name })}
                        onClick={() => { toggle(preset.id) }}
                      >
                        <span className="dph-switch__thumb" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
        : null}
    </div>
  )
}
