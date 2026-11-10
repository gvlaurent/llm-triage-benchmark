export type Nature = 'need' | 'bug' | 'debt';
export type EvidenceType = 'written_verbatim' | 'lost_deal' | 'field_observation' | 'gut_feeling';

export const NATURES: readonly Nature[] = ['need', 'bug', 'debt'];
export const EVIDENCE_TYPES: readonly EvidenceType[] = ['written_verbatim', 'lost_deal', 'field_observation', 'gut_feeling'];

/**
 * What the AI proposes for one request, with the
 * theme code (`T1`) in place of the theme id.
 */
export interface Proposal {
  /** Ticket key in the delivery tool, e.g. `RDV-101`. */
  key: string;
  nature: Nature;
  /** Existing theme the request belongs to, or null. */
  theme: string | null;
  /** Statement of a theme to create, when no existing theme fits. */
  newTheme: string | null;
  /** Between 0 and 1. Compared with the auto-attach threshold set by the PM. */
  confidence: number;
  evidence: EvidenceType;
}

/** A ticket of the fixture with what a careful PM would decide. */
export interface ExpectedTicket {
  key: string;
  /** Type chosen in the tool (`story`, `bug`, `task`): a hint, often wrong. */
  type: string;
  expected: {
    nature: Nature;
    /** Known theme (`T1`), group that should emerge or not (`E1`, `N1`), or null. */
    theme: string | null;
    alsoTheme: string | null;
    evidence: EvidenceType;
    duplicateOf: string | null;
    /** The request must go to human review rather than be attached automatically. */
    review: boolean;
    obsolete: boolean;
    cases: string[];
  };
}

export interface Fixture {
  /** Themes that exist in the workspace: the only ones a proposal may target. */
  knownThemes: Set<string>;
  /** Groups of requests that should form a new theme (`E1`) or not (`N1`). */
  emergingGroups: string[];
  tickets: ExpectedTicket[];
}
