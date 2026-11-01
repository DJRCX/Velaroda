import plainMjs from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url'
import plainWasm from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'
import jsepMjs from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs?url'
import jsepWasm from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url'
import type { Offering } from './types'

export type GenerationProgress = {
  ratio: number
  detail: string
}

type DoneMessage = {
  id: string
  type: 'done'
  text: string
  modelLabel: string
}

type ProgressMessage = {
  id: string
  type: 'progress'
  ratio: number
  detail: string
}

type TokenMessage = {
  id: string
  type: 'token'
  text: string
}

type ErrorMessage = {
  id: string
  type: 'error'
  message: string
}

type WorkerMessage = DoneMessage | ProgressMessage | TokenMessage | ErrorMessage

type Attempt = {
  device: 'webgpu' | 'wasm'
  dtype: 'q4f16' | 'q4'
  label: string
  wasmMjs: string
  wasmBinary: string
  detail: string
}

const ATTEMPTS: Attempt[] = [
  {
    device: 'webgpu',
    dtype: 'q4f16',
    label: 'Gemma 3 270M on this graphics chip',
    wasmMjs: jsepMjs,
    wasmBinary: jsepWasm,
    detail: 'Bringing the model onto this machine. This happens once.',
  },
  {
    device: 'wasm',
    dtype: 'q4',
    label: 'Gemma 3 270M on this processor',
    wasmMjs: plainMjs,
    wasmBinary: plainWasm,
    detail: 'The graphics chip could not run Gemma. Using the processor build already on this machine.',
  },
]

function openWorker(): Worker {
  return new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
}

function runAttempt(
  offering: Offering,
  attempt: Attempt,
  onProgress: (progress: GenerationProgress) => void,
  onToken: (text: string) => void,
): Promise<{ text: string; modelLabel: string }> {
  const id = crypto.randomUUID()
  const worker = openWorker()

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      worker.removeEventListener('message', onMessage)
      worker.terminate()
      callback()
    }

    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (!message || message.id !== id) return

      if (message.type === 'progress') {
        onProgress({ ratio: message.ratio, detail: message.detail })
        return
      }

      if (message.type === 'token') {
        onToken(message.text)
        return
      }

      if (message.type === 'done') {
        finish(() => resolve({ text: message.text, modelLabel: message.modelLabel }))
        return
      }

      finish(() => reject(new Error(message.message)))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', () => {
      finish(() => reject(new Error('The model could not start.')))
    })
    worker.postMessage({
      id,
      type: 'generate',
      offering,
      device: attempt.device,
      dtype: attempt.dtype,
      label: attempt.label,
      wasmMjs: attempt.wasmMjs,
      wasmBinary: attempt.wasmBinary,
    })
  })
}

export async function generateInscription(
  offering: Offering,
  onProgress: (progress: GenerationProgress) => void,
  onToken: (text: string) => void,
): Promise<{ text: string; modelLabel: string }> {
  const gpu = typeof navigator !== 'undefined' && 'gpu' in navigator
  const attempts = ATTEMPTS.filter((attempt) => attempt.device !== 'webgpu' || gpu)
  let lastError: unknown

  for (const attempt of attempts) {
    onProgress({ ratio: 0, detail: attempt.detail })
    try {
      return await runAttempt(offering, attempt, onProgress, onToken)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('The model could not start.')
}
