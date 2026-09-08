import type { PresetRecord } from './types.ts'

export type PresetVisibilityKey =
  | 'nav' | 'title' | 'intro' | 'searchLabel' | 'searchPlaceholder'
  | 'filterLabel' | 'filterAll' | 'filterVisible' | 'filterHidden' | 'showAll' | 'loading'
  | 'visible' | 'hidden' | 'builtInBadge' | 'customBadge' | 'orderGroup'
  | 'defaultBadge' | 'brokenBadge' | 'noDescription' | 'summary'
  | 'emptyRoster' | 'emptyFilter' | 'loadError' | 'retry' | 'allHiddenNotice'
  | 'pickerHint' | 'switchRefused' | 'switchLabel' | 'resetOrder'
  | 'moveUp' | 'moveDown' | 'moveUpLabel' | 'moveDownLabel' | 'reorderFilteredHint'
  | 'presetStandardName' | 'presetStandardDescription'
  | 'presetPtcName' | 'presetPtcDescription'
  | 'presetMinimalName' | 'presetMinimalDescription'
  | 'presetCordisName' | 'presetCordisDescription'

export const en: Record<PresetVisibilityKey, string> = {
  nav: 'Preset display',
  title: 'Preset display and order',
  intro: 'Choose and order the agent presets shown when starting a new session. These preferences are stored in this browser.',
  searchLabel: 'Search presets',
  searchPlaceholder: 'Search name or identifier',
  filterLabel: 'Preset visibility filter',
  filterAll: 'All',
  filterVisible: 'Visible',
  filterHidden: 'Hidden',
  showAll: 'Show all',
  resetOrder: 'Reset order',
  loading: 'Loading agent presets…',
  visible: 'Visible',
  hidden: 'Hidden',
  builtInBadge: 'Built-in',
  customBadge: 'Custom',
  orderGroup: 'Preset order',
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveUpLabel: 'Move {name} up',
  moveDownLabel: 'Move {name} down',
  reorderFilteredHint: 'Clear search and select All to reorder',
  defaultBadge: 'Default',
  brokenBadge: 'Failed to load',
  noDescription: 'No description.',
  summary: '{visible} of {total} visible',
  emptyRoster: 'No agent presets are available.',
  emptyFilter: 'No presets match this view.',
  loadError: 'Could not load agent presets.',
  retry: 'Retry',
  allHiddenNotice: 'All presets are hidden. The new-session preset control is not shown; the Host default still applies.',
  pickerHint: 'Visible agent presets for the session you are about to start',
  switchRefused: 'Could not switch to {name}: {reason}',
  switchLabel: 'Show {name} in the new-session picker',
  presetStandardName: 'Standard mode',
  presetStandardDescription: 'Full coding agent with file editing, shell, file and web search, skills, planning, goals, subagents, and workflows.',
  presetPtcName: 'PTC mode',
  presetPtcDescription: 'Full coding agent without the workflow tool; other tools are exposed through the PTC mode SDK.',
  presetMinimalName: 'Minimal mode',
  presetMinimalDescription: 'Two-tool coding agent with persistent bash and str_replace_editor.',
  presetCordisName: 'Creator mode',
  presetCordisDescription: 'Built for creating custom agent presets, with authoring and runtime-inspection capabilities.',
}

export const zh: Record<PresetVisibilityKey, string> = {
  nav: '预设显示',
  title: '预设显示与顺序',
  intro: '选择新会话中显示的 Agent 预设并调整排列顺序。这些偏好仅保存在当前浏览器。',
  searchLabel: '搜索预设',
  searchPlaceholder: '搜索名称或标识符',
  filterLabel: '预设显隐筛选',
  filterAll: '全部',
  filterVisible: '显示',
  filterHidden: '隐藏',
  showAll: '全部显示',
  resetOrder: '恢复默认顺序',
  loading: '正在加载 Agent 预设…',
  visible: '显示',
  hidden: '隐藏',
  builtInBadge: '内置',
  customBadge: '自定义',
  orderGroup: '预设顺序',
  moveUp: '上移',
  moveDown: '下移',
  moveUpLabel: '上移「{name}」',
  moveDownLabel: '下移「{name}」',
  reorderFilteredHint: '清空搜索并选择“全部”后可调整顺序',
  defaultBadge: '默认',
  brokenBadge: '加载失败',
  noDescription: '暂无描述。',
  summary: '显示 {visible} / {total}',
  emptyRoster: '当前没有可用的 Agent 预设。',
  emptyFilter: '当前视图中没有匹配的预设。',
  loadError: '无法加载 Agent 预设。',
  retry: '重试',
  allHiddenNotice: '所有预设均已隐藏。新会话中将不显示预设控件，但 Host 默认预设仍会生效。',
  pickerHint: '即将开始的会话中可见的 Agent 预设',
  switchRefused: '无法切换到「{name}」：{reason}',
  switchLabel: '在新会话选择器中显示「{name}」',
  presetStandardName: '标准模式',
  presetStandardDescription: '功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。',
  presetPtcName: 'PTC 模式',
  presetPtcDescription: '功能完整的编码 Agent，但默认不提供 workflow 工具；其他工具通过 PTC 模式 SDK 呈现。',
  presetMinimalName: '极简模式',
  presetMinimalDescription: '仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。',
  presetCordisName: '创造模式',
  presetCordisDescription: '用于创建自定义 Agent 预设，并提供创作与运行时检查能力。',
}

export function searchablePresetText(
  preset: PresetRecord,
  name: string,
  description?: string,
): string {
  return `${name}\n${preset.id}\n${description ?? preset.description ?? ''}`.toLocaleLowerCase()
}
