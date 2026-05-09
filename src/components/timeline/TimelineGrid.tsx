interface TimelineGridProps {
  totalBars: number
  beatsPerBar: number
  pixelsPerBeat: number
  height: number
  scrollX: number
}

export function TimelineGrid({
  totalBars,
  beatsPerBar,
  pixelsPerBeat,
  height,
  scrollX
}: TimelineGridProps) {
  const pixelsPerBar = pixelsPerBeat * beatsPerBar
  const totalWidth = totalBars * pixelsPerBar

  const lines: JSX.Element[] = []
  for (let bar = 0; bar <= totalBars; bar++) {
    const x = bar * pixelsPerBar
    lines.push(
      <line
        key={`bar-${bar}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        className="stroke-gray-600"
        strokeWidth={1}
      />
    )
    if (beatsPerBar > 1) {
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const bx = x + beat * pixelsPerBeat
        lines.push(
          <line
            key={`beat-${bar}-${beat}`}
            x1={bx}
            y1={0}
            x2={bx}
            y2={height}
            className="stroke-gray-700/50"
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        )
      }
    }
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: totalWidth,
        height,
        transform: `translateX(${-scrollX}px)`
      }}
    >
      {lines}
    </svg>
  )
}
