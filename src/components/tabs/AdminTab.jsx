import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings, Users, Database, Shield, Plus, Trash2, Edit2,
  Download, Upload, Printer, RefreshCw, Lock, Unlock,
  RotateCcw, Tag, Recycle, ClipboardList, Key, ExternalLink,
  X, Copy
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth.js';
import { Button } from '../ui/Button.jsx';
import { FormField, Input, Select } from '../ui/FormField.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { Badge } from '../ui/Badge.jsx';
import { downloadJSON, hashPin, parseCSV, generateId } from '../../lib/utils.js';
import { AGE_GROUPS, SA_PROVINCES } from '../../lib/types.js';
import './AdminTab.css';

export function AdminTab({ tournament, dispatch, toast }) {
  const auth = useAdminAuth(tournament);

  if (!auth.authed) {
    return <PinGate auth={auth} />;
  }

  return (
    <div className="admin-tab">
      <div className="container">
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-content">
            <TournamentSettings tournament={tournament} dispatch={dispatch} toast={toast} />
            <TeamManager tournament={tournament} dispatch={dispatch} toast={toast} />
            <PoolManager tournament={tournament} dispatch={dispatch} toast={toast} />
            <RoundNamesManager tournament={tournament} dispatch={dispatch} toast={toast} />
            <ScorekeepersManager tournament={tournament} dispatch={dispatch} toast={toast} />
            <SecuritySettings tournament={tournament} dispatch={dispatch} toast={toast} auth={auth} />
            <DataTools tournament={tournament} dispatch={dispatch} toast={toast} />
            <RecycleBin tournament={tournament} dispatch={dispatch} toast={toast} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PinGate({ auth }) {
  const [pin, setPin] = useState('');
  return (
    <div className="pin-gate">
      <div className="pin-gate-card animate-scale-in">
        <div className="pin-gate-icon"><Lock size={28} /></div>
        <h2>Admin Access</h2>
        <p>Enter your admin PIN to manage tournament settings.</p>
        <form onSubmit={async e => { e.preventDefault(); await auth.login(pin); }}>
          <input
            type="password" inputMode="numeric" maxLength={8}
            className="input pin-input"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoFocus
          />
          {auth.error && <p className="pin-error">{auth.error}</p>}
          <Button type="submit" variant="accent" size="lg" loading={auth.loading} className="pin-submit">
            Unlock Admin
          </Button>
        </form>
      </div>
    </div>
  );
}

function AdminSidebar() {
  return (
    <aside className="admin-sidebar no-print">
      <nav className="admin-nav">
        {[
          { label: 'Tournament Settings', icon: <Settings size={15} />, href: '#settings' },
          { label: 'Teams', icon: <Users size={15} />, href: '#teams' },
          { label: 'Pools', icon: <Users size={15} />, href: '#pools' },
          { label: 'Round Names', icon: <Tag size={15} />, href: '#round-names' },
          { label: 'Scorekeepers', icon: <ClipboardList size={15} />, href: '#scorekeepers' },
          { label: 'Security', icon: <Shield size={15} />, href: '#security' },
          { label: 'Data & Backup', icon: <Database size={15} />, href: '#data' },
          { label: 'Recycle Bin', icon: <Recycle size={15} />, href: '#recycle' },
        ].map(item => (
          <a key={item.href} href={item.href} className="admin-nav-item">
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>
      <div className="admin-nav-external">
        <Link to="/admin/templates" className="admin-nav-item admin-nav-item--external">
          <ClipboardList size={15} />
          Scorecard Templates
          <ExternalLink size={11} />
        </Link>
      </div>
    </aside>
  );
}

function TournamentSettings({ tournament, dispatch, toast }) {
  const [form, setForm] = useState({
    name: tournament.name || '',
    managerName: tournament.managerName || '',
    organizingBody: tournament.organizingBody || '',
    venue: tournament.venue || '',
    ageGroup: tournament.ageGroup || '',
    startDate: tournament.startDate || '',
    endDate: tournament.endDate || '',
    pointsForWin: tournament.pointsForWin ?? 2,
    pointsForDraw: tournament.pointsForDraw ?? 1,
    pointsForLoss: tournament.pointsForLoss ?? 0,
    tiebreakMethod: tournament.tiebreakMethod || 'goal-difference',
  });

  function handleSave(e) {
    e.preventDefault();
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: { id: tournament.id, ...form } });
    toast.success('Tournament settings saved.');
  }

  return (
    <section id="settings" className="admin-section">
      <div className="admin-section-header">
        <Settings size={18} />
        <h2>Tournament Settings</h2>
      </div>
      <form onSubmit={handleSave} className="admin-form">
        <FormField label="Tournament Name" required>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </FormField>
        <div className="form-row-3">
          <FormField label="Manager / Organiser">
            <Input value={form.managerName} onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))} placeholder="Jane Smith" />
          </FormField>
          <FormField label="Age Group">
            <Select value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
              <option value="">Select</option>
              {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FormField>
          <FormField label="Organising Body">
            <Input value={form.organizingBody} onChange={e => setForm(f => ({ ...f, organizingBody: e.target.value }))} placeholder="Northerns Netball Union" />
          </FormField>
        </div>
        <FormField label="Primary Venue">
          <Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="School or sports complex name" />
        </FormField>
        <div className="form-row">
          <FormField label="Start Date">
            <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </FormField>
        </div>

        <div className="admin-subsection-title">Points System</div>
        <div className="form-row-3">
          <FormField label="Points for Win">
            <Input type="number" min="0" max="10" value={form.pointsForWin}
              onChange={e => setForm(f => ({ ...f, pointsForWin: parseInt(e.target.value) || 0 }))} />
          </FormField>
          <FormField label="Points for Draw">
            <Input type="number" min="0" max="10" value={form.pointsForDraw}
              onChange={e => setForm(f => ({ ...f, pointsForDraw: parseInt(e.target.value) || 0 }))} />
          </FormField>
          <FormField label="Points for Loss">
            <Input type="number" min="0" max="10" value={form.pointsForLoss}
              onChange={e => setForm(f => ({ ...f, pointsForLoss: parseInt(e.target.value) || 0 }))} />
          </FormField>
        </div>

        <FormField label="Tiebreak Method">
          <Select value={form.tiebreakMethod} onChange={e => setForm(f => ({ ...f, tiebreakMethod: e.target.value }))}>
            <option value="goal-difference">Goal Difference (then Goals For)</option>
            <option value="goals-for">Goals For</option>
            <option value="head-to-head">Head-to-Head (then Goal Difference)</option>
          </Select>
        </FormField>

        <div className="form-actions">
          <Button type="submit" variant="accent">Save Settings</Button>
        </div>
      </form>
    </section>
  );
}

function TeamManager({ tournament, dispatch, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', schoolName: '', province: '', colors: { primary: '#112240', secondary: '#FFC500' } });

  function openAdd() {
    setForm({ name: '', schoolName: '', province: '', colors: { primary: '#112240', secondary: '#FFC500' } });
    setShowAdd(true);
  }
  function openEdit(team) {
    setForm({ name: team.name, schoolName: team.schoolName || '', province: team.province || '', colors: team.colors || { primary: '#112240', secondary: '#FFC500' } });
    setEditTeam(team);
  }
  function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editTeam) {
      dispatch({ type: 'UPDATE_TEAM', payload: { tournamentId: tournament.id, team: { ...editTeam, ...form } } });
      toast.success('Team updated.');
      setEditTeam(null);
    } else {
      dispatch({ type: 'ADD_TEAM', payload: { tournamentId: tournament.id, team: form } });
      toast.success('Team added.');
      setShowAdd(false);
    }
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      let added = 0;
      rows.forEach(row => {
        const name = row.name || row.Name;
        if (!name) return;
        dispatch({ type: 'ADD_TEAM', payload: { tournamentId: tournament.id, team: {
          name, schoolName: row.school || row.schoolName || '',
          province: row.province || '', colors: { primary: '#112240', secondary: '#FFC500' },
        }}});
        added++;
      });
      toast.success(`Imported ${added} teams.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <section id="teams" className="admin-section">
      <div className="admin-section-header">
        <Users size={18} />
        <h2>Teams <Badge variant="default">{tournament.teams.length}</Badge></h2>
        <div className="admin-section-actions">
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={13} /><span>Import CSV</span>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <Button variant="accent" size="sm" icon={<Plus size={13} />} onClick={openAdd}>Add Team</Button>
        </div>
      </div>

      {tournament.teams.length === 0 ? (
        <div className="admin-empty">No teams yet. Add teams to get started.</div>
      ) : (
        <div className="admin-team-list">
          {tournament.teams.map(team => {
            const pool = tournament.pools.find(p => p.teamIds.includes(team.id));
            return (
              <div key={team.id} className="admin-team-row">
                <div className="team-color-swatch" style={{ background: team.colors?.primary || '#112240' }} />
                <div className="team-row-info">
                  <span className="team-row-name">{team.name}</span>
                  {team.schoolName && <span className="team-row-school">{team.schoolName}</span>}
                </div>
                {pool && <Badge variant="accent" size="sm">{pool.name}</Badge>}
                {team.province && <Badge variant="default" size="sm">{team.province}</Badge>}
                <div className="team-row-actions">
                  <button className="admin-action-btn" onClick={() => openEdit(team)}><Edit2 size={13} /></button>
                  <button className="admin-action-btn admin-delete-btn" onClick={() => setDeleteId(team.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd || !!editTeam} onClose={() => { setShowAdd(false); setEditTeam(null); }}
        title={editTeam ? 'Edit Team' : 'Add Team'} size="sm">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Team Name" required>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pretoria Girls A" autoFocus required />
          </FormField>
          <FormField label="School Name">
            <Input value={form.schoolName} onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))} placeholder="e.g. Pretoria High School for Girls" />
          </FormField>
          <FormField label="Province">
            <Select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}>
              <option value="">Select province</option>
              {SA_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
            </Select>
          </FormField>
          <div className="form-row">
            <FormField label="Primary Colour">
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input type="color" value={form.colors.primary}
                  onChange={e => setForm(f => ({ ...f, colors: { ...f.colors, primary: e.target.value } }))}
                  style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                <Input value={form.colors.primary} onChange={e => setForm(f => ({ ...f, colors: { ...f.colors, primary: e.target.value } }))} />
              </div>
            </FormField>
            <FormField label="Secondary Colour">
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input type="color" value={form.colors.secondary}
                  onChange={e => setForm(f => ({ ...f, colors: { ...f.colors, secondary: e.target.value } }))}
                  style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                <Input value={form.colors.secondary} onChange={e => setForm(f => ({ ...f, colors: { ...f.colors, secondary: e.target.value } }))} />
              </div>
            </FormField>
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditTeam(null); }}>Cancel</Button>
            <Button type="submit" variant="accent">{editTeam ? 'Update' : 'Add'} Team</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => { dispatch({ type: 'SOFT_DELETE_TEAM', payload: { tournamentId: tournament.id, teamId: deleteId } }); toast.success('Team moved to recycle bin.'); setDeleteId(null); }}
        title="Remove Team" message="This will move the team to the recycle bin. You can restore it from the Recycle Bin section."
        confirmLabel="Remove" danger />
    </section>
  );
}

function PoolManager({ tournament, dispatch, toast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  function handleAddPool(e) {
    e.preventDefault();
    if (!newPoolName.trim()) return;
    dispatch({ type: 'ADD_POOL', payload: { tournamentId: tournament.id, pool: { name: newPoolName.trim(), teamIds: [] } } });
    toast.success(`Pool "${newPoolName}" created.`);
    setNewPoolName(''); setShowAdd(false);
  }

  function handleAssign(teamId, poolId) {
    dispatch({ type: 'ASSIGN_TEAM_TO_POOL', payload: { tournamentId: tournament.id, teamId, poolId } });
  }

  return (
    <section id="pools" className="admin-section">
      <div className="admin-section-header">
        <Users size={18} />
        <h2>Pools <Badge variant="default">{tournament.pools.length}</Badge></h2>
        <div className="admin-section-actions">
          <Button variant="accent" size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>Add Pool</Button>
        </div>
      </div>

      {tournament.pools.length === 0 ? (
        <div className="admin-empty">No pools yet. Create pools to organise your teams.</div>
      ) : (
        <div className="admin-pools-grid">
          {tournament.pools.map(pool => {
            const poolTeams = tournament.teams.filter(t => t.poolId === pool.id);
            const unassigned = tournament.teams.filter(t => !t.poolId);
            return (
              <div key={pool.id} className="admin-pool-card">
                <div className="admin-pool-header">
                  <span className="admin-pool-name">{pool.name}</span>
                  <Badge variant="default" size="sm">{poolTeams.length} teams</Badge>
                  <button className="admin-action-btn admin-delete-btn" onClick={() => setDeleteId(pool.id)}><Trash2 size={13} /></button>
                </div>
                <div className="admin-pool-teams">
                  {poolTeams.map(t => (
                    <div key={t.id} className="admin-pool-team">
                      <div className="team-color-swatch-sm" style={{ background: t.colors?.primary }} />
                      <span>{t.name}</span>
                      <button className="admin-action-btn admin-delete-btn"
                        onClick={() => handleAssign(t.id, null)}
                        title="Remove from pool">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                {unassigned.length > 0 && (
                  <div className="admin-pool-assign">
                    <select className="input" style={{ fontSize: 'var(--text-sm)' }}
                      defaultValue=""
                      onChange={e => { if (e.target.value) { handleAssign(e.target.value, pool.id); e.target.value = ''; } }}>
                      <option value="" disabled>+ Assign team...</option>
                      {unassigned.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned teams */}
      {tournament.teams.filter(t => !t.poolId).length > 0 && (
        <div className="admin-unassigned">
          <span className="admin-unassigned-label">Unassigned Teams:</span>
          {tournament.teams.filter(t => !t.poolId).map(t => (
            <span key={t.id} className="admin-unassigned-tag">{t.name}</span>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Pool" size="sm">
        <form onSubmit={handleAddPool} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="Pool Name" required>
            <Input value={newPoolName} onChange={e => setNewPoolName(e.target.value)}
              placeholder="e.g. Pool A" autoFocus required />
          </FormField>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="accent">Create Pool</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => { dispatch({ type: 'DELETE_POOL', payload: { tournamentId: tournament.id, poolId: deleteId } }); toast.success('Pool deleted.'); setDeleteId(null); }}
        title="Delete Pool" message="This will delete the pool and all its fixtures. Team assignments are cleared. Results are kept."
        confirmLabel="Delete" danger />
    </section>
  );
}

function SecuritySettings({ tournament, dispatch, toast, auth }) {
  const [showSetPin, setShowSetPin] = useState(false);
  const [pinForm, setPinForm] = useState({ pin: '', confirm: '' });
  const [pinErr, setPinErr] = useState('');

  async function handleSetPin(e) {
    e.preventDefault();
    if (pinForm.pin.length < 4) { setPinErr('PIN must be at least 4 characters.'); return; }
    if (pinForm.pin !== pinForm.confirm) { setPinErr('PINs do not match.'); return; }
    const hash = await hashPin(pinForm.pin);
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: { id: tournament.id, adminPinHash: hash } });
    toast.success('Admin PIN set successfully.');
    setPinForm({ pin: '', confirm: '' }); setPinErr(''); setShowSetPin(false);
  }

  async function handleRemovePin() {
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: { id: tournament.id, adminPinHash: null } });
    auth.logout();
    toast.info('Admin PIN removed. Admin is now open access.');
  }

  return (
    <section id="security" className="admin-section">
      <div className="admin-section-header">
        <Shield size={18} />
        <h2>Security</h2>
      </div>
      <div className="security-card">
        <div className="security-status">
          {tournament.adminPinHash ? (
            <>
              <Lock size={16} className="security-icon-locked" />
              <span>Admin PIN is <strong>enabled</strong>. Admin access requires a PIN.</span>
            </>
          ) : (
            <>
              <Unlock size={16} className="security-icon-open" />
              <span>No admin PIN set. Anyone can access admin settings.</span>
            </>
          )}
        </div>
        <div className="security-actions">
          <Button variant="primary" size="sm" icon={<Lock size={13} />} onClick={() => setShowSetPin(true)}>
            {tournament.adminPinHash ? 'Change PIN' : 'Set Admin PIN'}
          </Button>
          {tournament.adminPinHash && (
            <Button variant="danger" size="sm" icon={<Unlock size={13} />} onClick={handleRemovePin}>
              Remove PIN
            </Button>
          )}
        </div>
      </div>

      <Modal open={showSetPin} onClose={() => { setShowSetPin(false); setPinErr(''); }} title="Set Admin PIN" size="sm">
        <form onSubmit={handleSetPin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="New PIN (min 4 digits)" error={pinErr}>
            <Input type="password" inputMode="numeric" maxLength={8}
              value={pinForm.pin} onChange={e => { setPinForm(f => ({ ...f, pin: e.target.value })); setPinErr(''); }}
              placeholder="Enter PIN" autoFocus />
          </FormField>
          <FormField label="Confirm PIN">
            <Input type="password" inputMode="numeric" maxLength={8}
              value={pinForm.confirm} onChange={e => setPinForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Confirm PIN" />
          </FormField>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setShowSetPin(false)}>Cancel</Button>
            <Button type="submit" variant="accent">Set PIN</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function DataTools({ tournament, dispatch, toast }) {
  const [showReset, setShowReset] = useState(false);

  function handleExport() {
    downloadJSON(tournament, `${tournament.name.replace(/\s+/g, '-')}-backup.json`);
    toast.success('Tournament exported as JSON.');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.id || !data.name) throw new Error('Invalid tournament file.');
        dispatch({ type: 'IMPORT_TOURNAMENT', payload: { ...data, id: tournament.id } });
        toast.success('Tournament data imported successfully.');
      } catch {
        toast.error('Invalid JSON file. Please use a StatEdge tournament backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handlePrint() {
    window.print();
  }

  function handleReset() {
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: {
      id: tournament.id,
      fixtures: [],
      playoffs: [],
      players: [],
    }});
    toast.success('Tournament data reset. Teams and pools are kept.');
    setShowReset(false);
  }

  return (
    <section id="data" className="admin-section">
      <div className="admin-section-header">
        <Database size={18} />
        <h2>Data & Backup</h2>
      </div>
      <div className="data-tools-grid">
        <DataToolCard
          icon={<Download size={20} />}
          title="Export Backup"
          description="Download full tournament data as a JSON file."
          action={<Button variant="primary" size="sm" icon={<Download size={13} />} onClick={handleExport}>Export JSON</Button>}
        />
        <DataToolCard
          icon={<Upload size={20} />}
          title="Import Backup"
          description="Restore tournament data from a JSON backup file."
          action={
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={13} /><span>Import JSON</span>
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          }
        />
        <DataToolCard
          icon={<Printer size={20} />}
          title="Print Standings"
          description="Print the current standings to PDF or paper."
          action={<Button variant="secondary" size="sm" icon={<Printer size={13} />} onClick={handlePrint}>Print</Button>}
        />
        <DataToolCard
          icon={<RefreshCw size={20} />}
          title="Reset Fixtures"
          description="Clear all fixtures, results and players. Teams and pools are kept."
          action={<Button variant="danger" size="sm" icon={<RefreshCw size={13} />} onClick={() => setShowReset(true)}>Reset</Button>}
          danger
        />
      </div>

      <ConfirmDialog open={showReset} onClose={() => setShowReset(false)} onConfirm={handleReset}
        title="Reset Tournament Data"
        message="This will permanently delete all fixtures, results, playoffs and players. Teams and pools will be preserved."
        confirmLabel="Reset" danger />
    </section>
  );
}

function DataToolCard({ icon, title, description, action, danger = false }) {
  return (
    <div className={`data-tool-card ${danger ? 'data-tool-danger' : ''}`}>
      <div className="data-tool-icon">{icon}</div>
      <div className="data-tool-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="data-tool-action">{action}</div>
    </div>
  );
}

// ─── Round Names Manager ───────────────────────────────────────────────────────

function RoundNamesManager({ tournament, dispatch, toast }) {
  const [round, setRound] = useState('');
  const [name, setName] = useState('');

  const roundNames = tournament.roundNames || {};
  const allRounds = [...new Set(tournament.fixtures.map(f => f.round))].sort((a, b) => a - b);

  function handleSave(e) {
    e.preventDefault();
    const r = parseInt(round);
    if (!r || r < 1) { toast.error('Enter a valid round number.'); return; }
    if (!name.trim()) {
      dispatch({ type: 'DELETE_ROUND_NAME', payload: { tournamentId: tournament.id, round: r } });
      toast.success(`Custom name for Round ${r} removed.`);
    } else {
      dispatch({ type: 'SET_ROUND_NAME', payload: { tournamentId: tournament.id, round: r, name: name.trim() } });
      toast.success(`Round ${r} named "${name.trim()}".`);
    }
    setRound(''); setName('');
  }

  return (
    <section id="round-names" className="admin-section">
      <div className="admin-section-header">
        <Tag size={18} />
        <h2>Custom Round Names</h2>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Assign custom labels to fixture rounds (e.g. Round 1 &rarr; &ldquo;Grand Final&rdquo;). Leave name blank to remove a custom label.
      </p>

      {/* Existing names */}
      {Object.entries(roundNames).length > 0 && (
        <div className="round-names-list">
          {Object.entries(roundNames).sort(([a], [b]) => Number(a) - Number(b)).map(([r, n]) => (
            <div key={r} className="round-name-row">
              <span className="round-name-number">Round {r}</span>
              <span className="round-name-arrow">→</span>
              <span className="round-name-label">{n}</span>
              <button className="admin-action-btn admin-delete-btn" onClick={() => {
                dispatch({ type: 'DELETE_ROUND_NAME', payload: { tournamentId: tournament.id, round: Number(r) } });
                toast.success(`Custom name for Round ${r} removed.`);
              }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="round-name-form">
        <div className="form-row">
          <div style={{ flex: '0 0 120px' }}>
            {allRounds.length > 0 ? (
              <select className="input" value={round} onChange={e => setRound(e.target.value)}>
                <option value="">Round #</option>
                {allRounds.map(r => <option key={r} value={r}>Round {r}</option>)}
              </select>
            ) : (
              <input type="number" min="1" className="input" placeholder="Round #" value={round} onChange={e => setRound(e.target.value)} />
            )}
          </div>
          <input className="input" style={{ flex: 1 }} placeholder="Custom name (e.g. Grand Final)" value={name} onChange={e => setName(e.target.value)} />
          <Button type="submit" variant="accent" size="sm">Set</Button>
        </div>
      </form>
    </section>
  );
}

// ─── Recycle Bin ─────────────────────────────────────────────────────────────

function RecycleBin({ tournament, dispatch, toast }) {
  const bin = tournament.deletedItems || { teams: [], fixtures: [], players: [] };
  const total = (bin.teams?.length || 0) + (bin.fixtures?.length || 0) + (bin.players?.length || 0);

  function restore(itemType, itemId) {
    dispatch({ type: 'RESTORE_DELETED_ITEM', payload: { tournamentId: tournament.id, itemType, itemId } });
    toast.success('Item restored.');
  }

  function permanentDelete(itemType, itemId) {
    dispatch({ type: 'PERMANENTLY_DELETE_ITEM', payload: { tournamentId: tournament.id, itemType, itemId } });
    toast.info('Permanently deleted.');
  }

  function emptyBin() {
    dispatch({ type: 'EMPTY_RECYCLE_BIN', payload: { tournamentId: tournament.id } });
    toast.success('Recycle bin emptied.');
  }

  return (
    <section id="recycle" className="admin-section">
      <div className="admin-section-header">
        <Recycle size={18} />
        <h2>Recycle Bin {total > 0 && <span style={{ marginLeft: 'var(--space-2)' }}><span className="badge badge-warning">{total}</span></span>}</h2>
        {total > 0 && (
          <div className="admin-section-actions">
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => { if (window.confirm('Permanently delete all items in the recycle bin?')) emptyBin(); }}>Empty Bin</Button>
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="admin-empty">The recycle bin is empty.</div>
      ) : (
        <div className="recycle-bin-list">
          {/* Teams */}
          {(bin.teams || []).map(team => (
            <div key={team.id} className="recycle-row">
              <Recycle size={14} className="recycle-type-icon" />
              <div className="recycle-info">
                <span className="recycle-name">{team.name}</span>
                <span className="recycle-meta">Team · {team.schoolName || team.province || ''}</span>
              </div>
              <div className="recycle-actions">
                <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} onClick={() => restore('teams', team.id)}>Restore</Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => permanentDelete('teams', team.id)}>Delete</Button>
              </div>
            </div>
          ))}

          {/* Fixtures */}
          {(bin.fixtures || []).map(fixture => {
            const home = tournament.teams.find(t => t.id === fixture.homeTeamId);
            const away = tournament.teams.find(t => t.id === fixture.awayTeamId);
            return (
              <div key={fixture.id} className="recycle-row">
                <Recycle size={14} className="recycle-type-icon" />
                <div className="recycle-info">
                  <span className="recycle-name">{home?.name || 'TBD'} vs {away?.name || 'TBD'}</span>
                  <span className="recycle-meta">Fixture · Round {fixture.round}{fixture.date ? ` · ${fixture.date}` : ''}</span>
                </div>
                <div className="recycle-actions">
                  <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} onClick={() => restore('fixtures', fixture.id)}>Restore</Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => permanentDelete('fixtures', fixture.id)}>Delete</Button>
                </div>
              </div>
            );
          })}

          {/* Players */}
          {(bin.players || []).map(player => {
            const team = tournament.teams.find(t => t.id === player.teamId);
            return (
              <div key={player.id} className="recycle-row">
                <Recycle size={14} className="recycle-type-icon" />
                <div className="recycle-info">
                  <span className="recycle-name">{player.name}</span>
                  <span className="recycle-meta">Player{team ? ` · ${team.name}` : ''}</span>
                </div>
                <div className="recycle-actions">
                  <Button variant="secondary" size="sm" icon={<RotateCcw size={13} />} onClick={() => restore('players', player.id)}>Restore</Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => permanentDelete('players', player.id)}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Scorekeepers Manager ─────────────────────────────────────────────────────

function ScorekeepersManager({ tournament, dispatch, toast }) {
  const [newName, setNewName]   = useState('');
  const [fixtureId, setFixtureId] = useState('');
  const [code, setCode]         = useState(tournament.scorekeeperCode || '');
  const [codeSaved, setCodeSaved] = useState(false);

  const assignments = tournament.scorekeeperAssignments || [];

  function handleAddAssignment(e) {
    e.preventDefault();
    if (!newName.trim() || !fixtureId) return;

    const fixture = tournament.fixtures.find(f => f.id === fixtureId);
    if (!fixture) return;

    dispatch({
      type: 'ADD_SCOREKEEPER_ASSIGNMENT',
      payload: {
        tournamentId: tournament.id,
        assignment: {
          id: generateId(),
          fixtureId,
          scorekeeperName: newName.trim(),
          active: true,
          assignedAt: new Date().toISOString(),
        },
      },
    });
    toast.success(`${newName.trim()} assigned.`);
    setNewName('');
    setFixtureId('');
  }

  function handleRemove(assignmentId) {
    dispatch({
      type: 'REMOVE_SCOREKEEPER_ASSIGNMENT',
      payload: { tournamentId: tournament.id, assignmentId },
    });
    toast.success('Assignment removed.');
  }

  function handleSaveCode(e) {
    e.preventDefault();
    dispatch({
      type: 'SET_SCOREKEEPER_CODE',
      payload: { tournamentId: tournament.id, code: code.trim().toUpperCase() },
    });
    setCodeSaved(true);
    setTimeout(() => setCodeSaved(false), 2000);
    toast.success('Scorekeeper code saved.');
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(tournament.scorekeeperCode || '');
    toast.success('Code copied to clipboard.');
  }

  // Fixture options
  const fixtureOptions = tournament.fixtures.map(f => {
    const home = tournament.teams.find(t => t.id === f.homeTeamId);
    const away = tournament.teams.find(t => t.id === f.awayTeamId);
    return {
      value: f.id,
      label: `R${f.round}${f.court ? ` C${f.court}` : ''}: ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`,
    };
  });

  return (
    <section id="scorekeepers" className="admin-section">
      <div className="admin-section-header">
        <ClipboardList size={18} />
        <h2>Scorekeepers</h2>
        <Link to="/admin/templates" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
          <ExternalLink size={13} />
          Scorecard Templates
        </Link>
      </div>

      {/* Scorekeeper Code */}
      <div className="admin-subsection">
        <div className="admin-subsection-title" id="sk-code-label">
          <Key size={14} /> Tournament Access Code
        </div>
        <p className="admin-subsection-desc">
          Share this code with scorekeepers. They enter it at{' '}
          <strong>/scorekeeper</strong> together with their name to log in.
        </p>
        <form onSubmit={handleSaveCode} className="sk-code-form">
          <div className="sk-code-row">
            <Input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. NET2026"
              maxLength={20}
              aria-labelledby="sk-code-label"
              style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', flex: 1 }}
            />
            {tournament.scorekeeperCode && (
              <Button type="button" variant="ghost" size="sm" icon={<Copy size={13} />} onClick={handleCopyCode}>
                Copy
              </Button>
            )}
            <Button type="submit" variant="accent" size="sm">
              {codeSaved ? 'Saved ✓' : 'Save Code'}
            </Button>
          </div>
        </form>
      </div>

      {/* Assign scorekeepers */}
      <div className="admin-subsection">
        <div className="admin-subsection-title">Assign Scorekeepers to Fixtures</div>
        <form onSubmit={handleAddAssignment} className="sk-assign-form">
          <div className="form-row">
            <FormField label="Scorekeeper Name">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Thandi Nkosi"
                required
              />
            </FormField>
            <FormField label="Fixture">
              <Select value={fixtureId} onChange={e => setFixtureId(e.target.value)} required>
                <option value="">Select fixture…</option>
                {fixtureOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="form-actions">
            <Button type="submit" variant="accent" size="sm" icon={<Plus size={14} />}
              disabled={!newName.trim() || !fixtureId}>
              Assign
            </Button>
          </div>
        </form>
      </div>

      {/* Assignment list */}
      {assignments.length > 0 && (
        <div className="sk-assignment-list">
          {assignments
            .filter(a => a.active)
            .map(a => {
              const fixture = tournament.fixtures.find(f => f.id === a.fixtureId);
              const home = fixture ? tournament.teams.find(t => t.id === fixture.homeTeamId) : null;
              const away = fixture ? tournament.teams.find(t => t.id === fixture.awayTeamId) : null;

              return (
                <div key={a.id} className="sk-assignment-row">
                  <div className="sk-assignment-info">
                    <span className="sk-assignment-name">{a.scorekeeperName}</span>
                    <span className="sk-assignment-fixture">
                      {fixture
                        ? `R${fixture.round}${fixture.court ? ` C${fixture.court}` : ''}: ${home?.name || 'TBD'} vs ${away?.name || 'TBD'}`
                        : 'Fixture not found'}
                    </span>
                  </div>
                  <div className="sk-assignment-actions">
                    <Link
                      to={`/admin/scorecard/${tournament.id}/${a.fixtureId}`}
                      className="btn btn-ghost btn-sm"
                      title="Open scorecard"
                    >
                      <ExternalLink size={13} />
                    </Link>
                    <Button variant="ghost" size="sm" icon={<X size={13} />}
                      onClick={() => handleRemove(a.id)}
                      title="Remove assignment"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {assignments.filter(a => a.active).length === 0 && (
        <p className="admin-empty">No scorekeepers assigned yet.</p>
      )}
    </section>
  );
}
