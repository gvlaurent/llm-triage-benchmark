// The floor any AI must beat: what the import knows without reading the text.
import type { ExpectedTicket, Nature, Proposal } from './types.js';

/** Nature from the type chosen in the tool; no theme, so every request goes to review. */
export function natureFromToolType(type: string): Nature {
  if (/bug/i.test(type)) return 'bug';
  if (/task|improvement|debt/i.test(type)) return 'debt';
  return 'need';
}

export function baselineProposals(tickets: Pick<ExpectedTicket, 'key' | 'type'>[]): Proposal[] {
  return tickets.map((t) => ({
    key: t.key,
    nature: natureFromToolType(t.type),
    theme: null,
    newTheme: null,
    confidence: 0,
    // An imported request starts as gut feeling until someone says otherwise.
    evidence: 'gut_feeling',
  }));
}
