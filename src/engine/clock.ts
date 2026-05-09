import { TICKS_PER_BEAT } from '../types/midi'
import type { MusicalPosition } from '../types/midi'

export function positionToSeconds(
  position: MusicalPosition,
  bpm: number,
  beatsPerBar: number
): number {
  const secondsPerBeat = 60 / bpm
  const totalBeats =
    (position.bar - 1) * beatsPerBar +
    (position.beat - 1) +
    position.tick / TICKS_PER_BEAT
  return totalBeats * secondsPerBeat
}

export function secondsToPosition(
  seconds: number,
  bpm: number,
  beatsPerBar: number
): MusicalPosition {
  const secondsPerBeat = 60 / bpm
  const totalBeats = seconds / secondsPerBeat
  const totalTicks = Math.round(totalBeats * TICKS_PER_BEAT)

  const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
  const bar = Math.floor(totalTicks / ticksPerBar) + 1
  const remainingTicks = totalTicks % ticksPerBar
  const beat = Math.floor(remainingTicks / TICKS_PER_BEAT) + 1
  const tick = remainingTicks % TICKS_PER_BEAT

  return { bar, beat, tick }
}

export function positionToTotalTicks(
  position: MusicalPosition,
  beatsPerBar: number
): number {
  return (
    (position.bar - 1) * beatsPerBar * TICKS_PER_BEAT +
    (position.beat - 1) * TICKS_PER_BEAT +
    position.tick
  )
}

export function totalTicksToPosition(
  totalTicks: number,
  beatsPerBar: number
): MusicalPosition {
  const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
  const bar = Math.floor(totalTicks / ticksPerBar) + 1
  const remaining = totalTicks % ticksPerBar
  const beat = Math.floor(remaining / TICKS_PER_BEAT) + 1
  const tick = remaining % TICKS_PER_BEAT
  return { bar, beat, tick }
}

export function snapPosition(
  position: MusicalPosition,
  snapMode: 'bar' | 'beat' | 'off',
  beatsPerBar: number
): MusicalPosition {
  switch (snapMode) {
    case 'bar': {
      const totalTicks = positionToTotalTicks(position, beatsPerBar)
      const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
      const snappedBar = Math.round(totalTicks / ticksPerBar)
      return { bar: Math.max(1, snappedBar + 1), beat: 1, tick: 0 }
    }
    case 'beat': {
      const totalTicks = positionToTotalTicks(position, beatsPerBar)
      const snappedBeat = Math.round(totalTicks / TICKS_PER_BEAT)
      return totalTicksToPosition(
        Math.max(0, snappedBeat * TICKS_PER_BEAT),
        beatsPerBar
      )
    }
    case 'off':
      return position
  }
}

export function comparePositions(a: MusicalPosition, b: MusicalPosition, beatsPerBar: number): number {
  return positionToTotalTicks(a, beatsPerBar) - positionToTotalTicks(b, beatsPerBar)
}

export function formatPosition(position: MusicalPosition): string {
  return `${position.bar}.${position.beat}`
}

export function getTotalSeconds(totalBars: number, bpm: number, beatsPerBar: number): number {
  return positionToSeconds({ bar: totalBars + 1, beat: 1, tick: 0 }, bpm, beatsPerBar)
}
