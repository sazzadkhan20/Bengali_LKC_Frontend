import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { allEntries, lexiconMeta, synsetById } from "@/lib/lexicon";
import { recordAudit, store } from "@/lib/store";
import type { POS, Submission } from "@/lib/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * UKC LMF XML export (SRS §10). Generates a well-formed file in the
 * exact format of Bangla_Mono_Lingual_Lexicons.xml, containing the
 * canonical VALIDATED lexicon plus crowdsourced entries that reached
 * VALIDATED state.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, "xml_export")) {
    return NextResponse.json(
      { error: "XML export is restricted to the Platform Architect and System Moderator (SRS §10.1)." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const version = searchParams.get("version") || "1.1";
  const posFilter = (searchParams.get("pos")?.split(",") ?? []).filter((p) =>
    ["n", "v", "a", "r"].includes(p)
  ) as POS[];
  const includeCanonical = searchParams.get("canonical") !== "0";
  const includeLkcSource = searchParams.get("lkcSource") === "1";

  const posOk = (p: POS) => posFilter.length === 0 || posFilter.includes(p);

  /* ---- collect crowdsourced VALIDATED entries ---------------------- */
  const validatedSubs = store.submissions.filter(
    (s) => s.state === "VALIDATED" && posOk(s.pos)
  );
  const canonicalEntries = includeCanonical
    ? allEntries.filter((e) => posOk(e.pos))
    : [];

  // New synsets implied by "create" submissions
  let nextSynNum = 2100000;
  let nextSenNum = 3300000;
  let nextWordNum = 2300000;
  const newSynsetBySub = new Map<string, string>();
  for (const s of validatedSubs) {
    if (s.synsetAction === "create" && s.iliCode) {
      newSynsetBySub.set(s.id, `ben-syn${nextSynNum++}`);
    }
  }

  const synsetIdFor = (s: Submission) =>
    s.synsetAction === "link" ? s.synsetId! : newSynsetBySub.get(s.id)!;

  // Synsets referenced by the export set
  const usedSynsetIds = new Set<string>();
  for (const e of canonicalEntries)
    for (const sn of e.senses) usedSynsetIds.add(sn.synset);
  for (const s of validatedSubs) usedSynsetIds.add(synsetIdFor(s));

  const stats = {
    entries: canonicalEntries.length + validatedSubs.length,
    crowdsourced: validatedSubs.length,
    synsets:
      [...usedSynsetIds].filter((id) => synsetById.has(id)).length +
      newSynsetBySub.size,
  };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      projected: stats,
      config: { version, posFilter, includeCanonical, includeLkcSource },
    });
  }

  /* ---- build XML --------------------------------------------------- */
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<LexicalResource xmlns:dc="http://purl.org/dc/elements/1.1/">`);
  const source =
    esc(lexiconMeta.source) +
    (includeLkcSource
      ? "; Bengali LKC Framework crowdsourcing platform (Ben-LKC)"
      : "");
  lines.push(
    `  <Lexicon id="${esc(lexiconMeta.id)}" label="${esc(lexiconMeta.label)}" language="${esc(lexiconMeta.language)}" email="${esc(lexiconMeta.email)}" license="${esc(lexiconMeta.license)}" version="${esc(version)}" dc:source="${source}" dc:description="${esc(lexiconMeta.description)}" dc:publisher="${esc(lexiconMeta.publisher)}">`
  );

  for (const e of canonicalEntries) {
    lines.push(`    <LexicalEntry id="${e.id}">`);
    lines.push(
      `      <Lemma writtenForm="${esc(e.lemma)}" partOfSpeech="${e.pos}"></Lemma>`
    );
    for (const sn of e.senses) {
      if (sn.relations && sn.relations.length > 0) {
        lines.push(`      <Sense id="${sn.id}" synset="${sn.synset}">`);
        for (const r of sn.relations) {
          lines.push(
            `        <SenseRelation relType="${r.relType}" target="${r.target}"></SenseRelation>`
          );
        }
        lines.push(`      </Sense>`);
      } else {
        lines.push(`      <Sense id="${sn.id}" synset="${sn.synset}"></Sense>`);
      }
    }
    lines.push(`    </LexicalEntry>`);
  }

  for (const s of validatedSubs) {
    const wordId = `ben-word-${s.pos}${nextWordNum++}`;
    const senseId = `ben-sen${nextSenNum++}`;
    lines.push(`    <LexicalEntry id="${wordId}">`);
    lines.push(
      `      <Lemma writtenForm="${esc(s.writtenForm)}" partOfSpeech="${s.pos}"></Lemma>`
    );
    if (s.senseRelations.length > 0) {
      lines.push(`      <Sense id="${senseId}" synset="${synsetIdFor(s)}">`);
      for (const r of s.senseRelations) {
        lines.push(
          `        <SenseRelation relType="${r.relType}" target="${r.target}"></SenseRelation>`
        );
      }
      lines.push(`      </Sense>`);
    } else {
      lines.push(
        `      <Sense id="${senseId}" synset="${synsetIdFor(s)}"></Sense>`
      );
    }
    lines.push(`    </LexicalEntry>`);
  }

  for (const id of usedSynsetIds) {
    const syn = synsetById.get(id);
    if (!syn) continue;
    lines.push(
      `    <Synset id="${syn.id}" ili="${syn.ili}" partOfSpeech="${syn.pos}" lexicalized="${syn.lexicalized}">`
    );
    if (syn.definition) {
      lines.push(
        `      <Definition language="${syn.definition.language}">${esc(syn.definition.text)}</Definition>`
      );
    }
    for (const r of syn.relations ?? []) {
      // Only relations whose target is also in the export set (SRS §10.2)
      if (!usedSynsetIds.has(r.target)) continue;
      lines.push(
        `      <SynsetRelation relType="${r.relType}" target="${r.target}"></SynsetRelation>`
      );
    }
    lines.push(`    </Synset>`);
  }

  // New synsets created by validated crowdsourced submissions
  for (const s of validatedSubs) {
    const newId = newSynsetBySub.get(s.id);
    if (!newId) continue;
    lines.push(
      `    <Synset id="${newId}" ili="${s.iliCode}" partOfSpeech="${s.pos}" lexicalized="true">`
    );
    if (s.definitionText) {
      lines.push(
        `      <Definition language="${s.definitionLanguage ?? "ben"}">${esc(s.definitionText)}</Definition>`
      );
    }
    for (const r of s.synsetRelations) {
      if (!usedSynsetIds.has(r.target)) continue;
      lines.push(
        `      <SynsetRelation relType="${r.relType}" target="${r.target}"></SynsetRelation>`
      );
    }
    lines.push(`    </Synset>`);
  }

  lines.push(`  </Lexicon>`);
  lines.push(`</LexicalResource>`);
  const xml = lines.join("\n");

  /* ---- export audit (SRS §10.4) ------------------------------------ */
  const sha256 = createHash("sha256").update(xml, "utf8").digest("hex");
  const record = {
    id: `exp-${store.exports.length + 1}`,
    timestamp: new Date().toISOString(),
    actorId: session.userId,
    entryCount: stats.entries,
    synsetCount: stats.synsets,
    sha256,
    config: `version=${version}; pos=${posFilter.join("/") || "all"}; canonical=${includeCanonical}`,
  };
  store.exports.push(record);
  recordAudit({
    actorId: session.userId,
    actorRole: session.role,
    action: "EXPORT_GENERATED",
    targetType: "EXPORT",
    targetId: record.id,
    detail: `${stats.entries} entries, ${stats.synsets} synsets, SHA-256 ${sha256.slice(0, 12)}…`,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="Bangla_Mono_Lingual_Lexicons_v${version}.xml"`,
      "X-Export-SHA256": sha256,
    },
  });
}
