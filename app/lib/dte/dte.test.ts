import { describe, expect, it } from 'vitest';
import { devices, validateDefinition } from './devices';
import { formatRule, parseRuleCorpus } from './rules';

const rule = (id: number, title: string) =>
  `**APL${String(id).padStart(3, '0')} ${title}**\n\`\`\`\nNL: "Define a boundary."\n→ AB(spawn("boundary"))\n\`\`\``;

describe('device inventory and contract', () => {
  it('keeps every published device definition valid and IDs unique', () => {
    expect(new Set(devices.map((device) => device.id)).size).toBe(devices.length);

    for (const device of devices) {
      expect(validateDefinition(JSON.stringify(device))).toEqual([]);
    }
  });

  it('rejects malformed JSON, repeated or unbounded BARs and unsafe sizes', () => {
    expect(validateDefinition('{')).toHaveLength(1);

    const template = {
      ...devices[0],
      bars: [
        { index: 0, size: 5000, role: 'bad' },
        { index: 0, size: 4096, role: 'duplicate' },
      ],
    };
    expect(validateDefinition(JSON.stringify(template))).toEqual(
      expect.arrayContaining([expect.stringContaining('BAR size'), expect.stringContaining('BAR indices')]),
    );
  });
});

describe('APL skill Markdown ingestion', () => {
  it('parses supplied rules with their exact IDs and typed text', () => {
    const catalog = parseRuleCorpus(`${rule(1, 'INDEPENDENT REGIONS')}\n${rule(71, 'STILL WATER')}`);
    expect(catalog.size).toBe(2);
    expect(formatRule(catalog.get(71)!)).toContain('APL071 STILL WATER');
  });
  it('rejects duplicate IDs, missing NL mapping, and empty corpora', () => {
    expect(() => parseRuleCorpus(`${rule(1, 'ONE')}\n${rule(1, 'TWO')}`)).toThrow('duplicate');
    expect(() => parseRuleCorpus('not a rule')).toThrow('No');
    expect(() => parseRuleCorpus('**APL002 TEST**\n```\nunsafe()\n```')).toThrow('NL-to-rule');
  });
});
