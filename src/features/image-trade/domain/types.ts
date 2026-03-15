export interface ParsedImageTrade {
  date: string;   // YYYY-MM-DD
  symbol: string;
  type: 'BUY' | 'SELL';
  qty: number;
  price: number;
}

export interface ImageParseResult {
  broker: 'kakaopay-securities' | 'toss-securities' | 'unknown';
  trades: ParsedImageTrade[];
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: number;
}
