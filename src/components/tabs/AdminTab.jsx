import { useState } from 'react';
import {
  Settings, Users, Database, Shield, Plus, Trash2, Edit2,
  Download, Upload, Printer, RefreshCw, Lock, Unlock
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth.js';
import { Button } from '../ui/Button.jsx';
import { FormField, Input, Select } from '../ui/FormField.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { Badge } from '../ui/Badge.jsx';
import { downloadJSON, hashPin, parseCSV } from '../../lib/utils.js';
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
            <SecuritySettings tournament={tournament} dispatch={dispatch} toast={toast} auth={auth} />
            <DataTools tournament={tournament} dispatch={dispatch} toast={toast} />
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
          { label: 'Security', icon: <Shield size={15} />, href: '#security' },
          { label: 'Data & Backup', icon: <Database size={15} />, href: '#data' },
        ].map(item => (
          <a key={item.href} href={item.href} className="admin-nav-item">
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>
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
        onConfirm={() => { dispatch({ type: 'DELETE_TEAM', payload: { tournamentId: tournament.id, teamId: deleteId } }); toast.success('Team removed.'); setDeleteId(null); }}
        title="Remove Team" message="This will remove the team and all their fixtures. This cannot be undone."
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
