/**
 * TemplateListPage — admin page listing all scorecard templates.
 * Accessible from the admin nav.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Copy, Archive, Star, Globe, Trophy, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { loadTemplates, deleteTemplate, duplicateTemplate } from '../lib/db_scorecard.js';
import { StatEdgeIcon } from '../components/ui/StatEdgeLogo.jsx';
import './TemplateListPage.css';

export function TemplateListPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiveId, setArchiveId] = useState(null);
  const [duplicating, setDuplicating] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await loadTemplates();
      setTemplates(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleArchive(id) {
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    setArchiveId(null);
  }

  async function handleDuplicate(id, name) {
    setDuplicating(id);
    const copy = await duplicateTemplate(id, `${name} (copy)`);
    if (copy) {
      setTemplates(prev => [copy, ...prev]);
    }
    setDuplicating(null);
  }

  const scopeIcon = {
    global:     <Globe size={13} />,
    sport:      <Trophy size={13} />,
    age_group:  <Badge size={13} />,
    tournament: <Trophy size={13} />,
    fixture:    <Trophy size={13} />,
  };

  return (
    <div className="tl-page">
      {/* Header */}
      <header className="tl-header">
        <div className="tl-header-inner container">
          <Link to="/admin/dashboard" className="tl-back">
            <ChevronLeft size={18} />
            Dashboard
          </Link>
          <div className="tl-header-brand">
            <StatEdgeIcon size={28} />
          </div>
        </div>
      </header>

      <main className="container tl-main">
        <div className="tl-top">
          <div>
            <h1 className="tl-title">Scorecard Templates</h1>
            <p className="tl-subtitle">
              Create branded, reusable scorecards for your tournaments.
            </p>
          </div>
          <Button
            variant="accent"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => navigate('/admin/templates/new')}
          >
            New Template
          </Button>
        </div>

        {loading ? (
          <div className="tl-loading">
            <div className="tl-spinner" />
            <p>Loading templates…</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="tl-empty">
            <p>No custom templates yet.</p>
            <Button variant="accent" icon={<Plus size={16} />} onClick={() => navigate('/admin/templates/new')}>
              Create your first template
            </Button>
          </div>
        ) : (
          <div className="tl-grid">
            {templates.map(t => (
              <div key={t.id} className="tl-card">
                {/* Branding preview strip */}
                <div
                  className="tl-card-strip"
                  style={{
                    background: t.branding_config?.primaryColor || '#0D1C3E',
                    borderBottom: `3px solid ${t.branding_config?.secondaryColor || '#F47820'}`,
                  }}
                >
                  {t.branding_config?.logoUrl && (
                    <img src={t.branding_config.logoUrl} alt="" className="tl-card-logo" />
                  )}
                  <span className="tl-card-school">{t.branding_config?.schoolName || 'No school name'}</span>
                </div>

                <div className="tl-card-body">
                  <div className="tl-card-header">
                    <h3 className="tl-card-name">{t.name}</h3>
                    <div className="tl-card-badges">
                      {t.is_default && (
                        <Badge variant="warning" icon={<Star size={11} />}>Default</Badge>
                      )}
                      <Badge variant="default" icon={scopeIcon[t.scope_type]}>
                        {t.scope_type}
                      </Badge>
                      <Badge variant="default">{t.sport_code}</Badge>
                    </div>
                  </div>

                  {t.description && (
                    <p className="tl-card-desc">{t.description}</p>
                  )}

                  <div className="tl-card-layout">
                    <span className="tl-card-meta">
                      {t.layout_config?.showQuarterBreakdown !== false ? '✓ Quarters' : '✗ Quarters'}
                    </span>
                    <span className="tl-card-meta">
                      {t.layout_config?.showNotes !== false ? '✓ Notes' : '✗ Notes'}
                    </span>
                    <span className="tl-card-meta">
                      {t.layout_config?.density === 'compact' ? 'Compact' : 'Comfortable'}
                    </span>
                  </div>
                </div>

                <div className="tl-card-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 size={14} />}
                    onClick={() => navigate(`/admin/templates/${t.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy size={14} />}
                    loading={duplicating === t.id}
                    onClick={() => handleDuplicate(t.id, t.name)}
                  >
                    Duplicate
                  </Button>
                  {!t.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Archive size={14} />}
                      onClick={() => setArchiveId(t.id)}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(archiveId)}
        title="Archive Template?"
        message="Archived templates won't appear in the template selector. Existing scorecards using this template are not affected."
        confirmLabel="Archive"
        confirmVariant="secondary"
        onConfirm={() => handleArchive(archiveId)}
        onCancel={() => setArchiveId(null)}
      />
    </div>
  );
}
