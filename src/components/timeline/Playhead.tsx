interface PlayheadProps {
  positionSeconds: number
  bpm: number
  beatsPerBar: number
  pixelsPerBeat: number
  scrollX: number
  height: number
}

export function Playhead({
  positionSeconds,
  bpm,
  beatsPerBar,
  pixelsPerBeat,
  scrollX,
  height
}: PlayheadProps) {
  const secondsPerBeat = 60 / bpm
  const totalBeats = positionSeconds / secondsPerBeat
  const x = totalBeats * pixelsPerBeat - scrollX

  if (x < -2 || x > 5000) return null

  return (
    <div
      className="absolute top-0 pointer-events-none z-20"
      style={{ left: x, height }}
    >
      <div className="w-3 h-3 -ml-1.5 bg-red-500 rotate-45 transform -translate-y-0.5" />
      <div className="w-0.5 -ml-px bg-red-500" style={{ height }} />
    </div>
  )
}
