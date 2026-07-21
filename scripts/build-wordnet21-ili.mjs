/**
 * Build a compact Princeton WordNet 2.1 ILI lookup index from the
 * official dict/data.* files.
 *
 * Usage:
 *   node scripts/build-wordnet21-ili.mjs
 *
 * Input:  data/wordnet21-src/WordNet-2.1/dict/data.{noun,verb,adj,adv}
 * Output: data/wordnet21-ili.json
 *
 * ILI format used by the Bengali LKC: {8-digit-zero-padded-offset}-{n|v|a|r}
 * Adjective satellites (ss_type "s") are mapped to the "a" POS suffix.
 */
import { createReadStream, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DICT = join(ROOT, "data", "wordnet21-src", "WordNet-2.1", "dict");
const OUT = join(ROOT, "data", "wordnet21-ili.json");

const FILES = [
  { name: "data.noun", pos: "n" },
  { name: "data.verb", pos: "v" },
  { name: "data.adj", pos: "a" },
  { name: "data.adv", pos: "r" },
];

/** Decode WordNet underscore lemmas and strip parenthetical markers. */
function cleanLemma(raw) {
  return raw.replace(/_/g, " ").replace(/\(.*\)$/, "").trim().toLowerCase();
}

async function parseDataFile(path, defaultPos) {
  const synsets = [];
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line || line.startsWith("  ") || !/^\d{8}/.test(line)) continue;
    const bar = line.indexOf("|");
    if (bar < 0) continue;
    const head = line.slice(0, bar).trim();
    const gloss = line
      .slice(bar + 1)
      .trim()
      .replace(/\s*;\s*".*$/, "") // drop example sentences after ;
      .replace(/\s+/g, " ")
      .trim();

    const parts = head.split(/\s+/);
    // offset lex_filenum ss_type w_cnt word lex_id ...
    const offset = parts[0];
    const ssType = parts[2]; // n | v | a | s | r
    const pos = ssType === "s" ? "a" : defaultPos;
    const wCnt = parseInt(parts[3], 16);
    if (!Number.isFinite(wCnt) || wCnt < 1) continue;

    const words = [];
    for (let i = 0; i < wCnt; i++) {
      const lemma = cleanLemma(parts[4 + i * 2] ?? "");
      if (lemma) words.push(lemma);
    }
    if (words.length === 0) continue;

    const ili = `${offset}-${pos}`;
    synsets.push({ ili, pos, words, gloss });
  }
  return synsets;
}

async function main() {
  for (const f of FILES) {
    const p = join(DICT, f.name);
    if (!existsSync(p)) {
      console.error(`Missing ${p}`);
      console.error("Extract WordNet-2.1.tar.gz into data/wordnet21-src/ first.");
      process.exit(1);
    }
  }

  const synsets = {};
  const lemmas = {};

  for (const f of FILES) {
    const path = join(DICT, f.name);
    process.stdout.write(`Parsing ${f.name}… `);
    const rows = await parseDataFile(path, f.pos);
    for (const row of rows) {
      synsets[row.ili] = { w: row.words, g: row.gloss };
      for (const lemma of row.words) {
        if (!lemmas[lemma]) lemmas[lemma] = {};
        if (!lemmas[lemma][row.pos]) lemmas[lemma][row.pos] = [];
        if (!lemmas[lemma][row.pos].includes(row.ili)) {
          lemmas[lemma][row.pos].push(row.ili);
        }
      }
    }
    console.log(`${rows.length} synsets`);
  }

  const payload = {
    version: "2.1",
    source: "Princeton WordNet 2.1 (https://wordnetcode.princeton.edu/2.1/)",
    generatedAt: new Date().toISOString(),
    synsetCount: Object.keys(synsets).length,
    lemmaCount: Object.keys(lemmas).length,
    synsets,
    lemmas,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload));
  const mb = (Buffer.byteLength(JSON.stringify(payload)) / (1024 * 1024)).toFixed(1);
  console.log(
    `\nWrote ${OUT}\n  ${payload.synsetCount} synsets, ${payload.lemmaCount} lemmas (~${mb} MB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
