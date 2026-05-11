import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
  children?: MenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const left = x + rect.width > window.innerWidth ? Math.max(0, x - rect.width) : x
    const top = y + rect.height > window.innerHeight ? Math.max(0, window.innerHeight - rect.height) : y
    setPos({ left, top })
  }, [x, y])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-xl py-1 min-w-[160px]"
      style={{ left: pos.left, top: pos.top }}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="h-px bg-gray-700 my-1" />
        ) : item.children ? (
          <SubMenuItem key={i} item={item} onClose={onClose} />
        ) : (
          <button
            key={i}
            onClick={() => {
              item.onClick?.()
              onClose()
            }}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-1.5 text-xs
              ${item.disabled ? 'text-gray-600 cursor-not-allowed' : ''}
              ${item.danger && !item.disabled ? 'text-red-400 hover:bg-red-900/20' : ''}
              ${!item.danger && !item.disabled ? 'text-gray-200 hover:bg-gray-700' : ''}
            `}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

function SubMenuItem({
  item,
  onClose
}: {
  item: MenuItem
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const rowRef = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  const [flipLeft, setFlipLeft] = useState(false)

  useLayoutEffect(() => {
    if (!open || !rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    setFlipLeft(rect.right + 160 > window.innerWidth)
  }, [open])

  return (
    <div
      ref={rowRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div
        className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 flex items-center justify-between cursor-default"
      >
        {item.label}
        <span className="ml-3 text-gray-500 text-[10px]">▸</span>
      </div>

      {open && item.children && (
        <div
          className="absolute z-50 bg-gray-800 border border-gray-600 rounded-md shadow-xl py-1 min-w-[160px] max-h-[300px] overflow-y-auto"
          style={{
            top: 0,
            [flipLeft ? 'right' : 'left']: '100%'
          }}
        >
          {item.children.map((child, j) =>
            child.divider ? (
              <div key={j} className="h-px bg-gray-700 my-1" />
            ) : (
              <button
                key={j}
                onClick={() => {
                  child.onClick?.()
                  onClose()
                }}
                disabled={child.disabled}
                className={`w-full text-left px-3 py-1.5 text-xs
                  ${child.disabled ? 'text-gray-600 cursor-not-allowed' : ''}
                  ${child.danger && !child.disabled ? 'text-red-400 hover:bg-red-900/20' : ''}
                  ${!child.danger && !child.disabled ? 'text-gray-200 hover:bg-gray-700' : ''}
                `}
              >
                {child.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
