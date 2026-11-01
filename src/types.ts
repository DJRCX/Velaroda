export type CandleState = 'unlit' | 'downloading' | 'writing' | 'settled' | 'error'

export type Offering = {
  name: string
  years: string
  relation: string
  food: string
  song: string
  memory: string
}

export type Sentence = {
  text: string
  grounded: boolean
}

export type AltarRecord = Offering & {
  id: string
  sentences: Sentence[]
  modelLabel?: string
  photo?: Blob
  updatedAt: number
}

export const emptyOffering = (): Offering => ({
  name: '',
  years: '',
  relation: '',
  food: '',
  song: '',
  memory: '',
})
