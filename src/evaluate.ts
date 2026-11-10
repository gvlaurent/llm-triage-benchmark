// Measures AI proposals against the expected outcome of the fixture.
// Pure: same fixture and proposals, same report.
// Weight of each evidence type, used to tell an overstated evidence from an understated one.
export const EVIDENCE_WEIGHTS = { written_verbatim: 1, lost_deal: 1, field_observation: 0.6, gut_feeling: 0.3 } as const;
import { NATURES, type EvidenceType, type ExpectedTicket, type Fixture, type Nature, type Proposal } from './types.js';

/**
 * What happens to one request at a given threshold
 * (the product's rule): attached automatically when the proposal targets an
 * existing theme, the request is a need and the confidence reaches the threshold.
 * Otherwise `review`: the PM decides, nothing counts until then.
 * Every automatic outcome other than `right` is a silent error: it changes a theme's
 * score without anyone looking.
 */
export type Outcome =
  | 'right'
  | 'review'
  | 'wrong_theme'      // attached to the wrong existing theme
  | 'not_a_need'       // a bug or debt counted as a need: only needs may feed a theme
  | 'should_review'    // ambiguous, vague or multi-theme: a human had to look
  | 'no_known_theme';  // emerging or out of scope, swallowed by an existing theme

export const SILENT_ERRORS = ['wrong_theme', 'not_a_need', 'should_review', 'no_known_theme'] as const;
export type SilentError = (typeof SILENT_ERRORS)[number];

export const DEFAULT_THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95];

export interface AttachmentAt {
  threshold: number;
  /** Requests expected to be attached automatically: needs with an existing theme, no review. */
  attachable: number;
  auto: number;
  right: number;
  /** right / attachable: share of the PM's triage work saved. */
  coverage: number;
  /** right / auto; 1 when nothing is attached. */
  precision: number;
  silentErrors: Record<SilentError, string[]>;
}

export interface CaseResult {
  tickets: number;
  ok: number;
  failures: string[];
}

export interface EmergingGroup {
  tickets: number;
  /** Proposed an existing theme instead of a new one. */
  absorbed: number;
  /** Most frequent new-theme statement in the group, and how many requests carry it. */
  mainStatement: string | null;
  mainCount: number;
}

export interface Report {
  tickets: number;
  missing: string[];
  nature: { right: number; confusion: Record<Nature, Record<Nature | 'missing', number>> };
  /** Among attachable requests, whatever the confidence. */
  theme: { attachable: number; right: number; wrong: string[] };
  evidence: { right: number; overstated: string[]; understated: string[] };
  attachment: AttachmentAt[];
  emerging: Record<string, EmergingGroup>;
  cases: Record<string, CaseResult>;
}

const weight = (e: EvidenceType) => EVIDENCE_WEIGHTS[e];

export function isAttachable(t: ExpectedTicket, known: Set<string>): boolean {
  const e = t.expected;
  return e.nature === 'need' && !e.review && e.theme !== null && known.has(e.theme);
}

const themeMatches = (t: ExpectedTicket, p: Proposal) =>
  p.theme !== null && (p.theme === t.expected.theme || p.theme === t.expected.alsoTheme);

export function isAuto(p: Proposal | undefined, threshold: number, known: Set<string>): boolean {
  return p !== undefined && p.nature === 'need' && p.theme !== null && known.has(p.theme) && p.confidence >= threshold;
}

export function outcome(t: ExpectedTicket, p: Proposal | undefined, threshold: number, known: Set<string>): Outcome {
  if (!isAuto(p, threshold, known)) return 'review';
  const e = t.expected;
  if (e.nature !== 'need') return 'not_a_need';
  if (e.review) return 'should_review';
  if (e.theme === null || !known.has(e.theme)) return 'no_known_theme';
  return themeMatches(t, p!) ? 'right' : 'wrong_theme';
}

export function evaluate(
  fixture: Fixture,
  proposals: Proposal[],
  { threshold = 0.9, thresholds = DEFAULT_THRESHOLDS }: { threshold?: number; thresholds?: number[] } = {},
): Report {
  const { knownThemes: known, tickets } = fixture;
  const byKey = new Map(proposals.map((p) => [p.key, p]));
  const attachable = tickets.filter((t) => isAttachable(t, known));

  const confusion = Object.fromEntries(NATURES.map((n) =>
    [n, { need: 0, bug: 0, debt: 0, missing: 0 }])) as Report['nature']['confusion'];
  for (const t of tickets) confusion[t.expected.nature][byKey.get(t.key)?.nature ?? 'missing'] += 1;

  const evidence: Report['evidence'] = { right: 0, overstated: [], understated: [] };
  for (const t of tickets) {
    const p = byKey.get(t.key);
    if (!p) continue;
    if (p.evidence === t.expected.evidence) evidence.right += 1;
    else if (weight(p.evidence) > weight(t.expected.evidence)) evidence.overstated.push(t.key);
    else if (weight(p.evidence) < weight(t.expected.evidence)) evidence.understated.push(t.key);
  }

  const attachment = thresholds.map((th): AttachmentAt => {
    const silentErrors = Object.fromEntries(SILENT_ERRORS.map((s) => [s, [] as string[]])) as AttachmentAt['silentErrors'];
    let right = 0;
    let auto = 0;
    for (const t of tickets) {
      const o = outcome(t, byKey.get(t.key), th, known);
      if (o === 'review') continue;
      auto += 1;
      if (o === 'right') right += 1;
      else silentErrors[o].push(t.key);
    }
    return {
      threshold: th, attachable: attachable.length, auto, right,
      coverage: attachable.length ? right / attachable.length : 0,
      precision: auto ? right / auto : 1,
      silentErrors,
    };
  });

  const emerging: Report['emerging'] = {};
  for (const code of fixture.emergingGroups) {
    const group = tickets.filter((t) => t.expected.theme === code);
    const statements = new Map<string, number>();
    let absorbed = 0;
    for (const t of group) {
      const p = byKey.get(t.key);
      if (p?.theme) absorbed += 1;
      else if (p?.newTheme) statements.set(p.newTheme, (statements.get(p.newTheme) ?? 0) + 1);
    }
    const [mainStatement, mainCount] = [...statements].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    emerging[code] = { tickets: group.length, absorbed, mainStatement, mainCount };
  }

  // A ticket passes its case when its nature is right and its theme is handled as a PM would:
  // the right theme for an attachable request, otherwise no automatic attachment.
  const cases: Report['cases'] = {};
  for (const t of tickets) {
    const p = byKey.get(t.key);
    const ok = p !== undefined && p.nature === t.expected.nature
      && (isAttachable(t, known) ? themeMatches(t, p) : !isAuto(p, threshold, known));
    for (const c of t.expected.cases) {
      const r = (cases[c] ??= { tickets: 0, ok: 0, failures: [] });
      r.tickets += 1;
      if (ok) r.ok += 1;
      else r.failures.push(t.key);
    }
  }

  return {
    tickets: tickets.length,
    missing: tickets.filter((t) => !byKey.has(t.key)).map((t) => t.key),
    nature: { right: NATURES.reduce((n, k) => n + confusion[k][k], 0), confusion },
    theme: {
      attachable: attachable.length,
      right: attachable.filter((t) => byKey.has(t.key) && themeMatches(t, byKey.get(t.key)!)).length,
      wrong: attachable.filter((t) => !byKey.has(t.key) || !themeMatches(t, byKey.get(t.key)!)).map((t) => t.key),
    },
    evidence,
    attachment,
    emerging,
    cases,
  };
}
