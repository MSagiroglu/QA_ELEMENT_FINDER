import React, { useState, useEffect, useCallback } from 'react';
import './panel.css';
import { generateCombinedCode } from '../shared/codegen-service';
import type { Framework } from '../shared/types';

type TabId = 'inspector' | 'generator' | 'recorder' | 'player';

function Svg({ name, size = 14 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    pick: 'M15 15l-4 4m0 0l-4-4m4 4V7a4 4 0 00-4-4H4m12 12l4-4m-4 4v5a4 4 0 01-4 4H8',
    record: 'M3 12a9 9 0 1118 0 9 9 0 01-18 0zm7-3l6 3-6 3V9z',
    stop: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    clipboard: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3',
    code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    plus: 'M12 4v16m8-8H4',
    back: 'M19 12H5m7-7l-7 7 7 7',
    add: 'M12 4v16m8-8H4',
    copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    check: 'M5 13l4 4L19 7',
    close: 'M6 18L18 6M6 6l12 12',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  };
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 }
  }, React.createElement('path', { d: paths[name] || paths.search }));
}

export const DevToolsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('inspector');
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [selectors, setSelectors] = useState<any[]>([]);
  const [framework, setFramework] = useState('playwright-ts');
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [codeOutput, setCodeOutput] = useState('// Select an element or record steps\n// Then generate POM code');
  const [playStatus, setPlayStatus] = useState<'idle' | 'playing' | 'done'>('idle');
  const [playResults, setPlayResults] = useState<any[]>([]);
  const [pageElements, setPageElements] = useState<any[]>([]);
  const [testUrl, setTestUrl] = useState('');

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === 'ELEMENT_SELECTED') {
        setSelectedElement(msg.payload);
        setActiveTab('inspector');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'devtools' });
    return () => port.disconnect();
  }, []);

  const getTabId = useCallback((): Promise<number | undefined> => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => resolve(tab?.id));
    });
  }, []);

  const startPicker = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'ACTIVATE_PICKER' });
  }, []);

  const startRecording = useCallback(async () => {
    const tabId = await getTabId();
    chrome.runtime.sendMessage({ type: 'START_RECORDING', payload: { tabId } }, () => setIsRecording(true));
  }, [getTabId]);

  const stopRecording = useCallback(async () => {
    const tabId = await getTabId();
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING', payload: { tabId } }, (res: any) => {
      if (res?.success && res.data) {
        setSteps(res.data.steps);
        setIsRecording(false);
        if (!testUrl) setTestUrl(res.data.url);
      }
    });
  }, [getTabId, testUrl]);

  const runTest = useCallback(async () => {
    setPlayStatus('playing');
    setPlayResults([]);
    const tabId = await getTabId();
    chrome.runtime.sendMessage({ type: 'PLAY_TEST', payload: { steps, tabId } }, (res: any) => {
      if (res?.success && res.data) {
        setPlayResults(res.data.stepResults);
        setPlayStatus('done');
      }
    });
  }, [steps, getTabId]);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'inspector', label: 'Inspector', icon: 'search' },
    { id: 'generator', label: 'Generator', icon: 'code' },
    { id: 'recorder', label: 'Recorder', icon: 'record' },
    { id: 'player', label: 'Player', icon: 'play' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--accent), var(--cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
          }}>Q</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>QA Finder</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Element Inspector</div>
          </div>
        </div>

        <div style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Elements ({pageElements.length})
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          {pageElements.length === 0 && (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <div className="empty-state-icon" style={{ fontSize: 24 }}>◎</div>
              <div className="empty-state-title" style={{ fontSize: 12 }}>No elements</div>
              <div className="empty-state-desc" style={{ fontSize: 11 }}>Pick elements from the page to build your page model</div>
            </div>
          )}
          {pageElements.map((el, i) => (
            <div key={i} className="tree-item" onClick={() => { setSelectedElement(el); setActiveTab('inspector'); }}
              style={selectedElement === el ? { background: 'var(--accent-glow)', borderLeftColor: 'var(--accent)' } : {}}>
              <span className="tree-item-icon">▣</span>
              <span style={{ flex: 1, fontSize: 12 }}>{el.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{el.tagName}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 12px 12px' }}>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={startPicker}>
            <Svg name="plus" size={13} /> Pick Element
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <div className="tabs">
          {tabs.map(tab => (
            <div key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Svg name={tab.icon} size={12} />
              {tab.label}
            </div>
          ))}
        </div>

        <div className="panel">
          {activeTab === 'inspector' && (
            <InspectorPanel
              selectedElement={selectedElement}
              onPick={startPicker}
              onAddToModel={(el: any) => setPageElements(prev => [...prev, el])}
            />
          )}
          {activeTab === 'generator' && (
            <GeneratorPanel
              framework={framework}
              onFrameworkChange={setFramework}
              pageElements={pageElements}
              codeOutput={codeOutput}
              onCodeChange={setCodeOutput}
              recordedSteps={steps}
              testUrl={testUrl}
            />
          )}
          {activeTab === 'recorder' && (
            <RecorderPanel
              isRecording={isRecording}
              steps={steps}
              onStart={startRecording}
              onStop={stopRecording}
              onStepsChange={setSteps}
            />
          )}
          {activeTab === 'player' && (
            <PlayerPanel
              steps={steps}
              status={playStatus}
              results={playResults}
              onPlay={runTest}
              onReset={() => { setPlayStatus('idle'); setPlayResults([]); }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ===== INSPECTOR ===== */
function InspectorPanel({ selectedElement, onPick, onAddToModel }: any) {
  return (
    <div>
      <button className="btn btn-primary" onClick={onPick} style={{ marginBottom: 14 }}>
        <Svg name="pick" size={14} /> Pick Element on Page
      </button>

      {!selectedElement && (
        <div className="empty-state">
          <div className="empty-state-icon">◎</div>
          <div className="empty-state-title">Select an element</div>
          <div className="empty-state-desc">Click "Pick Element" then click any element on the page</div>
        </div>
      )}

      {selectedElement && (
        <>
          <div className="card">
            <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--accent)' }}>i</span>
              Element Info
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Tag</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{selectedElement.tagName}</span>

              {selectedElement.id && <>
                <span style={{ color: 'var(--text-muted)' }}>ID</span>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>#{selectedElement.id}</span>
              </>}

              <span style={{ color: 'var(--text-muted)' }}>Classes</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                {selectedElement.classes?.length ? selectedElement.classes.join(' ') : '(none)'}
              </span>

              {selectedElement.text && <>
                <span style={{ color: 'var(--text-muted)' }}>Text</span>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedElement.text.slice(0, 100)}</span>
              </>}
            </div>
          </div>

          <div className="card">
            <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 13 }}>Selectors</div>
            {selectedElement.attributes && Object.entries(selectedElement.attributes as Record<string, string>).map(([key, val]: [string, string]) => (
              <div key={key} className="selector-row" style={{ animation: 'slideUp 0.2s ease both' }}>
                <span className="selector-strategy" data-strategy="attr">attr</span>
                <code style={{ color: 'var(--text)', flex: 1 }}>{`[${key}="${val}"]`}</code>
                <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(`[${key}="${val}"]`)}>
                  <Svg name="copy" size={11} />
                </button>
              </div>
            ))}
            <div className="selector-row">
              <span className="selector-strategy" data-strategy="tag">tag</span>
              <code style={{ color: 'var(--text)', flex: 1 }}>{selectedElement.tagName}</code>
              <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(selectedElement.tagName)}>
                <Svg name="copy" size={11} />
              </button>
            </div>
            {selectedElement.id && (
              <div className="selector-row">
                <span className="selector-strategy" data-strategy="id">id</span>
                <code style={{ color: 'var(--text)', flex: 1 }}>{`#${selectedElement.id}`}</code>
                <button className="btn btn-sm btn-ghost" onClick={() => navigator.clipboard.writeText(`#${selectedElement.id}`)}>
                  <Svg name="copy" size={11} />
                </button>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => onAddToModel(selectedElement)}
            style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}>
            <Svg name="plus" size={13} /> Add to Page Model
          </button>
        </>
      )}
    </div>
  );
}

/* ===== GENERATOR ===== */
function GeneratorPanel({ framework, onFrameworkChange, pageElements, codeOutput, onCodeChange, recordedSteps, testUrl }: any) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <select className="framework-select" value={framework} onChange={e => onFrameworkChange(e.target.value)}>
          <option value="playwright-ts">Playwright (TypeScript)</option>
          <option value="cypress-ts">Cypress (TypeScript)</option>
          <option value="selenium-python">Selenium (Python)</option>
        </select>

        <button className="btn btn-primary" onClick={() => {
          if (pageElements.length === 0 && recordedSteps.length === 0) {
            onCodeChange('// Pick elements or record steps first\n// Then click "Generate POM" to produce code');
            return;
          }
          const testObj = {
            id: 'generated', name: 'Recorded Test', url: testUrl || '', createdAt: Date.now(),
            steps: recordedSteps.map((s: any) => ({
              id: `step-${Date.now()}-${Math.random()}`,
              action: s.action, target: s.target || s.selector, value: s.value, assertion: s.assertion
            }))
          };
          onCodeChange(generateCombinedCode(framework as Framework, pageElements, testObj));
        }}>
          <Svg name="code" size={14} /> Generate POM
        </button>

        <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(codeOutput)}>
          <Svg name="clipboard" size={12} /> Copy
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto' }}>
          {pageElements.length} elements · {recordedSteps.length} steps
        </span>
      </div>
      <pre className="code-block">{codeOutput}</pre>
    </div>
  );
}

/* ===== RECORDER ===== */
function RecorderPanel({ isRecording, steps, onStart, onStop, onStepsChange }: any) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        {isRecording ? (
          <button className="btn btn-danger" onClick={onStop}>
            <Svg name="stop" size={14} /> Stop Recording
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onStart}>
            <Svg name="record" size={14} /> Start Recording
          </button>
        )}
        {isRecording && (
          <span className="badge badge-recording">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--error)', display: 'inline-block' }} />
            Recording...
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
          {steps.length} step{steps.length !== 1 ? 's' : ''} captured
        </span>
      </div>

      {steps.length === 0 && !isRecording && (
        <div className="empty-state">
          <div className="empty-state-icon">⏺</div>
          <div className="empty-state-title">No recordings</div>
          <div className="empty-state-desc">Start recording to capture test actions from the page</div>
        </div>
      )}

      {steps.length === 0 && isRecording && (
        <div className="empty-state" style={{ padding: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }}>
            Waiting for actions...
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {steps.map((step: any, i: number) => (
          <div key={i} className="step-row" style={{ animation: `slideUp 0.2s ease ${i * 0.03}s both` }}>
            <span style={{ color: 'var(--text-muted)', width: 20, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
            <span className="step-action" data-action={step.action}>{step.action}</span>
            <span className="step-target">{step.target}</span>
            {step.value && <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{step.value.slice(0, 30)}"</span>}
          </div>
        ))}
      </div>

      {steps.length > 0 && !isRecording && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onStepsChange(steps.slice(0, -1))}>
            <Svg name="back" size={12} /> Undo Last
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onStepsChange([])}>
            <Svg name="close" size={12} /> Clear All
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== PLAYER ===== */
function PlayerPanel({ steps, status, results, onPlay, onReset }: any) {
  const passedCount = results.filter((r: any) => r.passed).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        {status === 'idle' && (
          <button className="btn btn-primary" onClick={onPlay} disabled={steps.length === 0}
            style={steps.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            <Svg name="play" size={14} /> Play Test
          </button>
        )}
        {status === 'playing' && (
          <span className="badge badge-running">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            Running...
          </span>
        )}
        {status === 'done' && (
          <>
            <span className={`badge ${results.every((r: any) => r.passed) ? 'badge-passed' : 'badge-failed'}`}>
              {results.every((r: any) => r.passed) ? <><Svg name="check" size={12} /> Passed</> : <><Svg name="close" size={12} /> Failed</>}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={onPlay}><Svg name="play" size={12} /> Re-run</button>
          </>
        )}
        {status !== 'idle' && (
          <button className="btn btn-ghost btn-sm" onClick={onReset}><Svg name="close" size={12} /> Reset</button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
          {results.length > 0 ? `${passedCount}/${steps.length} passed` : `${steps.length} steps`}
        </span>
      </div>

      {/* Progress bar */}
      {results.length > 0 && (
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          {steps.map((_: any, i: number) => {
            const r = results.find((x: any) => x.stepIndex === i);
            const cls = r ? (r.passed ? 'passed' : 'failed') : 'pending';
            return <div key={i} className={`progress-segment ${cls}`} />;
          })}
        </div>
      )}

      {steps.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">▶</div>
          <div className="empty-state-title">No steps to play</div>
          <div className="empty-state-desc">Record some steps first, then play them back</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {steps.map((step: any, i: number) => {
          const result = results.find((r: any) => r.stepIndex === i);
          const state = status === 'playing' && !result ? 'running' : result ? (result.passed ? 'passed' : 'failed') : 'pending';
          return (
            <div key={i} className="step-row" style={{ animation: `slideUp 0.2s ease ${i * 0.03}s both` }}>
              <span className={`step-status ${state}`}>
                {state === 'passed' ? <Svg name="check" size={12} /> :
                 state === 'failed' ? <Svg name="close" size={12} /> :
                 state === 'running' ? '⟳' : `${i + 1}`}
              </span>
              <span className="step-action" data-action={step.action}>{step.action}</span>
              <span className="step-target">{step.target}</span>
              {result?.error && (
                <span style={{ color: 'var(--error)', fontSize: 11, fontFamily: 'var(--mono)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {result.error}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
