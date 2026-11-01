import type { Offering } from './types'

export function buildPrompt(offering: Offering): string {
  return [
    'Write a remembrance of 60 to 90 words for a Día de los Muertos ofrenda.',
    'Use only the details below. Do not add relatives, places, foods, songs, years, or events.',
    'Write plain prose addressed to them. No title. No list. No preamble.',
    '',
    `Name: ${offering.name}`,
    `Years: ${offering.years || 'unknown'}`,
    `Relationship: ${offering.relation || 'unknown'}`,
    `Food they loved: ${offering.food || 'unknown'}`,
    `Song: ${offering.song || 'unknown'}`,
    `Memory, in the words of the person lighting the candle: ${offering.memory}`,
  ].join('\n')
}
