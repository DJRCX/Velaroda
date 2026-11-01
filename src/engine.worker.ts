import { env, pipeline, TextStreamer, type ProgressInfo, type TextGenerationPipeline } from '@huggingface/transformers'
import { buildPrompt } from './prompt'
import type { Offering } from './types'

const MODEL_ID = 'onnx-community/gemma-3-270m-it-ONNX'

type GenerateMessage = {
  id: string
  type: 'generate'
  offering: Offering
  device: 'webgpu' | 'wasm'
  dtype: 'q4f16' | 'q4'
  label: string
  wasmMjs: string
  wasmBinary: string
}

function post(message: Record<string, unknown>) {
  self.postMessage(message)
}

function configureRuntime(message: GenerateMessage) {
  const wasm = env.backends.onnx.wasm
  if (!wasm) throw new Error('The model runtime is missing.')
  wasm.wasmPaths = {
    mjs: message.wasmMjs,
    wasm: message.wasmBinary,
  }
  if (!self.crossOriginIsolated) wasm.numThreads = 1
}

function readGeneratedText(output: unknown): string {
  if (!Array.isArray(output) || output.length === 0) return ''
  const first = output[0] as { generated_text?: unknown }
  const generated = first.generated_text
  if (typeof generated === 'string') return generated
  if (!Array.isArray(generated) || generated.length === 0) return ''
  const last = generated[generated.length - 1] as { content?: unknown } | string
  if (typeof last === 'string') return last
  return typeof last.content === 'string' ? last.content : ''
}

self.addEventListener('message', (event: MessageEvent<GenerateMessage>) => {
  const message = event.data
  if (!message || message.type !== 'generate') return

  void run(message).catch((error: unknown) => {
    const text = error instanceof Error ? error.message : 'The model could not start.'
    post({ id: message.id, type: 'error', message: text })
  })
})

async function run(message: GenerateMessage) {
  configureRuntime(message)

  const generator: TextGenerationPipeline = await pipeline('text-generation', MODEL_ID, {
    device: message.device,
    dtype: message.dtype,
    progress_callback: (info: ProgressInfo) => {
      if (info.status !== 'progress_total') return
      const ratio = info.total > 0 ? info.loaded / info.total : info.progress / 100
      const received = Math.round(info.loaded / 1_000_000)
      const whole = Math.round(info.total / 1_000_000)
      const detail =
        whole > 0
          ? `Bringing the model onto this machine, ${received} of ${whole} MB. This happens once.`
          : 'Bringing the model onto this machine. This happens once.'
      post({ id: message.id, type: 'progress', ratio, detail })
    },
  })

  post({
    id: message.id,
    type: 'progress',
    ratio: 1,
    detail: 'Writing from what you placed.',
  })

  let streamed = ''
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      streamed += text
      post({ id: message.id, type: 'token', text })
    },
  })

  const output = await generator([{ role: 'user', content: buildPrompt(message.offering) }], {
    max_new_tokens: 140,
    do_sample: false,
    streamer,
  })

  const text = streamed.trim() || readGeneratedText(output).trim()
  if (!text) throw new Error('The model returned an empty inscription.')
  post({ id: message.id, type: 'done', text, modelLabel: message.label })
}
