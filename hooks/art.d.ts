import type { ThemeMessageRule } from 'claude-code'
import type { makeColors } from './make-colors.js'

type Fill = NonNullable<ThemeMessageRule['fill']>
type MessageColors = Record<'bg-user-message' | 'text-user-message' | 'bg-assistant-message' | 'text-assistant-message', `#${string}`>

/** The backdrop for a context that is `percent` full (0 to 100). */
export function scene(percent: number): string
export const SLIP_FILL: Fill
export const BOARD_FILL: Fill
export const DEF: Parameters<typeof makeColors>[0]
export const MESSAGES: { light: MessageColors; dark: MessageColors }
