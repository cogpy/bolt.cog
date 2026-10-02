export interface ProductionRule {
  id: number;
  title: string;
  body: string;
}

/** Read fenced APL rules from a user-selected skill export. Never evaluate rule text as code. */
export function parseRuleCorpus(markdown: string): Map<number, ProductionRule> {
  if (markdown.length > 2_000_000) {
    throw new Error('Corpus must be at most 2 MB.');
  }

  const catalog = new Map<number, ProductionRule>();
  const pattern = /\*\*APL(\d{3})\s+([^*\n]+)\*\*\s*```[^\n]*\n([\s\S]*?)```/g;

  for (const match of markdown.matchAll(pattern)) {
    const id = Number(match[1]);

    if (id < 1 || id > 253 || catalog.has(id)) {
      throw new Error(`Invalid or duplicate pattern ${id}.`);
    }

    const body = match[3].trim();

    if (!body.startsWith('NL:') || !body.includes('→') || body.length > 8000) {
      throw new Error(`APL${String(id).padStart(3, '0')} has no valid NL-to-rule body.`);
    }

    catalog.set(id, { id, title: match[2].trim(), body });
  }

  if (catalog.size === 0) {
    throw new Error('No **APL001 TITLE** followed by a fenced rule was found.');
  }

  return catalog;
}

export function formatRule(rule: ProductionRule): string {
  return `APL${String(rule.id).padStart(3, '0')} ${rule.title}\n${rule.body}`;
}
