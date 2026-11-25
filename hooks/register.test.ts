import { expect, test } from 'claude-code/testing'

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('loading the mod changes nothing until /ukiyo on', async ($, on) => {
  const sets: unknown[] = []
  const registered: string[] = []
  on('store.get', () => ({ value: undefined }))
  on('command.register', (_, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 't1' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start(START)

  // The hook ran to the end: the command is there, and no look was set.
  expect(registered).toEqual(['ukiyo'])
  expect(sets.length).toBe(0)
})

test('/ukiyo on sets the look and remembers it; /ukiyo off clears it', async ($, on) => {
  const sets: unknown[] = []
  let clears = 0
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'ukiyo' } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 't1' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start(START)

  const onRun = await $.command.run({ command: 'ukiyo', args: 'on' })
  expect(JSON.stringify(onRun)).toContain('Ukiyo Winter is on')
  expect(sets.length).toBe(1)
  expect(store.get('enabled')).toBe(true)

  // A later session starts with the look already on.
  await $.session.start(START)
  expect(sets.length).toBe(2)

  const offRun = await $.command.run({ command: 'ukiyo', args: 'off' })
  expect(JSON.stringify(offRun)).toContain('Ukiyo Winter is off')
  expect(clears).toBe(1)
  expect(store.get('enabled')).toBe(false)
})

test('a host without style or scene names steps down to what it takes', async ($, on) => {
  // The test host is such a host: it refuses `style`, and names scenes by `id`.
  const sets: Record<string, unknown>[] = []
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'ukiyo' } }))
  on('theme.set', (_, e) => {
    sets.push(e as unknown as Record<string, unknown>)
    return { value: { isDrawn: true, requestId: 't1' } }
  })

  const run = JSON.stringify(await $.command.run({ command: 'ukiyo', args: 'on' }))
  expect(run).toContain('scene and colors (no frames or type)')
  expect(run).toContain('This app refused')
  expect(sets.length).toBe(1)
  expect(Object.keys(sets[0] ?? {}).sort()).toEqual(['backdrop', 'colors'])
})

test('dawn rises with the context and a compaction brings back the night', async ($, on) => {
  let percent = 82
  on('store.get', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'ukiyo' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000, percent }, rateLimits: {}, cost: {} },
  }))
  const summary = { role: 'user', text: 'Summary of the night so far.', toolUses: [] } as const
  on('session.compact', () => ({ messages: [summary] }))
  const source = async () => {
    const ui = await $.ui.mount({ plugin: 'ukiyo-winter', surface: 'desktop', component: 'Backdrop', props: { scene: 'ukiyo-winter' } })
    const svg = await ui.find({ type: 'Svg' })
    await ui.unmount()
    return String(svg?.props.source ?? '')
  }

  // A fresh session at 0% has no dawn and the moon high.
  expect(await source()).toContain('.dawn{transform:scaleY(0.15);opacity:0}')

  // 82% rounds to 80%: dawn well up the sky, the moon low.
  await $.session.start(START)
  expect(await source()).toContain('.dawn{transform:scaleY(0.64);opacity:0.74}')

  // Compacting brings a fresh night, whatever the stale figures say.
  percent = 90
  await $.session.compact({ trigger: 'manual', messages: [summary] })
  expect(await source()).toContain('.dawn{transform:scaleY(0.15);opacity:0}')
})

test('the backdrop draws the winter scene on desktop and mobile only', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'ukiyo-winter', surface, component: 'Backdrop', props: { scene: 'ukiyo-winter' } })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})
