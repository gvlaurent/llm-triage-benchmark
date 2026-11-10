// Reading the fixture and a proposals file. Every bad entry is reported, none is dropped silently.
import { EVIDENCE_TYPES, NATURES, type Fixture, type Proposal } from './types.js';

interface FixtureJson {
  themes: Record<string, { status?: string; emerging?: string }>;
  tickets: Fixture['tickets'];
}

export function loadFixture(json: unknown): Fixture {
  const { themes, tickets } = json as FixtureJson;
  const codes = Object.entries(themes);
  return {
    knownThemes: new Set(codes.filter(([, t]) => t.status).map(([code]) => code)),
    emergingGroups: codes.filter(([, t]) => t.emerging).map(([code]) => code),
    tickets,
  };
}

/** Checks a list of proposals against the fixture; throws with every problem found. */
export function parseProposals(input: unknown, fixture: Fixture): Proposal[] {
  // A run file of the classifier carries its proposals next to its usage and logs.
  const json = Array.isArray(input) ? input : (input as { proposals?: unknown } | null)?.proposals;
  if (!Array.isArray(json)) throw new Error('Proposals must be a JSON array, or a run file with a proposals array');
  const keys = new Set(fixture.tickets.map((t) => t.key));
  const seen = new Set<string>();
  const errors: string[] = [];
  json.forEach((p: Partial<Proposal>, i) => {
    const at = `proposal ${i}${typeof p?.key === 'string' ? ` (${p.key})` : ''}`;
    if (typeof p?.key !== 'string' || !keys.has(p.key)) errors.push(`${at}: unknown ticket key`);
    else if (seen.has(p.key)) errors.push(`${at}: ticket proposed twice`);
    else seen.add(p.key);
    if (!NATURES.includes(p?.nature as never)) errors.push(`${at}: nature must be one of ${NATURES.join(', ')}`);
    if (!EVIDENCE_TYPES.includes(p?.evidence as never)) errors.push(`${at}: evidence must be one of ${EVIDENCE_TYPES.join(', ')}`);
    if (typeof p?.confidence !== 'number' || !(p.confidence >= 0 && p.confidence <= 1)) errors.push(`${at}: confidence must be between 0 and 1`);
    if (p?.theme !== null && !fixture.knownThemes.has(p?.theme as string)) errors.push(`${at}: theme must be an existing theme or null`);
    if (p?.newTheme !== null && (typeof p?.newTheme !== 'string' || !p.newTheme.trim())) errors.push(`${at}: newTheme must be a statement or null`);
  });
  if (errors.length) throw new Error(`Invalid proposals:\n- ${errors.join('\n- ')}`);
  return json as Proposal[];
}
