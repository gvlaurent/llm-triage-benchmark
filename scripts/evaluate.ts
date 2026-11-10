// Measures AI proposals on the 200-ticket fixture.
//   npm run evaluate -- --baseline
//   npm run evaluate -- proposals.json [--threshold 0.9] [--json]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { baselineProposals, evaluate, formatReport, loadFixture, parseProposals } from '../src/index.js';

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args.splice(i, 1).length > 0;
};

const threshold = Number(option('--threshold') ?? 0.9);
const asJson = flag('--json');
const baseline = flag('--baseline');
const file = args[0];
if (!(threshold >= 0 && threshold <= 1) || (!baseline && !file)) {
  console.error('Usage: evaluate (--baseline | <proposals.json>) [--threshold 0.9] [--json]');
  process.exit(2);
}

const fixture = loadFixture(JSON.parse(readFileSync(new URL('../fixtures/tickets.json', import.meta.url), 'utf8')));
// npm runs the script from the package folder: resolve the file from where the command was typed.
const where = process.env.INIT_CWD ?? process.cwd();
const proposals = baseline
  ? baselineProposals(fixture.tickets)
  : parseProposals(JSON.parse(readFileSync(resolve(where, file!), 'utf8')), fixture);

const report = evaluate(fixture, proposals, { threshold });
console.log(asJson ? JSON.stringify(report, null, 2) : formatReport(report, baseline ? 'Baseline: tool type only, no AI' : `Proposals: ${file}`));
