/**
 * TemplateBuilderPage — config-driven scorecard template editor.
 *
 * Layout:
 *  - Left panel: settings categories (Branding, Layout, Fields)
 *  - Right panel: live preview of the scorecard
 *  - Top bar: save, duplicate, preview toggle
 *
 * Does NOT require drag-and-drop. Field ordering via up/down buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Save, Eye, Palette, Layout, List,
  ChevronUp, ChevronDown, Plus, Minus, Check, Star,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { FormField, Input, Select } from '../components/ui/FormField.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { loadTemplate, upsertTemplate } from '../lib/db_scorecard.js';
import {
  DEFAULT_BRANDING, DEFAULT_LAYOUT, DEFAULT_FIELDS,
  FIELD_LABELS,
} from '../lib/scorecard.js';
import { AGE_GROUPS } from '../lib/types.js';
import { generateId } from '../lib/utils.js';
import './TemplateBuilderPage.css';

const SCOPE_OPTIONS = [
  { value: 'global',     label: 'Global (all tournaments)' },
  { value: 'sport',      label: 'Sport-specific' },
  { value: 'age_group',  label: 'Age Group' },
  { value: 'tournament', label: 'Tournament-specific' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable (more space)' },
  { value: 'compact',     label: 'Compact (tighter layout)' },
];

const CONTROLS_STYLE_OPTIONS = [
  { value: 'large_buttons', label: 'Large buttons (tablet)' },
  { value: 'compact',       label: 'Compact buttons' },
];

const HEADER_STYLE_OPTIONS = [
  { value: 'branded', label: 'Branded (school logo + name)' },
  { value: 'minimal', label: 'Minimal (tournament name only)' },
];

const NAV_TABS = [
  { id: 'branding', label: 'Branding', icon: <Palette size={16} /> },
  { id: 'layout',   label: 'Layout',   icon: <Layout size={16} /> },
  { id: 'fields',   label: 'Fields',   icon: <List size={16} /> },
];

function emptyTemplate() {
  return {
    name: 'New Scorecard Template',
    description: '',
    scope_type: 'global',
    scope_id: null,
    sport_code: 'netball',
    age_group: null,
    is_default: false,
    is_active: true,
    branding_config: { ...DEFAULT_BRANDING },
    layout_config:   { ...DEFAULT_LAYOUT },
    field_config:    DEFAULT_FIELDS.map(f => ({ ...f })),
  };
}

export function TemplateBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [template, setTemplate] = useState(emptyTemplate());
  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError]       = useState('');

  // Load existing template
  useEffect(() => {
    if (isNew) return;
    async function load() {
      setLoading(true);
      const data = await loadTemplate(id);
      if (data) {
        setTemplate({
          ...emptyTemplate(),
          ...data,
          branding_config: { ...DEFAULT_BRANDING, ...data.branding_config },
          layout_config:   { ...DEFAULT_LAYOUT,   ...data.layout_config },
          field_config:    data.field_config?.length ? data.field_config : DEFAULT_FIELDS.map(f => ({ ...f })),
        });
      }
      setLoading(false);
    }
    load();
  }, [id, isNew]);

  // ── Patch helpers ───────────────────────────────────────────────────────────

  const patchBranding = useCallback((key, value) =>
    setTemplate(t => ({ ...t, branding_config: { ...t.branding_config, [key]: value } })),
  []);

  const patchLayout = useCallback((key, value) =>
    setTemplate(t => ({ ...t, layout_config: { ...t.layout_config, [key]: value } })),
  []);

  const patchField = useCallback((key, fieldKey, value) =>
    setTemplate(t => ({
      ...t,
      field_config: t.field_config.map(f => f.key === key ? { ...f, [fieldKey]: value } : f),
    })),
  []);

  function moveField(key, direction) {
    setTemplate(t => {
      const fields = [...t.field_config].sort((a, b) => a.order - b.order);
      const idx = fields.findIndex(f => f.key === key);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= fields.length) return t;
      [fields[idx].order, fields[swapIdx].order] = [fields[swapIdx].order, fields[idx].order];
      return { ...t, field_config: fields };
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!template.name.trim()) {
      setError('Template name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const row = {
      ...template,
      id: isNew ? undefined : id,
    };

    const result = await upsertTemplate(row);
    setSaving(false);

    if (result) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isNew) navigate(`/admin/templates/${result.id}`, { replace: true });
    } else {
      setError('Failed to save. Check your connection and try again.');
    }
  }

  // ── Contrast helper ─────────────────────────────────────────────────────────

  function contrastWarning(hexColor) {
    if (!hexColor || !hexColor.startsWith('#')) return false;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Simple luminance check
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.8 || lum < 0.05; // Too light or too dark warning
  }

  const sortedFields = [...template.field_config].sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="tb-page tb-page--loading">
        <div className="tb-spinner" />
        <p>Loading template…</p>
      </div>
    );
  }

  return (
    <div className="tb-page">
      {/* Top bar */}
      <header className="tb-topbar">
        <div className="tb-topbar-inner container">
          <div className="tb-topbar-left">
            <Link to="/admin/templates" className="tb-back">
              <ChevronLeft size={18} />
              Templates
            </Link>
          </div>

          <div className="tb-topbar-center">
            <input
              className="tb-name-input"
              value={template.name}
              onChange={e => setTemplate(t => ({ ...t, name: e.target.value }))}
              placeholder="Template name"
              aria-label="Template name"
            />
          </div>

          <div className="tb-topbar-right">
            <Button
              variant="ghost"
              size="sm"
              icon={<Eye size={15} />}
              onClick={() => setShowPreview(p => !p)}
            >
              {showPreview ? 'Hide' : 'Preview'}
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={saved ? <Check size={15} /> : <Save size={15} />}
              loading={saving}
              onClick={handleSave}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="tb-error container">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="tb-body">
        {/* ── Settings panel ─────────────────────────────────────── */}
        <aside className={`tb-settings ${showPreview ? 'tb-settings--hidden' : ''}`}>
          {/* Tab nav */}
          <nav className="tb-tabs">
            {NAV_TABS.map(tab => (
              <button
                key={tab.id}
                className={`tb-tab ${activeTab === tab.id ? 'tb-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tb-settings-body">
            {/* ── Branding ─────────────────────────────────────────── */}
            {activeTab === 'branding' && (
              <div className="tb-section">
                <h3 className="tb-section-title">School Branding</h3>

                <FormField label="School Name">
                  <Input
                    value={template.branding_config.schoolName}
                    onChange={e => patchBranding('schoolName', e.target.value)}
                    placeholder="e.g. Pretoria Girls High"
                  />
                </FormField>

                <FormField label="Logo URL">
                  <Input
                    type="url"
                    value={template.branding_config.logoUrl}
                    onChange={e => patchBranding('logoUrl', e.target.value)}
                    placeholder="https://…"
                  />
                  <p className="tb-field-hint">Upload logo to an image host and paste the URL.</p>
                </FormField>

                <div className="tb-color-grid">
                  <ColorField
                    label="Primary Colour"
                    value={template.branding_config.primaryColor}
                    onChange={v => patchBranding('primaryColor', v)}
                    warn={contrastWarning(template.branding_config.primaryColor)}
                  />
                  <ColorField
                    label="Secondary Colour"
                    value={template.branding_config.secondaryColor}
                    onChange={v => patchBranding('secondaryColor', v)}
                  />
                  <ColorField
                    label="Accent Colour"
                    value={template.branding_config.accentColor}
                    onChange={v => patchBranding('accentColor', v)}
                  />
                </div>

                <FormField label="Header Text (optional)">
                  <Input
                    value={template.branding_config.headerText}
                    onChange={e => patchBranding('headerText', e.target.value)}
                    placeholder="e.g. Hosted by Agon Sports"
                  />
                </FormField>

                <FormField label="Footer Text (optional)">
                  <Input
                    value={template.branding_config.footerText}
                    onChange={e => patchBranding('footerText', e.target.value)}
                    placeholder="e.g. Official scorecard of the tournament"
                  />
                </FormField>

                <FormField label="Sponsor Logo URL (optional)">
                  <Input
                    type="url"
                    value={template.branding_config.sponsorLogoUrl}
                    onChange={e => patchBranding('sponsorLogoUrl', e.target.value)}
                    placeholder="https://…"
                  />
                </FormField>

                <h3 className="tb-section-title" style={{ marginTop: 'var(--space-6)' }}>Template Scope</h3>

                <FormField label="Scope">
                  <Select
                    value={template.scope_type}
                    onChange={e => setTemplate(t => ({ ...t, scope_type: e.target.value, scope_id: null }))}
                    options={SCOPE_OPTIONS}
                  />
                  <p className="tb-field-hint">
                    Controls which fixtures use this template. More specific scopes take precedence.
                  </p>
                </FormField>

                {template.scope_type === 'age_group' && (
                  <FormField label="Age Group">
                    <Select
                      value={template.age_group || ''}
                      onChange={e => setTemplate(t => ({ ...t, age_group: e.target.value || null }))}
                      options={[{ value: '', label: 'Any' }, ...AGE_GROUPS.map(g => ({ value: g, label: g }))]}
                    />
                  </FormField>
                )}

                {template.scope_type === 'tournament' && (
                  <FormField label="Tournament ID">
                    <Input
                      value={template.scope_id || ''}
                      onChange={e => setTemplate(t => ({ ...t, scope_id: e.target.value || null }))}
                      placeholder="Paste tournament ID"
                    />
                    <p className="tb-field-hint">Find the tournament ID in the admin dashboard URL.</p>
                  </FormField>
                )}

                <div className="tb-toggle-row">
                  <label className="tb-toggle-label">
                    <input
                      type="checkbox"
                      checked={template.is_default}
                      onChange={e => setTemplate(t => ({ ...t, is_default: e.target.checked }))}
                    />
                    <Star size={14} />
                    Set as default template
                  </label>
                </div>
              </div>
            )}

            {/* ── Layout ──────────────────────────────────────────── */}
            {activeTab === 'layout' && (
              <div className="tb-section">
                <h3 className="tb-section-title">Layout Options</h3>

                <FormField label="Density">
                  <Select
                    value={template.layout_config.density}
                    onChange={e => patchLayout('density', e.target.value)}
                    options={DENSITY_OPTIONS}
                  />
                </FormField>

                <FormField label="Score Controls Style">
                  <Select
                    value={template.layout_config.scoreControlsStyle}
                    onChange={e => patchLayout('scoreControlsStyle', e.target.value)}
                    options={CONTROLS_STYLE_OPTIONS}
                  />
                </FormField>

                <FormField label="Header Style">
                  <Select
                    value={template.layout_config.headerStyle}
                    onChange={e => patchLayout('headerStyle', e.target.value)}
                    options={HEADER_STYLE_OPTIONS}
                  />
                </FormField>

                <div className="tb-toggles">
                  {[
                    { key: 'showQuarterBreakdown', label: 'Show Quarter Breakdown' },
                    { key: 'showNotes',            label: 'Show Notes Section' },
                    { key: 'showOfficials',        label: 'Show Officials Fields' },
                  ].map(({ key, label }) => (
                    <ToggleRow
                      key={key}
                      label={label}
                      checked={template.layout_config[key] !== false}
                      onChange={v => patchLayout(key, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Fields ──────────────────────────────────────────── */}
            {activeTab === 'fields' && (
              <div className="tb-section">
                <h3 className="tb-section-title">Visible Fields</h3>
                <p className="tb-section-desc">
                  Toggle which fields appear on the scorecard and reorder them.
                </p>

                <div className="tb-field-list">
                  {sortedFields.map((field, idx) => (
                    <div key={field.key} className={`tb-field-row ${field.visible ? '' : 'tb-field-row--hidden'}`}>
                      <div className="tb-field-order">
                        <button
                          type="button"
                          className="tb-order-btn"
                          onClick={() => moveField(field.key, 'up')}
                          disabled={idx === 0}
                          aria-label={`Move ${FIELD_LABELS[field.key]} up`}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="tb-order-btn"
                          onClick={() => moveField(field.key, 'down')}
                          disabled={idx === sortedFields.length - 1}
                          aria-label={`Move ${FIELD_LABELS[field.key]} down`}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <label className="tb-field-toggle">
                        <input
                          type="checkbox"
                          checked={field.visible}
                          onChange={e => patchField(field.key, 'visible', e.target.checked)}
                        />
                        <span className="tb-field-toggle-name">
                          {FIELD_LABELS[field.key] || field.key}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Live preview ─────────────────────────────────────────── */}
        <div className={`tb-preview ${showPreview ? 'tb-preview--visible' : ''}`}>
          <div className="tb-preview-inner">
            <h3 className="tb-preview-label">Preview — Tablet view</h3>
            <div className="tb-preview-tablet">
              <ScorecardPreview template={template} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ColorField({ label, value, onChange, warn }) {
  return (
    <div className="tb-color-field">
      <label className="tb-color-label">{label}</label>
      <div className="tb-color-row">
        <input
          type="color"
          className="tb-color-input"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
        />
        <input
          type="text"
          className="tb-color-text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
        />
      </div>
      {warn && (
        <p className="tb-color-warn">
          <AlertTriangle size={12} /> Low contrast — text may be hard to read.
        </p>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="tb-toggle-label">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ScorecardPreview({ template }) {
  const b = template.branding_config || {};
  const l = template.layout_config || {};

  return (
    <div className="sc-preview" style={{ '--sc-primary': b.primaryColor || '#0D1C3E', '--sc-secondary': b.secondaryColor || '#F47820' }}>
      {/* Mock header */}
      <div className="sc-preview-header" style={{ background: b.primaryColor || '#0D1C3E' }}>
        {b.logoUrl && <img src={b.logoUrl} alt="" className="sc-preview-logo" />}
        <div>
          <div className="sc-preview-school">{b.schoolName || 'School Name'}</div>
          <div className="sc-preview-tournament">National Netball Tournament · Round 3</div>
        </div>
      </div>

      {/* Score */}
      <div className="sc-preview-score">
        <div className="sc-preview-team">
          <div className="sc-preview-team-name">Home Team</div>
          <div className="sc-preview-num" style={{ color: b.secondaryColor || '#F47820' }}>12</div>
          <div className="sc-preview-btn" style={{ background: b.secondaryColor || '#F47820' }}>+ Goal</div>
        </div>
        <div className="sc-preview-vs">vs</div>
        <div className="sc-preview-team">
          <div className="sc-preview-team-name">Away Team</div>
          <div className="sc-preview-num" style={{ color: b.secondaryColor || '#F47820' }}>9</div>
          <div className="sc-preview-btn" style={{ background: b.secondaryColor || '#F47820' }}>+ Goal</div>
        </div>
      </div>

      {/* Quarters */}
      {l.showQuarterBreakdown !== false && (
        <div className="sc-preview-quarters">
          {['Q1','Q2','Q3','Q4'].map((q, i) => (
            <div key={q} className={`sc-preview-q ${i === 2 ? 'sc-preview-q--active' : ''}`}
              style={i === 2 ? { borderColor: b.secondaryColor || '#F47820' } : {}}>
              <div className="sc-preview-q-label">{q}</div>
              <div className="sc-preview-q-score">{i < 2 ? '3–2' : i === 2 ? '●' : '—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {b.footerText && (
        <div className="sc-preview-footer">{b.footerText}</div>
      )}
    </div>
  );
}
