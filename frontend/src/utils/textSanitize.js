/**
 * Quita emojis y secuencias típicas (ZWJ, VS16) para nombres de categoría en UI.
 * No sustituye validación en servidor.
 */
const EMOJI_BLOCKS =
  /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu

export function stripEmojis(str) {
  if (str == null || str === '') return ''
  return String(str).replace(EMOJI_BLOCKS, '').trim()
}
