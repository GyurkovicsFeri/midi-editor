import { Mp3Encoder } from '@breezystack/lamejs'

const TARGET_KBPS = 128

export async function compressToMp3(audioData: ArrayBuffer): Promise<{ data: ArrayBuffer; fileName: string }> {
  const audioCtx = new OfflineAudioContext(1, 1, 44100)
  const decoded = await audioCtx.decodeAudioData(audioData.slice(0))

  const sampleRate = decoded.sampleRate
  const channels = decoded.numberOfChannels
  const encoder = new Mp3Encoder(channels, sampleRate, TARGET_KBPS)

  const left = convertTo16Bit(decoded.getChannelData(0))
  const right = channels > 1 ? convertTo16Bit(decoded.getChannelData(1)) : undefined

  const chunks: Uint8Array[] = []

  const blockSize = 1152
  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize)
    const rightChunk = right?.subarray(i, i + blockSize)
    const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk)
    if (mp3buf.length > 0) chunks.push(mp3buf)
  }

  const end = encoder.flush()
  if (end.length > 0) chunks.push(end)

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const mp3 = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    mp3.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset)
    offset += chunk.length
  }

  return { data: mp3.buffer as ArrayBuffer, fileName: 'audio.mp3' }
}

function convertTo16Bit(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return int16
}

export function isAlreadyMp3(fileName: string): boolean {
  return /\.mp3$/i.test(fileName)
}
