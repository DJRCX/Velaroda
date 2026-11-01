import { describe, expect, it } from 'vitest'
import { groundInscription } from './ground'
import type { Offering } from './types'

const rosa: Offering = {
  name: 'Rosa Martínez',
  years: '1948–2019',
  relation: 'My grandmother',
  food: 'Pan dulce',
  song: 'Sabor a Mí',
  memory:
    'Every Sunday, she opened the kitchen window before anyone else woke. She sang while the coffee warmed and always saved the crispest piece of pan dulce for me.',
}

describe('groundInscription', () => {
  it('keeps a sentence built from the notes', () => {
    const [sentence] = groundInscription(
      'Rosa, the crispest piece of pan dulce was saved for you.',
      rosa,
    )
    expect(sentence?.grounded).toBe(true)
  })

  it('strikes a sentence that adds a life that was not written', () => {
    const [sentence] = groundInscription('She never let a Sunday pass quietly.', rosa)
    expect(sentence?.grounded).toBe(false)
  })

  it('strikes foods, days, and people that were not placed on the table', () => {
    const [sentence] = groundInscription(
      'She baked tres leches for the neighbors on Tuesdays.',
      rosa,
    )
    expect(sentence?.grounded).toBe(false)
  })

  it('strikes a year that is not in the notes', () => {
    const [sentence] = groundInscription('Rosa was born in 1952 and loved the kitchen.', rosa)
    expect(sentence?.grounded).toBe(false)
  })

  it('drops a preamble and keeps the prose', () => {
    const sentences = groundInscription(
      "Here is a remembrance. Rosa saved the pan dulce.",
      rosa,
    )
    expect(sentences.map((sentence) => sentence.text)).toEqual(['Rosa saved the pan dulce.'])
  })
})
