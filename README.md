# LLM triage benchmark

A rerunnable protocol to choose the LLM you hand a product decision to, by measuring it instead of trusting a demo.

The task: read incoming product requests (from customers, support, customer success, sales), decide whether each one is a need, a bug or technical debt, attach the needs to the right theme, say how strong the evidence is, and give a confidence score. Above a threshold set by the product manager, the request is attached automatically. Below it, a human reviews it.

The risk that matters is not the visible error. It is the **silent error**: a request attached to the wrong place, with high confidence, that nobody will ever look at again.

## What's in this repository

| Path | Content |
| --- | --- |
| [`fixtures/`](fixtures/) | 200 fictional tickets (Jira and Linear exports) and the expected outcome of each one |
| [`src/evaluate.ts`](src/evaluate.ts) | The scoring: silent errors and coverage per threshold, nature, theme, evidence, emerging themes, per-case results |
| [`scripts/evaluate.ts`](scripts/evaluate.ts) | Command line: scores a proposals file against the fixture |
| [`PROMPT.md`](PROMPT.md) | A starter prompt and the answer schema |
| [`test/`](test/) | Tests of the scoring rules |

It does not call any model. You run your classifier with the provider and the prompt of your choice, save its answers, and score them here.

## The protocol

1. **Write the expected answer of every ticket before the first run.** Here, 200 fictional tickets, each with its nature, theme, evidence and whether a careful PM would send it to review.
2. **Freeze the prompt** before the first run, and give it a version name. Never adjust it while looking at one provider's results.
3. **Same answer format for every model**, constrained by a JSON schema, and **the same scoring script** for all of them.
4. **Several runs per model** (3 to 6): an LLM does not answer the same way twice. Report ranges, not a single number, and measure stability across runs.
5. **Exact model ids**, never a `latest` alias, and no silent fallback to another model.
6. **Measure the real cost** of every run from the token usage.
7. **Declare the eliminatory rule before running.** Here: zero silent errors at the 0.9 threshold.
8. **When almost every model fails on the same ticket, read the ticket before blaming the models.** If the expected answer was ambiguous, change it through a written decision, then rescore every run. Never quietly after seeing the results.

## Run it

Requires Node.js 20 or later.

```bash
npm install
npm run evaluate -- --baseline                        # floor: the ticket type from the tool, no AI
npm run evaluate -- proposals.json                    # your classifier's answers
npm run evaluate -- proposals.json --threshold 0.8    # another auto-attach threshold
npm run evaluate -- proposals.json --json             # machine-readable report
npm test                                              # tests of the scoring rules
```

`proposals.json` is an array with one entry per ticket. A missing ticket counts as sent to review; every invalid entry is reported at once.

```json
[{ "key": "RDV-101", "nature": "need", "theme": "T1", "newTheme": null, "confidence": 0.94, "evidence": "written_verbatim" }]
```

## What is measured

| Measure | Rule |
| --- | --- |
| Automatic attachment | Attached when the proposal targets an existing theme, the nature is `need` and the confidence reaches the threshold. Otherwise sent to review. |
| **Silent errors** | Attached without review where a PM would not have: wrong theme, a bug or debt counted as a need, a vague or multi-theme request that needed a human, an emerging or out-of-scope request swallowed by an existing theme. **The number to keep at zero.** |
| Coverage | Requests attached to the right theme, out of the 112 a PM would attach. The triage work saved. |
| Nature | Confusion matrix need / bug / debt. |
| Theme | Right theme among the 112 attachable requests, whatever the confidence. |
| Evidence | Right type; an **overstated** evidence (stronger than a PM would set) is reported apart, because it inflates a theme. |
| Emerging themes | Whether the requests of E1 and E2 gather under one new statement, and whether N1 and N2 are wrongly promoted. |
| Cases | Per kind of ticket: solution-phrased, vague, multi-theme, duplicate, prompt injection, and so on. |

## Results (October 2026)

Nine models from three providers, 3 to 6 full runs each, about $11 in total. Measured with a more detailed prompt than the starter one in [`PROMPT.md`](PROMPT.md), so your numbers will differ.

| Model | Runs | Silent errors at 0.9 | Coverage | Nature /200 | Theme /112 | Stability | Cost per run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claude-sonnet-5-5 | 6 | 0 | 49–54% | 191–197 | 102–109 | 84% | $0.28 |
| claude-opus-5-5 | 6 | 0 | 21–28% | 196 | 104–107 | 87% | $0.83 |
| claude-haiku-5-5 | 6 | 0 | 17–24% | 171–175 | 78–82 | 75% | $0.03 |
| gpt-6.1-sol | 3 | 1 | 51–58% | 179–183 | 89–95 | 82% | $0.25 |
| gpt-6-luna | 3 | 1 | 45–46% | 181–183 | 80–83 | 72% | $0.02 |
| gpt-5.6-sol | 3 | 2 | 63–68% | 179–185 | 88–89 | 76% | $0.70 |
| mistral-large-2512 | 6 | 3–5 | 67–74% | 180–184 | 93–97 | 83% | $0.04 |
| mistral-medium-3-5 | 6 | 3–6 | 69–74% | 178–182 | 87–93 | 85% | $0.16 |
| mistral-small-2603 | 6 | 5–11 | 55–67% | 168–174 | 77–89 | 63% | $0.02 |

Stability is the share of tickets that get the same nature and theme in every run of a model.

What I took from it:

- **Coverage alone is misleading.** The models that attach the most are also the ones that make the most silent errors.
- **Confidence is not calibrated the same way everywhere.** For some models, raising the threshold barely reduces silent errors: they are wrong with high confidence.
- **Price was never the deciding factor.** The model I chose costs $0.28 for 200 tickets.
- **The benchmark tested me too.** In the first scoring, eight models out of nine made the same "error" on one ticket. Reading it again, the ticket was ambiguous and my expected answer was not the only defensible one. I changed it through a written decision and rescored every run; the ranking did not move.

These results hold for this task, this prompt and these tickets. They are not a general ranking of models. The method is the part meant to travel: build your own fixture, freeze your prompt, declare your eliminatory rule, and measure.

## Author

Gabriel Laurent, ex-CPO turned product builder. This comes from Faisceau, a product decision tool I'm building. [LinkedIn](https://www.linkedin.com/in/gabriel-laurent/)

MIT License.
