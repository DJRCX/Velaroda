import type { Offering, Sentence } from './types'

const STOP = new Set(
  `a an the and or but if in on at to for of with by from as is was were are be been being
   it its this that these those he she they them his her their we you your i my me our
   who whom which what when where how not no so than then too very just into over after
   before about up out off again once also only even ever never each other another such
   own same more most some any all did do does had has have having while because until
   through during without within would could should can will let`.split(/\s+/),
)

const CEREMONIAL = new Set(
  `remember remembers remembered remembrance memory memories love loved loves loving
   candle candles light lighted lit flame table altar ofrenda today still here place
   placed offering offerings dear warm warmth heart life lived voice hands family home
   kept keep keeps name story stories year years day days night morning`.split(/\s+/),
)

const META =
  /^(here(?:'s| is)|sure[,.]?|certainly|of course|i cannot|i can't|as an ai|remembrance:|inscription:|okay[,.]?|ok[,.]?)/i

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stem(token: string): string {
  return token.replace(/(ingly|ing|ed|es|s)$/u, '')
}

function tokens(value: string): string[] {
  return fold(value)
    .split(' ')
    .filter((token) => token.length >= 4)
}

export function sourceBlob(offering: Offering): string {
  return [offering.name, offering.years, offering.relation, offering.food, offering.song, offering.memory]
    .join(' ')
}

function splitSentences(inscription: string): string[] {
  return inscription
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !META.test(sentence))
}

export function groundInscription(inscription: string, offering: Offering): Sentence[] {
  const source = new Set(tokens(sourceBlob(offering)).map(stem))
  const sourceText = fold(sourceBlob(offering))

  return splitSentences(inscription).map((text) => {
    const claims = tokens(text)
      .map(stem)
      .filter((token) => token.length >= 4 && !STOP.has(token) && !CEREMONIAL.has(token))

    const unsupported = claims.filter((token) => !source.has(token))
    const numbers = text.match(/\d+/g) ?? []
    const inventedNumber = numbers.some((number) => !sourceText.includes(number))
    const ratio = claims.length === 0 ? 0 : unsupported.length / claims.length
    const grounded = !inventedNumber && unsupported.length < 2 && ratio <= 0.34

    return { text, grounded }
  })
}
