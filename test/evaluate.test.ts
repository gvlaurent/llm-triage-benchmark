import { describe, expect, it } from 'vitest';
import { evaluate, outcome, type ExpectedTicket, type Fixture, type Proposal } from '../src/index.js';

const known = new Set(['T1', 'T2']);

function ticket(key: string, expected: Partial<ExpectedTicket['expected']> = {}): ExpectedTicket {
  return {
    key, type: 'story',
    expected: {
      nature: 'need', theme: 'T1', alsoTheme: null, evidence: 'written_verbatim',
      duplicateOf: null, review: false, obsolete: false, cases: [], ...expected,
    },
  };
}

function proposal(key: string, p: Partial<Proposal> = {}): Proposal {
  return { key, nature: 'need', theme: 'T1', newTheme: null, confidence: 0.95, evidence: 'written_verbatim', ...p };
}

describe('outcome of one proposal, as the database would decide it', () => {
  it('attaches a need to its existing theme from the threshold included', () => {
    expect(outcome(ticket('A'), proposal('A', { confidence: 0.9 }), 0.9, known)).toBe('right');
    expect(outcome(ticket('A'), proposal('A', { confidence: 0.89 }), 0.9, known)).toBe('review');
  });

  it('sends to review a bug, a new theme, or a missing proposal, whatever the confidence', () => {
    expect(outcome(ticket('A'), proposal('A', { nature: 'bug', confidence: 1 }), 0.9, known)).toBe('review');
    expect(outcome(ticket('A'), proposal('A', { theme: null, newTheme: 'X', confidence: 1 }), 0.9, known)).toBe('review');
    expect(outcome(ticket('A'), undefined, 0.9, known)).toBe('review');
  });

  it('names each silent error', () => {
    expect(outcome(ticket('A'), proposal('A', { theme: 'T2' }), 0.9, known)).toBe('wrong_theme');
    expect(outcome(ticket('A', { nature: 'bug', theme: null }), proposal('A'), 0.9, known)).toBe('not_a_need');
    expect(outcome(ticket('A', { review: true }), proposal('A'), 0.9, known)).toBe('should_review');
    expect(outcome(ticket('A', { theme: 'E1' }), proposal('A'), 0.9, known)).toBe('no_known_theme');
    expect(outcome(ticket('A', { theme: null }), proposal('A'), 0.9, known)).toBe('no_known_theme');
  });

  it('accepts the second theme of a multi-theme request', () => {
    expect(outcome(ticket('A', { theme: 'T1', alsoTheme: 'T2' }), proposal('A', { theme: 'T2' }), 0.9, known)).toBe('right');
  });
});

describe('report', () => {
  const fixture: Fixture = {
    knownThemes: known,
    emergingGroups: ['E1'],
    tickets: [
      ticket('A'),
      ticket('B', { theme: 'T2' }),
      ticket('C', { nature: 'bug', theme: null, cases: ['bug_typed_as_need'] }),
      ticket('D', { theme: 'E1', evidence: 'gut_feeling' }),
      ticket('E', { theme: 'E1' }),
      ticket('F', { theme: 'E1' }),
    ],
  };
  const report = evaluate(fixture, [
    proposal('A', { confidence: 0.95 }),
    proposal('B', { theme: 'T2', confidence: 0.75 }),
    proposal('C', { confidence: 0.92 }),
    proposal('D', { theme: null, newTheme: 'No-shows cost nothing', evidence: 'lost_deal' }),
    proposal('E', { theme: null, newTheme: 'No-shows cost nothing' }),
  ], { thresholds: [0.7, 0.9] });

  it('counts coverage and silent errors at each threshold', () => {
    expect(report.attachment.map((a) => [a.threshold, a.auto, a.right, a.coverage])).toEqual([[0.7, 3, 2, 1], [0.9, 2, 1, 0.5]]);
    expect(report.attachment[1]!.silentErrors.not_a_need).toEqual(['C']);
  });

  it('lists tickets without proposal, and counts them as neither right nor wrong nature', () => {
    expect(report.missing).toEqual(['F']);
    expect(report.nature.right).toBe(4);
    expect(report.nature.confusion.bug).toEqual({ need: 1, bug: 0, debt: 0, missing: 0 });
    expect(report.nature.confusion.need.missing).toBe(1);
  });

  it('flags evidence stronger than a PM would set: it inflates a theme', () => {
    expect(report.evidence.overstated).toEqual(['D']);
  });

  it('measures whether an emerging group gathers under one new theme', () => {
    expect(report.emerging.E1).toEqual({ tickets: 3, absorbed: 0, mainStatement: 'No-shows cost nothing', mainCount: 2 });
  });

  it('fails a case when the nature is wrong', () => {
    expect(report.cases.bug_typed_as_need).toEqual({ tickets: 1, ok: 0, failures: ['C'] });
  });
});
