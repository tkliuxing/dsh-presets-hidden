import { describe, expect, it } from 'vitest'
import { Config } from '../src/index.ts'

describe('Host Config', () => {
  it('defaults both lists to empty', () => {
    const config = Config({})
    expect(config.orderIds.get()).toEqual([])
    expect(config.hiddenIds.get()).toEqual([])
  })

  it('marks every field volatile so the settings service serves it as a live form', () => {
    for (const field of Object.values(Config.dict ?? {})) {
      expect(field.meta.volatile).toBe(true)
    }
    expect(Object.keys(Config.dict ?? {})).toEqual(['orderIds', 'hiddenIds'])
  })
})
