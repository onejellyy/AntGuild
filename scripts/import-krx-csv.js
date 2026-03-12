#!/usr/bin/env node
/**
 * KRX Data Marketplace CSV → assets/data/stocks.json
 *
 * Usage:
 *   node scripts/import-krx-csv.js <path-to-krx-csv>
 *
 * How to get the KRX CSV:
 *   1. Go to https://data.krx.co.kr
 *   2. 기본통계 → 주식 → 종목정보 → 전종목 기본정보
 *   3. Download as CSV (UTF-8 or EUC-KR)
 *   4. Run this script:
 *      node scripts/import-krx-csv.js krx_stocks.csv
 *
 * The script reads the KRX CSV and writes a clean JSON to assets/data/stocks.json.
 * Commit the updated JSON after running this script.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT_FILE = process.argv[2];
const OUTPUT_FILE = path.join(__dirname, '..', 'assets', 'data', 'stocks.json');

if (!INPUT_FILE) {
  console.error('Usage: node scripts/import-krx-csv.js <krx-csv-file>');
  console.error('');
  console.error('Download the CSV from:');
  console.error('  https://data.krx.co.kr → 기본통계 → 주식 → 종목정보 → 전종목 기본정보');
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`File not found: ${INPUT_FILE}`);
  process.exit(1);
}

/** Normalize a stock name for search_keys */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[\s\(\)\.\-\_,&]/g, '');
}

/** Build search keys for a stock entry */
function buildSearchKeys(nameKo, nameEn) {
  const keys = [normalize(nameKo)];
  if (nameEn) {
    keys.push(normalize(nameEn));
  }
  // Add individual words for multi-word names
  const koWords = nameKo.split(/\s+/);
  if (koWords.length > 1) {
    koWords.forEach(w => {
      const nw = normalize(w);
      if (nw && !keys.includes(nw)) keys.push(nw);
    });
  }
  return keys;
}

async function main() {
  const stocks = [];
  const seenCodes = new Set();

  const fileContent = fs.readFileSync(INPUT_FILE);

  // Auto-detect encoding: try UTF-8 first, fallback note
  let content = fileContent.toString('utf8');

  // If the content looks garbled (EUC-KR), iconv-lite is needed
  // Install: npm install iconv-lite
  // Then: const iconv = require('iconv-lite'); content = iconv.decode(fileContent, 'euc-kr');

  const lines = content.split(/\r?\n/);

  if (lines.length === 0) {
    console.error('Empty file');
    process.exit(1);
  }

  // Parse header to find column indices
  const header = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
  console.log('CSV Header columns:', header);

  // KRX CSV column names (may vary by download type):
  // Common patterns:
  //   종목코드, 종목명, 시장구분
  //   ISU_CD, ISU_NM, MKT_NM
  //   단축코드, 한글종목명, 시장유형명
  const codeIdx = findCol(header, ['종목코드', '단축코드', 'ISU_SRT_CD', 'ISU_CD', 'Code', 'code']);
  const nameKoIdx = findCol(header, ['종목명', '한글종목명', 'ISU_NM', 'ISU_KOR_NM', '한글 종목명', 'Name']);
  const marketIdx = findCol(header, ['시장구분', '시장유형명', 'MKT_NM', 'MKT_ID', 'Market']);
  const nameEnIdx = findCol(header, ['영문종목명', 'ISU_ENG_NM', '영문 종목명', 'EnglishName']);

  if (codeIdx === -1 || nameKoIdx === -1) {
    console.error('Could not identify required columns (종목코드, 종목명) in CSV header.');
    console.error('Header found:', header);
    console.error('Please check column names and update the findCol() calls in this script.');
    process.exit(1);
  }

  console.log(`Column mapping: code[${codeIdx}] name_ko[${nameKoIdx}] market[${marketIdx}] name_en[${nameEnIdx}]`);

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const cols = parseCSVLine(raw);

    const code = (cols[codeIdx] || '').trim();
    const nameKo = (cols[nameKoIdx] || '').trim();
    const market = marketIdx !== -1 ? (cols[marketIdx] || '').trim() : '';
    const nameEn = nameEnIdx !== -1 ? (cols[nameEnIdx] || '').trim() : '';

    // Validate: 6-digit code and Korean name required
    if (!/^\d{6}$/.test(code) || !nameKo) continue;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const entry = {
      code,
      name_ko: nameKo,
      market: normalizeMarket(market),
      search_keys: buildSearchKeys(nameKo, nameEn),
    };
    if (nameEn) entry.name_en = nameEn;

    stocks.push(entry);
  }

  if (stocks.length === 0) {
    console.error('No valid stocks parsed. Check the CSV format.');
    process.exit(1);
  }

  // Sort alphabetically by name_ko
  stocks.sort((a, b) => a.name_ko.localeCompare(b.name_ko, 'ko'));

  const output = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'KRX Data Marketplace',
    count: stocks.length,
    stocks,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\n✅ Done! Wrote ${stocks.length} stocks to ${OUTPUT_FILE}`);
  console.log('Commit the updated file to the repo.');
}

function findCol(header, candidates) {
  for (const c of candidates) {
    const idx = header.findIndex(h => h === c || h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizeMarket(raw) {
  const r = raw.toUpperCase();
  if (r.includes('KOSPI') || r.includes('유가증권')) return 'KOSPI';
  if (r.includes('KOSDAQ') || r.includes('코스닥')) return 'KOSDAQ';
  if (r.includes('KONEX') || r.includes('코넥스')) return 'KONEX';
  return raw || 'KRX';
}

/** Parse a single CSV line handling quoted fields */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
