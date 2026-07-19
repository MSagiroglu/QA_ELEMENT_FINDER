import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getSettings, saveSettings } from '../shared/storage';
import type { Framework } from '../shared/types';

const containerStyle: React.CSSProperties = {
  maxWidth: 600, margin: '32px auto', padding: 24,
  fontFamily: 'Inter, sans-serif', background: '#1A2332', color: '#E5E7E6', borderRadius: 8
};

const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState({
    framework: 'playwright-ts' as Framework,
    timeout: 5000,
    debounceMs: 300,
    failMode: 'stop' as 'stop' | 'continue',
    maskPasswords: true,
    indentSpaces: 2,
  });

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(prev => ({ ...prev, ...s }));
    }).catch(() => {
      chrome.storage.local.get('settings', (result) => {
        if (result.settings) setSettings(prev => ({ ...prev, ...result.settings }));
      });
    });
  }, []);

  const save = async () => {
    try {
      await saveSettings(settings);
    } catch {
      chrome.storage.local.set({ settings });
    }
    const el = document.getElementById('saved-msg');
    if (el) { el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 2000); }
  };

  const exportData = () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'qa-finder-export.json'; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          chrome.storage.local.clear(() => {
            chrome.storage.local.set(data, () => alert('Data imported successfully'));
          });
        } catch { alert('Invalid JSON file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearData = () => {
    if (confirm('Are you sure? All recorded tests and page models will be deleted.')) {
      chrome.storage.local.clear();
      alert('All data cleared');
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#4A90D9', marginBottom: 24 }}>⚙ QA Element Finder Settings</h2>

      <Section title="Export Settings">
        <Field label="Default Framework">
          <select value={settings.framework} onChange={e => setSettings(s => ({ ...s, framework: e.target.value as Framework }))} style={inputStyle}>
            <option value="playwright-ts">Playwright (TypeScript)</option>
            <option value="cypress-ts">Cypress (TypeScript)</option>
            <option value="selenium-python">Selenium (Python)</option>
          </select>
        </Field>
        <Field label="Indentation">
          <select value={settings.indentSpaces} onChange={e => setSettings(s => ({ ...s, indentSpaces: Number(e.target.value) }))} style={inputStyle}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </Field>
      </Section>

      <Section title="Recording">
        <Field label="Debounce Delay (ms)">
          <input type="range" min={100} max={1000} step={50} value={settings.debounceMs}
            onChange={e => setSettings(s => ({ ...s, debounceMs: Number(e.target.value) }))} style={{ width: '100%' }} />
          <span style={{ marginLeft: 8, color: '#9CA3AF' }}>{settings.debounceMs}ms</span>
        </Field>
        <Field label="Mask Password Fields">
          <input type="checkbox" checked={settings.maskPasswords}
            onChange={e => setSettings(s => ({ ...s, maskPasswords: e.target.checked }))} />
        </Field>
      </Section>

      <Section title="Playback">
        <Field label="Timeout (ms)">
          <input type="number" value={settings.timeout} onChange={e => setSettings(s => ({ ...s, timeout: Number(e.target.value) }))} style={inputStyle} />
        </Field>
        <Field label="On Failure">
          <select value={settings.failMode} onChange={e => setSettings(s => ({ ...s, failMode: e.target.value as 'stop' | 'continue' }))} style={inputStyle}>
            <option value="stop">Stop test</option>
            <option value="continue">Continue test</option>
          </select>
        </Field>
      </Section>

      <Section title="Data Management">
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={exportData} style={btnStyle}>📤 Export All Data</button>
          <button onClick={importData} style={btnStyle}>📥 Import Data</button>
          <button onClick={clearData} style={{ ...btnStyle, background: '#EF4444' }}>🗑 Clear All</button>
        </div>
      </Section>

      <button onClick={save} style={{ ...btnStyle, background: '#4A90D9', width: '100%', marginTop: 16 }}>Save Settings</button>
      <div id="saved-msg" style={{ display: 'none', color: '#22C55E', textAlign: 'center', marginTop: 8 }}>✓ Settings saved</div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, padding: 16, background: '#243044', borderRadius: 6, border: '1px solid #3A4A62' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF', marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <label style={{ minWidth: 140, fontSize: 13, color: '#E5E7E6' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', background: '#1A2332', border: '1px solid #3A4A62', borderRadius: 4,
  color: '#E5E7E6', fontSize: 13, width: '100%'
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2D3B52', color: '#E5E7E6', border: '1px solid #3A4A62',
  borderRadius: 4, cursor: 'pointer', fontSize: 13
};

createRoot(document.getElementById('root')!).render(<OptionsApp />);
