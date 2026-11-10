// Plain-text report, read in a terminal or pasted in a pull request.
import { SILENT_ERRORS, type Report } from './evaluate.js';
import { NATURES } from './types.js';

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');
const list = (keys: string[], max = 8) => (keys.length > max ? `${keys.slice(0, max).join(', ')}, …` : keys.join(', '));

export function formatReport(r: Report, title: string): string {
  const out: string[] = [`# ${title}`, ''];
  out.push(`Tickets: ${r.tickets}, without proposal: ${r.missing.length}${r.missing.length ? ` (${list(r.missing)})` : ''}`, '');

  out.push('## Automatic attachment by threshold',
    'Silent error: attached without review where a PM would not have. Coverage: share of attachable requests attached right.', '',
    '| Threshold | Attached | Right | Coverage | Precision | Silent errors |',
    '| --- | --- | --- | --- | --- | --- |');
  for (const a of r.attachment) {
    const errors = SILENT_ERRORS.map((s) => a.silentErrors[s].length ? `${s} ${a.silentErrors[s].length}` : null).filter(Boolean);
    out.push(`| ${a.threshold} | ${a.auto} | ${a.right} / ${a.attachable} | ${pct(a.right, a.attachable)} | ${pct(a.right, a.auto)} | ${errors.join(', ') || '0'} |`);
  }
  for (const a of r.attachment) {
    for (const s of SILENT_ERRORS) {
      if (a.silentErrors[s].length) out.push(`- at ${a.threshold}, ${s}: ${list(a.silentErrors[s])}`);
    }
  }
  out.push('');

  out.push(`## Nature: ${r.nature.right} / ${r.tickets} right (${pct(r.nature.right, r.tickets)})`, '',
    '| Expected \\ proposed | need | bug | debt | missing |', '| --- | --- | --- | --- | --- |');
  for (const n of NATURES) {
    const row = r.nature.confusion[n];
    out.push(`| ${n} | ${row.need} | ${row.bug} | ${row.debt} | ${row.missing} |`);
  }
  out.push('');

  out.push(`## Theme, whatever the confidence: ${r.theme.right} / ${r.theme.attachable} attachable requests right (${pct(r.theme.right, r.theme.attachable)})`);
  if (r.theme.wrong.length) out.push(`Wrong or missing: ${list(r.theme.wrong, 12)}`);
  out.push('');

  const proposed = r.tickets - r.missing.length;
  out.push(`## Evidence: ${r.evidence.right} / ${proposed} right (${pct(r.evidence.right, proposed)})`,
    `- overstated (inflates a theme): ${r.evidence.overstated.length}${r.evidence.overstated.length ? ` (${list(r.evidence.overstated)})` : ''}`,
    `- understated: ${r.evidence.understated.length}`, '');

  out.push('## Emerging groups', '', '| Group | Requests | Absorbed by an existing theme | Main new theme |', '| --- | --- | --- | --- |');
  for (const [code, g] of Object.entries(r.emerging)) {
    out.push(`| ${code} | ${g.tickets} | ${g.absorbed} | ${g.mainStatement ? `${g.mainCount} × « ${g.mainStatement} »` : '-'} |`);
  }
  out.push('');

  out.push('## Cases', '', '| Case | Passed | Failed |', '| --- | --- | --- |');
  for (const [c, v] of Object.entries(r.cases).sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`| ${c} | ${v.ok} / ${v.tickets} | ${list(v.failures, 5)} |`);
  }
  return out.join('\n') + '\n';
}
