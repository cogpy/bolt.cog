import type { Terminal as XTerm } from '@xterm/xterm';
import { useCallback, useRef, useState } from 'react';
import { Terminal } from '~/components/workbench/terminal/Terminal';
import { formatRule, parseRuleCorpus, type ProductionRule } from '~/lib/dte/rules';
import styles from './DteWorkspace.module.scss';

const usage = 'help | list [start end] | rule <1..253> | range <start> <end> | generate <id> <instruction> | clear';
const terminalTheme = {
  background: '#0b131e',
  foreground: '#dae8f1',
  cursor: '#58d2c3',
  selectionBackground: '#315867',
};

export function RuleConsole() {
  const catalogRef = useRef(new Map<number, ProductionRule>());
  const terminalRef = useRef<XTerm | null>(null);
  const lineRef = useRef('');
  const busyRef = useRef(false);
  const [ruleCount, setRuleCount] = useState(0);
  const [error, setError] = useState('');

  const run = useCallback(async (line: string, terminal: XTerm) => {
    const [verb, ...args] = line.trim().split(/\s+/);
    const catalog = catalogRef.current;

    if (!verb) {
      return;
    }

    if (verb === 'clear') {
      terminal.clear();
      return;
    }

    if (verb === 'help') {
      terminal.writeln(usage);
      return;
    }

    if (verb === 'list') {
      const start = args[0] === undefined ? 1 : Number(args[0]);
      const end = args[1] === undefined ? Math.min(start + 24, 253) : Number(args[1]);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end > 253 ||
        end < start ||
        end - start > 24
      ) {
        terminal.writeln('Choose a range of up to 25 pattern IDs (1..253).');
        return;
      }

      const found = [...catalog.values()]
        .filter((rule) => rule.id >= start && rule.id <= end)
        .sort((a, b) => a.id - b.id);
      terminal.writeln(
        found.length
          ? found.map((rule) => `APL${String(rule.id).padStart(3, '0')} ${rule.title}`).join('\n')
          : 'No rules in this range; import your APL253 Markdown corpus above.',
      );

      return;
    }

    if (verb === 'rule' || verb === 'range' || verb === 'generate') {
      const id = Number(args[0]);

      if (!Number.isInteger(id) || id < 1 || id > 253) {
        terminal.writeln('Pattern ID must be an integer from 1 to 253.');
        return;
      }

      if (verb === 'range') {
        const end = Number(args[1]);

        if (!Number.isInteger(end) || end < id || end > 253 || end - id > 9) {
          terminal.writeln('Range may contain at most 10 patterns.');
          return;
        }

        for (let n = id; n <= end; n++) {
          terminal.writeln(
            catalog.get(n) ? formatRule(catalog.get(n)!) : `APL${String(n).padStart(3, '0')}: not imported`,
          );
        }

        return;
      }

      const rule = catalog.get(id);

      if (!rule) {
        terminal.writeln(`APL${String(id).padStart(3, '0')}: import its skill Markdown first.`);
        return;
      }

      if (verb === 'rule') {
        terminal.writeln(formatRule(rule));
        return;
      }

      const instruction = args.slice(1).join(' ');

      if (instruction.length < 4 || instruction.length > 1000) {
        terminal.writeln('Provide a transformation request of 4–1000 characters.');
        return;
      }

      const response = await fetch('/api/dte-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: rule.title, source: rule.body, instruction }),
      });
      const result = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !result.text) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      terminal.writeln(`Generated APL${String(id).padStart(3, '0')} rule (not executed):\n${result.text}`);

      return;
    }

    terminal.writeln(`Unknown command. ${usage}`);
  }, []);

  const onReady = useCallback(
    (terminal: XTerm) => {
      terminalRef.current = terminal;
      terminal.writeln('APL253 production-rule console · imported corpus only · no OS shell');
      terminal.writeln(usage);
      terminal.write('apl> ');
      terminal.onData((data) => {
        if (busyRef.current) {
          return;
        }

        for (const char of data) {
          if (char === '\r' || char === '\n') {
            const line = lineRef.current;
            lineRef.current = '';
            busyRef.current = true;
            terminal.write('\r\n');
            void run(line, terminal)
              .catch((reason: unknown) => {
                console.error('[dte-rules] command failed', reason);
                terminal.writeln(`ERROR: ${reason instanceof Error ? reason.message : 'Unknown rule failure'}`);
              })
              .finally(() => {
                busyRef.current = false;
                terminal.write('apl> ');
              });
          } else if (char === '\u007f') {
            if (lineRef.current.length) {
              lineRef.current = lineRef.current.slice(0, -1);
              terminal.write('\b \b');
            }
          } else if (char >= ' ' && char !== '\u007f' && lineRef.current.length < 1100) {
            lineRef.current += char;
            terminal.write(char);
          }
        }
      });
    },
    [run],
  );

  const loadCorpus = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    try {
      const next = new Map(catalogRef.current);

      for (const file of Array.from(files)) {
        if (file.size > 2_000_000) {
          throw new Error('Each corpus file must be at most 2 MB.');
        }

        for (const [id, rule] of parseRuleCorpus(await file.text())) {
          if (next.has(id)) {
            throw new Error(`Duplicate APL${String(id).padStart(3, '0')} across files.`);
          }

          next.set(id, rule);
        }
      }
      catalogRef.current = next;
      setRuleCount(next.size);
      setError('');
      terminalRef.current?.writeln(`\r\nLoaded ${next.size} distinct rules for this browser session.`);
    } catch (reason) {
      console.error('[dte-rules] import failed', reason);
      setError(reason instanceof Error ? reason.message : 'Import failed');
    }
  };

  return (
    <div className={styles.console}>
      <div className={styles.consoleHeader}>
        <strong>APL253 rule console</strong>
        <span>{ruleCount}/253 imported</span>
        <label className={styles.importButton}>
          Import skill Markdown
          <input
            type="file"
            accept=".md,text/markdown"
            multiple
            onChange={(event) => {
              void loadCorpus(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <Terminal className={styles.terminal} theme="dark" terminalTheme={terminalTheme} onTerminalReady={onReady} />
    </div>
  );
}
