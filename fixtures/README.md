# 200 fictional tickets

A fictional backlog for a medical appointment booking SaaS, written by hand the way customers, support, customer success and sales actually write tickets: mostly in French, sometimes vague, sometimes wrong about their own type. Names, phone numbers, social security numbers and e-mail addresses are invented (`.invalid` domains).

Every ticket carries its **expected outcome**, so a classifier can be measured, not just run.

## Files

| File | Content | Give it to the model? |
| --- | --- | --- |
| `jira.csv` | 120 tickets (`RDV-101` to `RDV-220`), Jira Cloud export style | Yes |
| `linear.csv` | 80 tickets (`PRD-1` to `PRD-80`), Linear export style | Yes |
| `tickets.json` | All 200 tickets, the themes, and `expected` for each ticket | **No**: it holds the answers |

## Themes

| Code | Status | Problem |
| --- | --- | --- |
| T1 to T7 | ranked | Known themes, already prioritized |
| T8 | in progress | Known theme, being built |
| T9 | delivered | A new request on it is still a signal |
| T10 | discarded | Same |
| E1, E2 | — | Not given to the model: requests that **should** gather into a new theme |
| N1, N2 | — | Not given to the model: requests that look like a group but stay **below** the evidence bar |

## Expected outcome (`expected` in `tickets.json`)

| Field | Meaning |
| --- | --- |
| `nature` | `need`, `bug` or `debt`, whatever type the reporter chose in the tool |
| `theme` | `T1` to `T10`, `E1`, `E2`, `N1`, `N2`, or `null` |
| `alsoTheme` | Second plausible theme of a multi-theme request |
| `evidence` | Evidence type a careful PM would set |
| `duplicateOf` | Key of the original ticket |
| `review` | `true` when the request must go to a human rather than be attached automatically |
| `obsolete` | Ticket to close during a backlog cleanup |
| `cases` | What the ticket tests |

## What the tickets test

| Area | Tickets |
| --- | --- |
| Needs on the 10 known themes | 125, of which 112 should be attached automatically |
| Phrased as a solution ("add a button…") rather than a problem | 29 |
| New request on a delivered or discarded theme | 4 and 4 |
| Should emerge as a new theme (E1, E2) | 13 |
| Look like a new theme but should not (N1, N2) | 6 |
| Bugs and debt | 30 and 15, including bugs written as wishes, a need typed as a bug, debt typed as stories |
| Duplicates | 12: exact, paraphrased, and across Jira and Linear |
| Vague, multi-theme, out of scope | Expected to go to human review |
| Obsolete | 6 (Internet Explorer, fax, Flash…) |
| Import traps | quotes, commas and line breaks in CSV, emoji, HTML, a 2,000-character text, an empty description, English text, a leap day |
| Personal data | 3 tickets with fictional patient data |
| Prompt injection | 2 tickets trying to force the AI's answer |

## Known limits

- `review` is a judgement on what a careful PM would do; another PM could draw the line elsewhere.
- The CSV columns follow the Jira Cloud and Linear export formats as far as known, without a real export to compare with.
- One product, one language mix, one domain. A model that does well here may do worse on your backlog: build your own fixture the same way.
