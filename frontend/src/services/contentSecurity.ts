export function preventDefaultEvent(e: Event) {
  e.preventDefault()
}

export function blockContextMenu(e: React.MouseEvent | MouseEvent) {
  e.preventDefault()
  return false
}

export function isCopyPasteShortcut(e: KeyboardEvent) {
  const key = e.key.toLowerCase()
  if (e.ctrlKey || e.metaKey) {
    return ['s', 'p', 'c', 'v', 'a', 'x', 'u'].includes(key)
  }
  return false
}

export function isDevToolsShortcut(e: KeyboardEvent) {
  const key = e.key.toLowerCase()
  if (e.key === 'F12') return true
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) return true
  if ((e.ctrlKey || e.metaKey) && key === 'u') return true
  return false
}

export function setupAntiCopyListeners(container: HTMLElement | null | Document) {
  if (!container) return () => {}
  const el = container instanceof Document ? document.body : container

  const handlers: Array<[string, EventListener]> = [
    ['contextmenu', preventDefaultEvent as EventListener],
    ['copy', preventDefaultEvent as EventListener],
    ['cut', preventDefaultEvent as EventListener],
    ['dragstart', preventDefaultEvent as EventListener],
    ['drop', preventDefaultEvent as EventListener],
    ['selectstart', preventDefaultEvent as EventListener],
  ]

  handlers.forEach(([event, handler]) => el.addEventListener(event, handler, true))

  return () => {
    handlers.forEach(([event, handler]) => el.removeEventListener(event, handler, true))
  }
}

export function setupKeyboardBlocker() {
  const handler = (e: KeyboardEvent) => {
    if (isCopyPasteShortcut(e) || isDevToolsShortcut(e) || e.key === 'PrintScreen') {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  document.addEventListener('keydown', handler, true)
  return () => document.removeEventListener('keydown', handler, true)
}

export function detectDevTools(callback: (open: boolean) => void) {
  let threshold = 160
  const check = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    callback(widthThreshold || heightThreshold)
  }
  const interval = window.setInterval(check, 1000)
  window.addEventListener('resize', check)
  return () => {
    clearInterval(interval)
    window.removeEventListener('resize', check)
  }
}
