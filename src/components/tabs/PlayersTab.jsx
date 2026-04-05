import { useState } from 'react';
import { Plus, Trash2, Edit2, Download, Upload } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { FormField, Input, Select } from '../ui/FormField.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Badge } from '../ui/Badge.jsx';
import { NETBALL_POSITIONS, POSITION_COLORS } from '../../lib/types.js';
import { downloadCSV, parseCSV } from '../../lib/utils.js';
import './PlayersTab.css';

export function PlayersTab({ tournament, dispatch, toast, isAdmin = false }) {
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterPos, setFilterPos] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const players = (tournament.players || []).filter(p => {
    if (filterTeam !== 'all' && p.teamId !== filterTeam) return false;
    if (filterPos !== 'all' && p.position !== filterPos) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filterTeam === 'all'
    ? tournament.teams.map(t => ({
        team: t,
        players: players.filter(p => p.teamId === t.id),
      })).filter(g => g.players.length > 0)
    : [{ team: tournament.teams.find(t => t.id === filterTeam), players }];

  function handleSave(data) {
    if (editPlayer) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { tournamentId: tournament.id, player: { ...editPlayer, ...data } } });
      toast.success('Player updated.');
    } else {
      dispatch({ type: 'ADD_PLAYER', payload: { tournamentId: tournament.id, player: data } });
      toast.success('Player added.');
    }
    setShowAdd(false); setEditPlayer(null);
  }

  function handleExport() {
    const rows = tournament.players.map(p => {
      const team = tournament.teams.find(t => t.id === p.teamId);
      return { name: p.name, jerseyNumber: p.jerseyNumber, position: p.position, team: team?.name || '', school: team?.schoolName || '' };
    });
    downloadCSV(rows, ['name','jerseyNumber','position','team','school'], `${tournament.name}-players.csv`);
    toast.success('Players exported.');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      const players = parsed.map(row => ({
        name: row.name || row.Name || '',
        jerseyNumber: row.jerseyNumber || row.jersey || '',
        position: row.position || row.Position || '',
        teamId: tournament.teams.find(t => t.name === row.team)?.id || null,
      })).filter(p => p.name);
      dispatch({ type: 'IMPORT_PLAYERS', payload: { tournamentId: tournament.id, players } });
      toast.success(`Imported ${players.length} players.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="players-tab">
      <div className="container">
        {/* Filter bar */}
        <div className="players-filters">
          <input
            className="input player-search"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input" value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Teams</option>
            {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" value={filterPos} onChange={e => setFilterPos(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">All Positions</option>
            {NETBALL_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="players-filter-actions">
            {isAdmin && (
              <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
                Add Player
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
              Export
            </Button>
            {isAdmin && (
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={14} />
                <span>Import CSV</span>
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            )}
          </div>
        </div>

        {/* Player count */}
        <div className="players-summary">
          <span className="players-count">{tournament.players.length} players registered</span>
          <span className="players-shown">Showing {players.length}</span>
        </div>

        {players.length === 0 ? (
          <EmptyState
            icon={<Plus size={28} />}
            title="No players yet"
            description={isAdmin ? 'Add players manually or import a CSV file with columns: name, jerseyNumber, position, team.' : 'No players have been registered for this tournament yet.'}
            action={isAdmin ? (
              <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
                Add First Player
              </Button>
            ) : null}
          />
        ) : (
          <div className="players-groups">
            {grouped.map(({ team, players: teamPlayers }) => (
              <div key={team?.id || 'unassigned'} className="player-team-group">
                <div className="player-group-header">
                  <div className="player-group-dot" style={{ background: team?.colors?.primary || '#ccc' }} />
                  <h3>{team?.name || 'Unassigned'}</h3>
                  {team?.schoolName && <span className="player-group-school">{team.schoolName}</span>}
                  <Badge variant="default" size="sm">{teamPlayers.length}</Badge>
                </div>
                <div className="players-grid">
                  {teamPlayers.map(p => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      team={team}
                      isAdmin={isAdmin}
                      onEdit={() => setEditPlayer(p)}
                      onDelete={() => setDeleteId(p.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlayerFormModal
        open={showAdd || !!editPlayer}
        player={editPlayer}
        tournament={tournament}
        onClose={() => { setShowAdd(false); setEditPlayer(null); }}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          dispatch({ type: 'DELETE_PLAYER', payload: { tournamentId: tournament.id, playerId: deleteId } });
          toast.success('Player removed.');
          setDeleteId(null);
        }}
        title="Remove Player"
        message="Are you sure you want to remove this player?"
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}

function PlayerCard({ player, team, isAdmin, onEdit, onDelete }) {
  const posInfo = POSITION_COLORS[player.position] || { bg: '#f3f4f6', text: '#374151', label: player.position };

  return (
    <div className="player-card">
      <div className="player-card-jersey" style={{ background: team?.colors?.primary || '#112240' }}>
        <span>{player.jerseyNumber || '?'}</span>
      </div>
      <div className="player-card-info">
        <span className="player-name">{player.name}</span>
        {player.position && (
          <span className="player-pos-badge" style={{ background: posInfo.bg, color: posInfo.text }}>
            {player.position}
          </span>
        )}
      </div>
      {isAdmin && (
        <div className="player-card-actions">
          <button className="player-action-btn" onClick={onEdit} title="Edit"><Edit2 size={13} /></button>
          <button className="player-action-btn player-delete-btn" onClick={onDelete} title="Remove"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

function PlayerFormModal({ open, player, tournament, onClose, onSave }) {
  const [form, setForm] = useState({
    name: player?.name || '',
    jerseyNumber: player?.jerseyNumber || '',
    position: player?.position || '',
    teamId: player?.teamId || '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <Modal open={open} onClose={onClose} title={player ? 'Edit Player' : 'Add Player'} size="sm">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <FormField label="Player Name" required>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" autoFocus required />
        </FormField>
        <div className="form-row">
          <FormField label="Jersey #">
            <Input value={form.jerseyNumber} onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} placeholder="e.g. 7" />
          </FormField>
          <FormField label="Position">
            <Select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
              <option value="">Select position</option>
              {NETBALL_POSITIONS.map(p => {
                const info = POSITION_COLORS[p];
                return <option key={p} value={p}>{p}{info ? ` – ${info.label}` : ''}</option>;
              })}
            </Select>
          </FormField>
        </div>
        <FormField label="Team">
          <Select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}>
            <option value="">Unassigned</option>
            {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </FormField>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent">{player ? 'Update' : 'Add'} Player</Button>
        </div>
      </form>
    </Modal>
  );
}
