export type NormalizedText = {
  raw: string;
  normalized: string;
  lines: string[];
};

const safeNormalizeUnicode = (value: string): string => {
  try {
    return value.normalize('NFKC');
  } catch {
    return value;
  }
};

const stripNonPrintable = (value: string): string => {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
};

const normalizeWhitespace = (value: string): string => {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const TextProcessor = {
  normalizeText(input: string): NormalizedText {
    try {
      const raw = typeof input === 'string' ? input : '';
      const normalized = normalizeWhitespace(stripNonPrintable(safeNormalizeUnicode(raw)));
      const lines = normalized
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      return { raw, normalized, lines };
    } catch {
      return { raw: '', normalized: '', lines: [] };
    }
  },

  toFlatText(lines: string[]): string {
    try {
      return (lines || []).join(' ').replace(/[ ]{2,}/g, ' ').trim();
    } catch {
      return '';
    }
  },

  findLineIndex(lines: string[], predicate: (line: string) => boolean): number {
    try {
      for (let i = 0; i < lines.length; i++) {
        if (predicate(lines[i])) return i;
      }
      return -1;
    } catch {
      return -1;
    }
  },
};
