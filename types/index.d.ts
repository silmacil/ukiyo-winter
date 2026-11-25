/** How full the context window is, 0 to 100 in steps of 5: the backdrop's dawn reads it. */
export type Fill = number

declare module 'claude-code' {
  interface PluginState {
    'ukiyo-winter': { fill: Fill }
  }
}
