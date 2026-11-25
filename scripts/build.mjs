#!/usr/bin/env node
// Builds every markdown list from data/apps.json and data/related-lists.json,
// once per language in scripts/i18n.mjs (Turkish at the repo root, English under en/).
// Usage: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALES, CATEGORY_SLUGS_EN } from "./i18n.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apps = JSON.parse(readFileSync(join(root, "data/apps.json"), "utf8"));
const related = JSON.parse(readFileSync(join(root, "data/related-lists.json"), "utf8"));

// Which OS buckets each raw platform value belongs to.
const PLATFORM_MAP = {
  "Linux": ["linux"], "Windows": ["windows"], "macOS": ["macos"],
  "Android": ["android"], "iOS": ["ios"],
  "Mobil": ["android", "ios"],
  "Masaüstü": ["linux", "windows", "macos"],
  "Tümü": ["linux", "windows", "macos", "android", "ios"],
  "Web": ["web"], "Sunucu": ["selfhosted"], "Sunucu + istemciler": ["selfhosted"],
  "Docker": ["selfhosted"], "Ubuntu/Debian": ["selfhosted"], "Bare metal": ["selfhosted"],
  "CLI": ["cli"],
  "VS Code": ["extensions"], "JetBrains": ["extensions"], "Tarayıcı eklentisi": ["extensions"],
  "Laravel paketi": ["extensions"], "Repo": ["extensions"],
  "MCP sunucusu": ["extensions"], "Obsidian eklentisi": ["extensions"],
  "Thunderbird eklentisi": ["extensions"], "Zotero eklentisi": ["extensions"],
};
const LICENSE_TYPES = ["osi", "open-core", "other", "restricted"];
const REQUIRED = ["category", "category_slug", "replaces", "name", "url", "license_type", "license", "platforms", "description", "description_en", "laravel", "trending"];
const OPTIONAL_TEXT = ["name_en", "replaces_en", "license_en"];

// Fail fast: a typo in apps.json must break the build, not silently drop an app from a list.
function validate(list, relatedLists) {
  const errors = [];
  const seen = new Set();
  const slugOf = new Map();
  const nonEmpty = v => typeof v === "string" && v.trim() !== "";
  for (const [i, a] of list.entries()) {
    const id = `#${i} ${a.name ?? "(adsız)"}`;
    for (const k of REQUIRED) if (!(k in a)) errors.push(`${id}: '${k}' alanı eksik`);
    for (const k of ["description", "description_en"]) if (k in a && !nonEmpty(a[k])) errors.push(`${id}: '${k}' boş`);
    for (const k of OPTIONAL_TEXT) if (k in a && !nonEmpty(a[k])) errors.push(`${id}: '${k}' varsa boş olamaz`);
    if (!LICENSE_TYPES.includes(a.license_type)) errors.push(`${id}: geçersiz license_type '${a.license_type}' (${LICENSE_TYPES.join(", ")})`);
    if (!Array.isArray(a.platforms) || !a.platforms.length) errors.push(`${id}: platforms boş`);
    else for (const p of a.platforms) if (!(p in PLATFORM_MAP)) errors.push(`${id}: '${p}' PLATFORM_MAP'te yok`);
    if (typeof a.url !== "string" || !a.url.startsWith("https://")) errors.push(`${id}: url https:// ile başlamalı`);
    if (!CATEGORY_SLUGS_EN.includes(a.category_slug)) errors.push(`${id}: '${a.category_slug}' için scripts/i18n.mjs içinde İngilizce kategori adı yok`);
    const key = String(a.name).toLowerCase();
    if (seen.has(key)) errors.push(`${id}: aynı isim iki kez var`);
    seen.add(key);
    if (slugOf.has(a.category) && slugOf.get(a.category) !== a.category_slug) errors.push(`${id}: '${a.category}' için farklı category_slug`);
    slugOf.set(a.category, a.category_slug);
  }
  for (const [i, r] of relatedLists.entries()) {
    for (const k of ["tag", "tag_en", "description", "description_en"]) if (!nonEmpty(r[k])) errors.push(`related-lists #${i}: '${k}' eksik veya boş`);
  }
  if (errors.length) {
    console.error(`data/ geçersiz:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
}
validate(apps, related);

const bucketsOf = a => [...new Set(a.platforms.flatMap(p => PLATFORM_MAP[p] ?? []))];
const cell = s => String(s).replace(/\|/g, "\\|");
// GitHub's heading anchor: lowercase, drop punctuation, spaces to hyphens.
const anchor = s => s.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").replace(/ /g, "-");

// Clean generated folders so removed categories don't linger.
for (const d of ["categories", "platforms", "licenses", "lists", "en"]) rmSync(join(root, d), { recursive: true, force: true });

function write(rel, content) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content.trimEnd() + "\n");
}

const categories = [...new Map(apps.map(a => [a.category_slug, a.category])).entries()];

function buildLocale(L) {
  const badges = a => [
    L.badges[a.license_type],
    a.laravel ? L.badges.laravel : null,
    a.trending ? L.badges.trending : null,
  ].filter(Boolean).join(" · ");

  function table(list, { withCategory = false } = {}) {
    const c = L.cols;
    const names = [c.alt, c.replaces, ...(withCategory ? [c.category] : []), c.license, c.platform, c.desc];
    const head = `| ${names.join(" | ")} |\n| ${names.map(() => "---").join(" | ")} |`;
    const rows = [...list]
      .sort((a, b) => L.name(a).localeCompare(L.name(b), L.sortLocale))
      .map(a => {
        const cols = [
          `[${cell(L.name(a))}](${a.url})`, cell(L.replaces(a)),
          ...(withCategory ? [`[${cell(L.category(a))}](../categories/${a.category_slug}.md)`] : []),
          `${badges(a)}<br><sub>${cell(L.license(a))}</sub>`,
          cell(a.platforms.map(L.platform).join(", ")), cell(L.description(a)),
        ];
        return `| ${cols.join(" | ")} |`;
      });
    return `${head}\n${rows.join("\n")}`;
  }

  const out = (rel, content) => write(`${L.dir}${rel}`, content);
  const page = (title, intro, body) => out(title.path, `# ${title.text}

${L.backLink}

${intro}

${body}
`);

  for (const [slug, trTitle] of categories) {
    const list = apps.filter(a => a.category_slug === slug);
    page({ path: `categories/${slug}.md`, text: L.categoryTitle(slug, trTitle) }, `${L.count(list.length)} ${L.legend}`, table(list));
  }

  const platformCounts = {};
  for (const [key, title] of Object.entries(L.platforms)) {
    const list = apps.filter(a => bucketsOf(a).includes(key));
    platformCounts[key] = list.length;
    if (!list.length) continue;
    page({ path: `platforms/${key}.md`, text: title }, `${L.count(list.length)} ${L.legend}`, table(list, { withCategory: true }));
  }

  const licenseCounts = {};
  for (const [key, { title, desc }] of Object.entries(L.licenses)) {
    const list = apps.filter(a => a.license_type === key);
    licenseCounts[key] = list.length;
    page({ path: `licenses/${key}.md`, text: title }, `${desc} ${L.count(list.length).replace(/\.$/, "")}.`, table(list, { withCategory: true }));
  }

  const laravel = apps.filter(a => a.laravel);
  const trending = apps.filter(a => a.trending);
  page({ path: "lists/laravel.md", text: L.laravelTitle }, L.laravelIntro(laravel.length), table(laravel, { withCategory: true }));
  page({ path: "lists/trending.md", text: L.trendingTitle }, L.trendingIntro(trending.length), table(trending, { withCategory: true }));

  const R = L.readme;
  const sections = [R.byCategory, R.byPlatform, R.byLicense, R.special, R.related, R.contributing];
  const relatedRows = related.map(r =>
    `| ${r.links.map(l => `[${cell(l.name)}](${l.url})`).join(" · ")} | ${cell(L.relatedTag(r))} | ${cell(L.relatedDescription(r))} |`
  ).join("\n");

  out("README.md", `# Awesome FOSS Alternatives [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

${R.switcher}

> ${R.tagline}

${R.stats(apps.length, categories.length, licenseCounts.osi)}

${L.legend}

## ${R.toc}

${sections.map(s => `- [${s}](#${anchor(s)})`).join("\n")}

## ${R.byCategory}

| ${R.catCol} | ${R.countCol} |
| --- | --- |
${categories.map(([slug, trTitle]) => `| [${L.categoryTitle(slug, trTitle)}](categories/${slug}.md) | ${apps.filter(a => a.category_slug === slug).length} |`).join("\n")}

## ${R.byPlatform}

| ${R.platCol} | ${R.countCol} |
| --- | --- |
${Object.entries(L.platforms).filter(([k]) => platformCounts[k]).map(([k, t]) => `| [${t}](platforms/${k}.md) | ${platformCounts[k]} |`).join("\n")}

## ${R.byLicense}

| ${R.licCol} | ${R.countCol} | ${R.descCol} |
| --- | --- | --- |
${Object.entries(L.licenses).map(([k, { title, desc }]) => `| [${title}](licenses/${k}.md) | ${licenseCounts[k]} | ${desc} |`).join("\n")}

## ${R.special}

- [${R.laravelLink}](lists/laravel.md) (${laravel.length})
- [${R.trendingLink}](lists/trending.md) (${trending.length})

## ${R.related}

| ${R.relCols.join(" | ")} |
| --- | --- | --- |
${relatedRows}

## ${R.contributing}

${R.contributingText}

## ${R.license}

${R.licenseText}
`);

  return platformCounts;
}

let platformPages = 0;
for (const L of Object.values(LOCALES)) platformPages = Object.values(buildLocale(L)).filter(Boolean).length;

console.log(`Built: ${apps.length} apps, ${categories.length} categories, ${platformPages} platform pages, ${Object.keys(LOCALES).length} languages.`);
