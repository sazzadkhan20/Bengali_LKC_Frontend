/**
 * Converts the canonical "Bangla Mono Lingual Lexicons.xml" (UKC LMF format)
 * into JSON seed data consumed by the webapp's server-side data layer.
 *
 * Usage: node scripts/build-seed.mjs [path-to-xml]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC =
  process.argv[2] ??
  path.resolve(__dirname, "..", "..", "Bangla Mono Lingual Lexicons.xml");
const OUT_DIR = path.resolve(__dirname, "..", "src", "lib", "data");

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

console.log(`Reading ${SRC} ...`);
const xml = fs.readFileSync(SRC, "utf8");

// ---- Lexicon metadata -------------------------------------------------
const lexiconTag = xml.match(/<Lexicon ([^>]+)>/)?.[1] ?? "";
const attr = (name) =>
  unescapeXml(lexiconTag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "");
const lexicon = {
  id: attr("id"),
  label: attr("label"),
  language: attr("language"),
  email: attr("email"),
  license: attr("license"),
  version: attr("version"),
  source: attr("dc:source"),
  description: attr("dc:description"),
  publisher: attr("dc:publisher"),
};

// ---- LexicalEntries ----------------------------------------------------
const entries = [];
const entryRe = /<LexicalEntry id="([^"]+)">([\s\S]*?)<\/LexicalEntry>/g;
const senseRe = /<Sense id="([^"]+)" synset="([^"]+)">([\s\S]*?)<\/Sense>/g;
const senseRelRe =
  /<SenseRelation relType="([^"]+)" target="([^"]+)">/g;

let m;
while ((m = entryRe.exec(xml)) !== null) {
  const [, id, body] = m;
  const lemma = body.match(
    /<Lemma writtenForm="([^"]*)" partOfSpeech="([^"]*)"/
  );
  if (!lemma) continue;
  const senses = [];
  let sm;
  while ((sm = senseRe.exec(body)) !== null) {
    const [, sid, synset, sbody] = sm;
    const relations = [];
    let rm;
    while ((rm = senseRelRe.exec(sbody)) !== null) {
      relations.push({ relType: rm[1], target: rm[2] });
    }
    const sense = { id: sid, synset };
    if (relations.length) sense.relations = relations;
    senses.push(sense);
  }
  entries.push({
    id,
    lemma: unescapeXml(lemma[1]),
    pos: lemma[2],
    senses,
  });
}
console.log(`Parsed ${entries.length} lexical entries`);

// ---- Synsets -----------------------------------------------------------
const synsets = [];
const synsetRe = /<Synset id="([^"]+)" ili="([^"]*)" partOfSpeech="([^"]*)" lexicalized="([^"]*)">([\s\S]*?)<\/Synset>/g;
const defRe = /<Definition language="([^"]*)">([\s\S]*?)<\/Definition>/;
const synRelRe = /<SynsetRelation relType="([^"]+)" target="([^"]+)">/g;

while ((m = synsetRe.exec(xml)) !== null) {
  const [, id, ili, pos, lexicalized, body] = m;
  const synset = { id, ili, pos, lexicalized: lexicalized === "true" };
  const dm = body.match(defRe);
  if (dm) synset.definition = { language: dm[1], text: unescapeXml(dm[2]) };
  const relations = [];
  let rm;
  while ((rm = synRelRe.exec(body)) !== null) {
    relations.push({ relType: rm[1], target: rm[2] });
  }
  if (relations.length) synset.relations = relations;
  synsets.push(synset);
}
console.log(`Parsed ${synsets.length} synsets`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, "lexicon.json");
fs.writeFileSync(out, JSON.stringify({ lexicon, entries, synsets }));
const sizeMb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
console.log(`Wrote ${out} (${sizeMb} MB)`);
