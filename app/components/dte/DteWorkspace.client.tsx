import { useChat } from 'ai/react';
import { useEffect, useMemo, useState } from 'react';
import { CodeMirrorEditor } from '~/components/editor/codemirror/CodeMirrorEditor';
import { devices, validateDefinition, type DeviceDefinition } from '~/lib/dte/devices';
import { DeviceTree } from './DeviceTree';
import { RuleConsole } from './RuleConsole';
import styles from './DteWorkspace.module.scss';

const storageKey = (id: string) => `dte-device-draft-v1:${id}`;
const referenceJson = (device: DeviceDefinition) => JSON.stringify(device, null, 2);

function readDraft(device: DeviceDefinition): string {
  try {
    return localStorage.getItem(storageKey(device.id)) ?? referenceJson(device);
  } catch (error) {
    console.error('[dte-editor] browser storage unavailable', error);
    return referenceJson(device);
  }
}

export function DteWorkspace() {
  const [device, setDevice] = useState<DeviceDefinition>(devices[1]);
  const [draft, setDraft] = useState(() => readDraft(devices[1]));
  const [saved, setSaved] = useState(() => readDraft(devices[1]));
  const [editorTab, setEditorTab] = useState<'definition' | 'properties'>('definition');
  const [notification, setNotification] = useState('');
  const [chatError, setChatError] = useState('');
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, append } = useChat({
    api: '/api/dte-chat',
    body: { deviceId: device.id },
    onError: (error) => {
      console.error('[dte-chat] response failed', error);
      setChatError(error.message || 'Live chat failed.');
    },
    onFinish: () => setChatError(''),
  });

  useEffect(() => {
    const value = readDraft(device);
    setDraft(value);
    setSaved(value);
    setNotification('');
  }, [device]);

  const problems = useMemo(() => {
    const errors = validateDefinition(draft);

    if (errors.length) {
      return errors;
    }

    const edited = JSON.parse(draft) as DeviceDefinition;

    if (edited.id !== device.id) {
      errors.push('The device ID must match the selected Device Manager entry.');
    }

    if (edited.status !== device.status) {
      errors.push(
        'Reference/proposed status comes from the verified inventory; it cannot be upgraded in a browser draft.',
      );
    }

    return errors;
  }, [draft, device]);

  const save = () => {
    if (problems.length) {
      setNotification(`Cannot save: ${problems.join(' ')}`);
      return;
    }

    try {
      localStorage.setItem(storageKey(device.id), draft);
      setSaved(draft);
      setNotification('Saved in this browser only. Export the JSON to move it elsewhere.');
    } catch (error) {
      console.error('[dte-editor] save failed', error);
      setNotification('Browser storage failed; export the definition instead.');
    }
  };

  const exportDefinition = () => {
    if (problems.length) {
      setNotification(`Cannot export an invalid definition: ${problems.join(' ')}`);
      return;
    }

    const url = URL.createObjectURL(new Blob([draft + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${device.id}.device.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotification('Downloaded a draft definition; no emulator or vendor runtime was changed.');
  };

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className="i-ph:tree-structure-fill" aria-hidden="true" />{' '}
          <div>
            <strong>Deep Tree Echo</strong>
            <small>ROLE-TAILORED DEVICE WORKSPACE</small>
          </div>
        </div>
        <div className={styles.headerStatus}>
          <span className={styles.statusLight} /> Reference inventory <span className={styles.separator}>/</span> Not
          connected to hardware
        </div>
        <a href="/" className={styles.backLink}>
          Classic Bolt ↗
        </a>
      </header>
      <main className={styles.main}>
        <DeviceTree selected={device.id} onSelect={setDevice} />
        <section className={styles.editorPanel} aria-label="Device definition editor">
          <div className={styles.panelHeading}>
            <div>
              <small>DEVICE DEVELOPMENT</small>
              <h1>{device.name}</h1>
            </div>
            <span className={device.status === 'reference' ? styles.referenceBadge : styles.proposedBadge}>
              {device.status === 'reference' ? 'LINUX REFERENCE' : 'DESIGN PROPOSAL'}
            </span>
          </div>
          <nav className={styles.tabs} aria-label="Editor views">
            <button
              className={editorTab === 'definition' ? styles.activeTab : ''}
              type="button"
              onClick={() => setEditorTab('definition')}
            >
              Definition.json
            </button>
            <button
              className={editorTab === 'properties' ? styles.activeTab : ''}
              type="button"
              onClick={() => setEditorTab('properties')}
            >
              Properties
            </button>
            <span className={styles.unsaved}>{draft !== saved ? '● Unsaved draft' : '✓ Saved state'}</span>
          </nav>
          {editorTab === 'definition' ? (
            <div className={styles.editorBody}>
              <CodeMirrorEditor
                theme="dark"
                doc={{ filePath: `/dte/definitions/${device.id}.json`, value: draft, isBinary: false }}
                settings={{ tabSize: 2, fontSize: '13px' }}
                onChange={(update) => setDraft(update.content)}
                onSave={save}
              />
            </div>
          ) : (
            <div className={styles.properties}>
              <p>{device.description}</p>
              <dl>
                <dt>Source / provenance</dt>
                <dd>{device.source}</dd>
                <dt>ABI / design version</dt>
                <dd>{device.version}</dd>
                <dt>Operations</dt>
                <dd>{device.operations.join(' · ')}</dd>
                <dt>Capabilities</dt>
                <dd>{device.capabilities.join(' · ')}</dd>
                <dt>Authority limits</dt>
                <dd>{device.authority.join(' · ')}</dd>
                <dt>Memory BARs</dt>
                <dd>
                  {device.bars.length
                    ? device.bars.map((bar) => `BAR${bar.index}: ${bar.size} bytes (${bar.role})`).join(' / ')
                    : 'Not allocated; proposed only'}
                </dd>
              </dl>
              <div className={styles.evidence}>
                A reference label records prior Linux Bochs validation; it does not indicate a currently connected
                device. Windows NAV RTC and Windows DLL are not attached.
              </div>
            </div>
          )}
          <div className={styles.editorFooter}>
            <div className={problems.length ? styles.error : styles.validity}>
              {problems.length
                ? `${problems.length} validation issue(s): ${problems[0]}`
                : '✓ Definition contract valid'}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => {
                  setDraft(saved);
                  setNotification('Reverted unsaved changes.');
                }}
                disabled={draft === saved}
              >
                Revert
              </button>
              <button type="button" onClick={exportDefinition}>
                Export JSON
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={save}
                disabled={draft === saved || problems.length > 0}
              >
                Save draft
              </button>
            </div>
            {notification && (
              <div role="status" className={styles.notice}>
                {notification}
              </div>
            )}
          </div>
        </section>
        <section className={styles.chatPanel} aria-label="Core Self chat">
          <div className={styles.chatHeader}>
            <div className="i-ph:brain-duotone" aria-hidden="true" />
            <div>
              <strong>Core Self</strong>
              <small>Identity mesh · contextual technical chat</small>
            </div>
          </div>
          <div className={styles.chatMessages} aria-live="polite">
            {messages.length === 0 && (
              <div className={styles.chatEmpty}>
                <span className="i-ph:circles-four-duotone" aria-hidden="true" />
                <strong>Ask from the selected device.</strong>
                <p>
                  Replies come from the configured live model, not a canned simulation. This app has no persistent
                  hypergraph memory or guest control.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setChatError('');
                    void append({
                      role: 'user',
                      content: `Explain the verified versus proposed behavior and authority boundaries of ${device.name}.`,
                    });
                  }}
                >
                  Inspect selected device →
                </button>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}>
                <small>{message.role === 'user' ? 'YOU' : 'CORE SELF · LIVE'}</small>
                <div>{message.content}</div>
              </div>
            ))}
            {isLoading && <p className={styles.loading}>Generating a contextual reply…</p>}
          </div>
          {chatError && (
            <div role="alert" className={styles.error}>
              Live chat unavailable: {chatError}. Check the ANTHROPIC_API_KEY server configuration.
            </div>
          )}
          <form
            className={styles.chatForm}
            onSubmit={(event) => {
              setChatError('');
              handleSubmit(event);
            }}
          >
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={`Ask about ${device.name}…`}
              aria-label="Core Self message"
              rows={3}
              maxLength={4000}
            />
            <button
              type={isLoading ? 'button' : 'submit'}
              onClick={isLoading ? stop : undefined}
              disabled={!isLoading && !input.trim()}
            >
              {isLoading ? 'Stop' : 'Send ↗'}
            </button>
          </form>
        </section>
      </main>
      <RuleConsole />
    </div>
  );
}
