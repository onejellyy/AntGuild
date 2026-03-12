/**
 * CSV 명언 파서
 *
 * parseCSV(csvString) 함수는 CSV 문자열을 Quote 배열로 변환합니다.
 * 향후 expo-file-system 연동 시 loadQuotesFromFile()로 교체합니다.
 *
 * CSV 형식: id,text,author,category
 */

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

/**
 * CSV 문자열을 Quote 배열로 파싱합니다.
 * 첫 번째 줄은 헤더로 간주하여 건너뜁니다.
 * 큰따옴표로 감싸진 필드를 처리합니다.
 */
export function parseCSV(csvString: string): Quote[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  // 헤더 건너뛰기
  const dataLines = lines.slice(1);

  return dataLines.reduce<Quote[]>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;

    const fields = splitCSVLine(trimmed);
    if (fields.length < 4) return acc;

    acc.push({
      id: fields[0].trim(),
      text: fields[1].trim(),
      author: fields[2].trim(),
      category: fields[3].trim(),
    });
    return acc;
  }, []);
}

/**
 * CSV 한 줄을 필드 배열로 분리합니다.
 * 큰따옴표 내의 쉼표를 올바르게 처리합니다.
 */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * TODO: expo-file-system 설치 후 아래 함수로 실제 CSV 파일을 로드합니다.
 *
 * import * as FileSystem from 'expo-file-system';
 * import { Asset } from 'expo-asset';
 *
 * export async function loadQuotesFromFile(): Promise<Quote[]> {
 *   const asset = Asset.fromModule(require('../../assets/data/quotes.csv'));
 *   await asset.downloadAsync();
 *   if (!asset.localUri) return [];
 *   const csvString = await FileSystem.readAsStringAsync(asset.localUri);
 *   return parseCSV(csvString);
 * }
 */
