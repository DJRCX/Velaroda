import { useEffect, useRef } from 'react'

type ClearDialogProps = {
  name: string
  onClose: () => void
  onClear: () => void
}

export function ClearDialog({ name, onClose, onClear }: ClearDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    keepRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  const firstName = name.trim().split(/\s+/)[0] || 'them'

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-title"
      >
        <span className="dialog-candle" aria-hidden="true" />
        <h2 id="clear-title">Clear the altar for {firstName}?</h2>
        <p>The photo and the inscription will be removed from this browser.</p>
        <div>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear the altar
          </button>
          <button ref={keepRef} type="button" onClick={onClose}>
            Keep it lit
          </button>
        </div>
      </section>
    </div>
  )
}
