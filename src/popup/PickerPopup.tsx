import React, { useState, useEffect, useCallback } from 'react';
import { getTests, saveTest, getSettings as loadSettings, saveSettings } from '../shared/storage';

type AppView = 'main' | 'testList' | 'settings';

const theme = {
  bg: '#0C111D',
  surface: '#131B2E',
  elevated: '#1C2742',
  border: '#273152',
  accent: '#3B82F6',
  accentGlow: '#2563EB',
  cyan: '#06B6D4',
  text: '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  radius: 10,
  radiusSm: 6,
};

const s = (obj: Record<string, any>): React.CSSProperties => obj as React.CSSProperties;

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    pick: 'M15 15l-4 4m0 0l-4-4m4 4V7a4 4 0 00-4-4H4m12 12l4-4m-4 4v5a4 4 0 01-4 4H8',
    record: 'M3 12a9 9 0 1118 0 9 9 0 01-18 0zm7-3l6 3-6 3V9z',
    stop: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    play: 'M3 12a9 9 0 1118 0 9 9 0 01-18 0zm7-3l6 3-6 3V9z',
    gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zm0 0l.01.01M9.17 4.83l.5 2.04a7.02 7.02 0 00-1.65 1.17l-2.04-.5-.7 1.21 1.6 1.4a7.03 7.03 0 000 1.7l-1.6 1.4.7 1.21 2.04-.5a7.02 7.02 0 001.17 1.65l-.5 2.04 1.21.7 1.4-1.6a7.03 7.03 0 001.7 0l1.4 1.6 1.21-.7-.5-2.04a7.02 7.02 0 001.17-1.65l2.04.5.7-1.21-1.6-1.4a7.03 7.03 0 000-1.7l1.6-1.4-.7-1.21-2.04.5a7.02 7.02 0 00-1.17-1.65l.5-2.04-1.21-.7-1.4 1.6a7.03 7.03 0 00-1.7 0l-1.4-1.6-1.21.7z',
    arrowLeft: 'M19 12H5m7-7l-7 7 7 7',
    clipboard: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3',
  };
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { flexShrink: 0 }
  }, React.createElement('path', { d: paths[name] || paths.pick }));
}

function PulseDot({ active }: { active: boolean }) {
  return React.createElement('span', {
    style: {
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: active ? theme.error : theme.textMuted,
      animation: active ? 'pulse 1.2s ease-in-out infinite' : 'none',
    }
  });
}

export const PickerPopup: React.FC = () => {
  const [view, setView] = useState<AppView>('main');
  const [isRecording, setIsRecording] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [tabCount, setTabCount] = useState(1);
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      if (msg.type === 'RECORD_START') { setIsRecording(true); setStepCount(0); setTabCount(1); }
      else if (msg.type === 'RECORD_STOP') { setIsRecording(false); setTabCount(0); }
      else if (msg.type === 'RECORD_STEP') { setStepCount(msg.payload.stepCount); }
    };

    // Track tab count from background
    const tabUpdateInterval = setInterval(() => {
      if (isRecording) {
        chrome.runtime.sendMessage({ type: 'GET_RECORDING_TABS' }, (res: any) => {
          if (res?.count) setTabCount(res.count);
        });
      }
    }, 2000);

    chrome.runtime.onMessage.addListener(handleMessage);
    loadRecentTests();
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(tabUpdateInterval);
    };
  }, [isRecording]);

  async function loadRecentTests() {
    try { const tests = await getTests(); if (tests) setRecentTests(tests.slice(-5).reverse()); } catch { }
  }

  const activatePicker = useCallback(() => {
    setPicking(true);
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_PICKER' });
      setTimeout(() => window.close(), 300);
    });
  }, []);

  const toggleRecording = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;
      if (isRecording) {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' }, async (res) => {
          if (res?.success && res.data) {
            const test = { id: Date.now().toString(), name: `Test ${new Date().toLocaleTimeString()}`, url: res.data.url, steps: res.data.steps, createdAt: Date.now() };
            try { await saveTest(test); } catch { chrome.storage.local.set({ tests: [test] }); }
            loadRecentTests();
          }
        });
      } else {
        chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
      }
    });
  }, [isRecording]);

  const openDevTools = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'OPEN_DEVTOOLS' });
    });
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const cardAnim = (i: number) => s({ animation: `slideUp 0.3s ease ${i * 0.06}s both` });

  return (
    <div style={s({
      width: 320, minHeight: 480, fontFamily: 'Inter, -apple-system, sans-serif',
      background: `linear-gradient(160deg, ${theme.bg} 0%, #0F1729 100%)`,
      color: theme.text, display: 'flex', flexDirection: 'column',
    })}>
      {/* Header */}
      <div style={s({
        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.border}`, background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.elevated} 100%)`,
      })}>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 10 })}>
          <div style={s({
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.cyan})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: `0 2px 8px rgba(59,130,246,0.3)`,
          })}>Q</div>
          <span style={s({ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' })}>QA Finder</span>
        </div>
        <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
          <div style={s({
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)',
            color: isRecording ? theme.error : theme.textMuted,
            fontSize: 11, fontWeight: 600, border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
          })}>
            <PulseDot active={isRecording} />
            {isRecording ? `REC ${stepCount}` : 'IDLE'}
          {isRecording && tabCount > 1 && <span style={s({fontSize:9,opacity:0.7})}>+{tabCount-1}</span>}
          </div>
        </div>
      </div>

      {view === 'main' && (
        <div style={s({ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 })}>
          {/* Action Cards */}
          <div style={s({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 })}>
            <ActionCard
              icon="pick" label="Pick Element" shortcut="⌘P"
              gradient="linear-gradient(135deg, #3B82F6, #2563EB)"
              onClick={activatePicker}
              style={cardAnim(0)}
            />
            <ActionCard
              icon={isRecording ? 'stop' : 'record'}
              label={isRecording ? 'Stop Record' : 'Record'}
              shortcut={isRecording ? `(${stepCount})` : '⌘R'}
              gradient={isRecording ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #10B981, #059669)'}
              onClick={toggleRecording}
              style={cardAnim(1)}
            />
          </div>

          {/* DevTools Button */}
          <button onClick={openDevTools} style={s({
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px', borderRadius: theme.radiusSm,
            background: `linear-gradient(135deg, ${theme.elevated}, ${theme.surface})`,
            border: `1px solid ${theme.border}`, color: theme.textSecondary,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.2s ease',
          })}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
          >
            <Icon name="play" size={14} /> Open DevTools Panel
          </button>

          {/* Recent Tests */}
          <div style={s({ flex: 1 })}>
            <div style={s({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 4px 4px', fontSize: 11, fontWeight: 600, color: theme.textMuted,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            })}>
              <span>Recent Tests</span>
              {recentTests.length > 0 && <span style={s({ color: theme.accent, cursor: 'pointer', fontSize: 11, fontWeight: 500, textTransform: 'none' })}
                onClick={() => setView('testList')}>View all →</span>}
            </div>
            <div style={s({ display: 'flex', flexDirection: 'column', gap: 4 })}>
              {recentTests.length === 0 && (
                <div style={s({
                  textAlign: 'center', padding: '24px 16px', color: theme.textMuted, fontSize: 12,
                  background: theme.surface, borderRadius: theme.radiusSm, border: `1px dashed ${theme.border}`,
                })}>
                  <div style={s({ fontSize: 24, marginBottom: 6, opacity: 0.5 })}>⏺</div>
                  <div>No tests yet</div>
                  <div style={s({ fontSize: 11, color: theme.textMuted, marginTop: 2 })}>Start recording to create your first test</div>
                </div>
              )}
              {recentTests.map((test: any, i: number) => (
                <div key={test.id} style={s({
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: theme.radiusSm,
                  background: theme.surface, border: `1px solid ${theme.border}`,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  animation: `slideUp 0.25s ease ${i * 0.05}s both`,
                })}
                  onMouseEnter={e => { e.currentTarget.style.background = theme.elevated; e.currentTarget.style.borderColor = theme.accent + '40'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.borderColor = theme.border; }}
                  onClick={() => chrome.storage.local.set({ selectedTestId: test.id })}
                >
                  <div style={s({ display: 'flex', flexDirection: 'column', gap: 1 })}>
                    <span style={s({ fontSize: 12, fontWeight: 500, color: theme.text })}>{test.name}</span>
                    <span style={s({ fontSize: 11, color: theme.textMuted })}>{test.steps?.length || 0} steps</span>
                  </div>
                  <span style={s({
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: `${theme.accent}15`, color: theme.accent, fontWeight: 500,
                  })}>{test.steps?.length || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={s({
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 4px 0', borderTop: `1px solid ${theme.border}`,
          })}>
            <div style={s({ display: 'flex', gap: 2 })}>
              {['#3B82F6', '#10B981', '#F59E0B', '#EF4444'].map(c => (
                <div key={c} style={s({ width: 6, height: 6, borderRadius: '50%', background: c })} />
              ))}
            </div>
            <button onClick={() => setView('settings')} style={s({
              background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
              borderRadius: 4, transition: 'all 0.15s ease',
            })}
              onMouseEnter={e => { e.currentTarget.style.background = theme.surface; e.currentTarget.style.color = theme.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.textMuted; }}
            ><Icon name="gear" size={13} /> Settings</button>
          </div>
        </div>
      )}

      {view === 'settings' && <SettingsView onBack={() => setView('main')} />}
      {view === 'testList' && <TestListView onBack={() => { setView('main'); loadRecentTests(); }} />}
    </div>
  );
};

function ActionCard({ icon, label, shortcut, gradient, onClick, style: extraStyle }: {
  icon: string; label: string; shortcut?: string; gradient: string; onClick: () => void; style?: React.CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  return React.createElement('div', {
    style: s({
      ...extraStyle,
      padding: '14px 12px', borderRadius: theme.radius, cursor: 'pointer',
      background: theme.surface, border: `1px solid ${theme.border}`,
      transition: 'all 0.2s ease',
      transform: hover ? 'translateY(-1px)' : 'none',
      boxShadow: hover ? `0 4px 20px rgba(0,0,0,0.2)` : 'none',
    }),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick,
  }, [
    React.createElement('div', {
      key: 'icon',
      style: s({
        width: 36, height: 36, borderRadius: 10,
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, boxShadow: `0 2px 10px ${gradient.includes('EF4444') ? 'rgba(239,68,68,0.3)' : gradient.includes('10B981') ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
      })
    }, React.createElement('div', { style: s({ color: '#fff', fontSize: 16, lineHeight: 1 }) }, 
      icon === 'pick' ? '◎' : icon === 'record' ? '▶' : icon === 'stop' ? '■' : '●'
    )),
    React.createElement('div', { key: 'label', style: s({ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 2 }) }, label),
    shortcut ? React.createElement('div', { key: 'shortcut', style: s({ fontSize: 10, color: theme.textMuted }) }, shortcut) : null,
  ]);
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const [framework, setFramework] = useState('playwright-ts');
  const [timeout, setTimeout_] = useState(5000);

  useEffect(() => {
    loadSettings().then(s => { setFramework(s.framework || 'playwright-ts'); setTimeout_(s.timeout || 5000); }).catch(() => {
      chrome.storage.local.get('settings', (r) => { if (r.settings) { setFramework(r.settings.framework || 'playwright-ts'); setTimeout_(r.settings.timeout || 5000); } });
    });
  }, []);

  const save = async () => {
    try { await saveSettings({ framework: framework as any, timeout }); } catch { chrome.storage.local.set({ settings: { framework, timeout } }); }
    onBack();
  };

  return (
    <div style={s({ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 })}>
      <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
        <button onClick={onBack} style={s({ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: 4, display: 'flex' })}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <span style={s({ fontWeight: 600, fontSize: 14 })}>Settings</span>
      </div>

      <div style={s({ background: theme.surface, borderRadius: theme.radius, padding: 14, border: `1px solid ${theme.border}` })}>
        <Field label="Export Framework">
          <select value={framework} onChange={e => setFramework(e.target.value)} style={s(selectStyle)}>
            <option value="playwright-ts">Playwright (TypeScript)</option>
            <option value="cypress-ts">Cypress (TypeScript)</option>
            <option value="selenium-python">Selenium (Python)</option>
            <option value="selenium-java">Selenium (Java/JUnit5)</option>
            <option value="cucumber-java">Cucumber (Java/Selenium)</option>
          </select>
        </Field>
        <Field label="Timeout (ms)">
          <input type="number" value={timeout} onChange={e => setTimeout_(Number(e.target.value))} style={s(selectStyle)} />
        </Field>
      </div>

      <button onClick={save} style={s({
        padding: '10px', borderRadius: theme.radiusSm, border: 'none',
        background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentGlow})`,
        color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        transition: 'all 0.15s ease', boxShadow: `0 2px 8px rgba(59,130,246,0.3)`,
      })}>Save Settings</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return React.createElement('div', { style: s({ marginBottom: 10 }) }, [
    React.createElement('label', { key: 'l', style: s({ display: 'block', fontSize: 11, fontWeight: 500, color: theme.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }) }, label),
    children,
  ]);
}

const selectStyle = {
  width: '100%', padding: '7px 10px', borderRadius: theme.radiusSm,
  background: theme.bg, border: `1px solid ${theme.border}`,
  color: theme.text, fontSize: 12, outline: 'none',
  transition: 'border-color 0.15s ease',
};

function TestListView({ onBack }: { onBack: () => void }) {
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    getTests().then(setTests).catch(() => { chrome.storage.local.get('tests', (r) => { if (r.tests) setTests(r.tests); }); });
  }, []);

  return (
    <div style={s({ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 })}>
      <div style={s({ display: 'flex', alignItems: 'center', gap: 8 })}>
        <button onClick={onBack} style={s({ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: 4, display: 'flex' })}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <span style={s({ fontWeight: 600, fontSize: 14 })}>Tests</span>
        <span style={s({ fontSize: 11, color: theme.textMuted })}>({tests.length})</span>
      </div>

      {tests.length === 0 && (
        <div style={s({ textAlign: 'center', padding: 32, color: theme.textMuted, fontSize: 12 })}>
          No saved tests
        </div>
      )}

      <div style={s({ display: 'flex', flexDirection: 'column', gap: 4 })}>
        {tests.map((test: any, i: number) => (
          <div key={test.id} style={s({
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: theme.radiusSm,
            background: theme.surface, border: `1px solid ${theme.border}`,
            animation: `slideUp 0.25s ease ${i * 0.04}s both`,
          })}>
            <div style={s({ display: 'flex', flexDirection: 'column', gap: 1 })}>
              <span style={s({ fontSize: 12, fontWeight: 500 })}>{test.name}</span>
              <span style={s({ fontSize: 11, color: theme.textMuted })}>{test.steps?.length || 0} steps | {test.url?.slice(0, 40)}</span>
            </div>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(test, null, 2))} style={s({
              background: theme.elevated, border: `1px solid ${theme.border}`, borderRadius: 6,
              padding: '5px 8px', color: theme.textSecondary, cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s ease',
            })}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textSecondary; }}
            ><Icon name="clipboard" size={12} /> Export</button>
          </div>
        ))}
      </div>
    </div>
  );
}
