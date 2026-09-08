import { useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconAgentPresetOutline16,
  IconChevronDownOutline14,
  IconWarningOutline16,
  Menu,
  Toast,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { presetDisplayText } from '@deepseek-ai/dsh-agent-presets/display'
import type { SeatFace } from './types.ts'
import { orderedPresets } from './visibility-store.ts'

export type FilteredAgentPresetSeatProps =
  PropsRuntime<'conversation.hero.agentPreset'>
  & PropsLocale<'settings.presetVisibility'>
  & InjectFace<SeatFace>

const REFUSAL_HOLD_MS = 8000

export function FilteredAgentPresetSeat(props: FilteredAgentPresetSeatProps) {
  const { load, select, t, useFilteredPresetSeat, usePresetVisibility, useRoster } = props
  const roster = useRoster(snapshot => snapshot)
  const visibility = usePresetVisibility(snapshot => snapshot)
  const seat = useFilteredPresetSeat(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ readonly id: number; readonly text: string } | null>(null)
  const toastId = useRef(0)
  const anchorRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const hidden = new Set(visibility.hiddenIds)
  const options = orderedPresets(roster.presets, visibility.orderIds)
    .filter(preset => preset.broken === undefined && !hidden.has(preset.id))
  if (options.length === 0) return null
  const chosen = options.find(preset => preset.id === seat.current) ?? options[0]
  if (chosen === undefined) return null
  const chosenText = presetDisplayText(chosen, t)

  return (
    <>
      <Menu
        open={open}
        onClose={() => { setOpen(false) }}
        items={options.map((preset) => {
          const text = presetDisplayText(preset, t)
          return {
            id: preset.id,
            label: (
              <span className="dph-menu-item">
                <span className="dph-menu-item__name">{text.name}</span>
                <span className="dph-menu-item__desc">{text.description ?? t('noDescription')}</span>
              </span>
            ),
          }
        })}
        selectedId={chosen.id}
        onSelect={(id) => {
          setOpen(false)
          const picked = options.find(preset => preset.id === id)
          const name = picked === undefined ? id : presetDisplayText(picked, t).name
          void select(id).then((refusal) => {
            if (refusal === undefined) return
            toastId.current += 1
            setToast({ id: toastId.current, text: t('switchRefused', { name, reason: refusal }) })
          })
        }}
        align="start"
        portal
        anchor={(
          <button
            ref={anchorRef}
            type="button"
            className="dph-seat"
            aria-haspopup="menu"
            aria-expanded={open}
            title={seat.error ?? t('pickerHint')}
            disabled={seat.busy}
            onClick={() => { setOpen(value => !value) }}
          >
            <IconAgentPresetOutline16 className="dph-seat__icon" />
            <span className="dph-seat__label">{chosenText.name}</span>
            <IconChevronDownOutline14 className="dph-seat__chevron" />
          </button>
        )}
      />
      {toast === null
        ? null
        : (
          <Toast
            key={toast.id}
            text={toast.text}
            icon={<IconWarningOutline16 />}
            holdMs={REFUSAL_HOLD_MS}
            anchor={anchorRef.current}
            onDone={() => { setToast(null) }}
          />
        )}
    </>
  )
}
