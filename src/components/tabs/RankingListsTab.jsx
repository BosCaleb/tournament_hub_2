import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Download, GripVertical, List } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Modal, ConfirmDialog } from '../ui/Modal.jsx';
import { FormField, Input } from '../ui/FormField.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { exportRankingListPDF, exportRankingListCSV } from '../../lib/export.js';
import './RankingListsTab.css';

export function RankingListsTab({ tournament, dispatch, toast, isAdmin = false }) {
  const lists = tournament.rankingLists || [];
  const [activeListId, setActiveListId] = useState(lists[0]?.id || null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const activeList = lists.find(l => l.id === activeListId) || null;

  // Teams available to add: all tournament teams not already in this list
  const availableTeams = activeList
    ? tournament.teams.filter(t => !activeList.teamIds.includes(t.id))
    : [];

  // Teams in the list (ordered)
  const rankedTeams = activeList
    ? activeList.teamIds.map(id => tournament.teams.find(t => t.id === id)).filter(Boolean)
    : [];

  function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    dispatch({ type: 'ADD_RANKING_LIST', payload: { tournamentId: tournament.id, list: { name: newName.trim(), teamIds: [] } } });
    toast.success(`Ranking list "${newName}" created.`);
    setNewName(''); setShowNew(false);
    // Select the newly created list — we'll find it via lists after state update
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_RANKING_LIST', payload: { tournamentId: tournament.id, listId: deleteId } });
    toast.success('Ranking list deleted.');
    const remaining = lists.filter(l => l.id !== deleteId);
    setActiveListId(remaining[0]?.id || null);
    setDeleteId(null);
  }

  function handleAddTeam(teamId) {
    if (!activeList || !teamId) return;
    dispatch({ type: 'UPDATE_RANKING_LIST', payload: {
      tournamentId: tournament.id,
      list: { ...activeList, teamIds: [...activeList.teamIds, teamId] },
    }});
  }

  function handleRemoveTeam(teamId) {
    if (!activeList) return;
    dispatch({ type: 'UPDATE_RANKING_LIST', payload: {
      tournamentId: tournament.id,
      list: { ...activeList, teamIds: activeList.teamIds.filter(id => id !== teamId) },
    }});
  }

  function handleDragEnd(result) {
    if (!result.destination || !activeList) return;
    const newIds = [...activeList.teamIds];
    const [moved] = newIds.splice(result.source.index, 1);
    newIds.splice(result.destination.index, 0, moved);
    dispatch({ type: 'UPDATE_RANKING_LIST', payload: {
      tournamentId: tournament.id,
      list: { ...activeList, teamIds: newIds },
    }});
  }

  function handlePopulateFromStandings() {
    if (!activeList || tournament.pools.length === 0) return;
    // Collect all teams ranked by points across all pools
    const allTeams = tournament.teams.map(t => t.id);
    dispatch({ type: 'UPDATE_RANKING_LIST', payload: {
      tournamentId: tournament.id,
      list: { ...activeList, teamIds: allTeams },
    }});
    toast.success('List populated with all teams.');
  }

  if (lists.length === 0) {
    return (
      <div className="ranking-lists-tab">
        <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
          {isAdmin ? (
            <>
              <EmptyState
                icon={<List size={28} />}
                title="No ranking lists yet"
                description="Create a custom ranking list to manually order teams — for cup draws, seedings, or final standings."
                action={<Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => setShowNew(true)}>New List</Button>}
              />
              <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Ranking List" size="sm">
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <FormField label="List Name" required>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Final Rankings, Cup Seeds" autoFocus required />
                  </FormField>
                  <div className="form-actions">
                    <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
                    <Button type="submit" variant="accent">Create</Button>
                  </div>
                </form>
              </Modal>
            </>
          ) : (
            <EmptyState icon={<List size={28} />} title="No ranking lists" description="No custom ranking lists have been created for this tournament." />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ranking-lists-tab">
      <div className="container">
        {/* List selector */}
        <div className="rl-header">
          <div className="rl-tabs">
            {lists.map(l => (
              <button
                key={l.id}
                className={`rl-tab ${l.id === activeListId ? 'rl-tab-active' : ''}`}
                onClick={() => setActiveListId(l.id)}
              >
                {l.name}
              </button>
            ))}
            {isAdmin && (
              <button className="rl-tab rl-tab-add" onClick={() => setShowNew(true)}>
                <Plus size={13} /> New List
              </button>
            )}
          </div>

          {activeList && (
            <div className="rl-actions">
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => { exportRankingListPDF(tournament, activeList); toast.success('Exported as PDF.'); }}>PDF</Button>
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => { exportRankingListCSV(tournament, activeList); toast.success('Exported as CSV.'); }}>CSV</Button>
              {isAdmin && (
                <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteId(activeListId)}>Delete List</Button>
              )}
            </div>
          )}
        </div>

        {activeList && (
          <>
            {/* Add teams */}
            {isAdmin && availableTeams.length > 0 && (
              <div className="rl-add-team">
                <select className="input rl-team-select" defaultValue="" onChange={e => { if (e.target.value) { handleAddTeam(e.target.value); e.target.value = ''; } }}>
                  <option value="" disabled>+ Add team to list…</option>
                  {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {tournament.teams.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handlePopulateFromStandings}>Add All Teams</Button>
                )}
              </div>
            )}

            {rankedTeams.length === 0 ? (
              <EmptyState icon={<List size={24} />} title="No teams in this list" description={isAdmin ? 'Add teams using the dropdown above.' : 'No teams have been added to this list.'} />
            ) : isAdmin ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="ranking-list">
                  {provided => (
                    <div className="rl-list" ref={provided.innerRef} {...provided.droppableProps}>
                      {rankedTeams.map((team, i) => (
                        <Draggable key={team.id} draggableId={team.id} index={i}>
                          {(prov, snap) => (
                            <div
                              className={`rl-row ${snap.isDragging ? 'rl-row-dragging' : ''}`}
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                            >
                              <div className="rl-rank">{i + 1}</div>
                              <div className="rl-drag-handle" {...prov.dragHandleProps}><GripVertical size={16} /></div>
                              <div className="team-color-swatch-sm" style={{ background: team.colors?.primary || '#112240' }} />
                              <div className="rl-team-info">
                                <span className="rl-team-name">{team.name}</span>
                                {team.schoolName && <span className="rl-team-school">{team.schoolName}</span>}
                              </div>
                              {team.province && <span className="rl-team-province">{team.province}</span>}
                              <button className="rl-remove-btn" onClick={() => handleRemoveTeam(team.id)} title="Remove from list">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              // Viewer — static list, no drag handles
              <div className="rl-list">
                {rankedTeams.map((team, i) => (
                  <div key={team.id} className="rl-row">
                    <div className="rl-rank">{i + 1}</div>
                    <div className="team-color-swatch-sm" style={{ background: team.colors?.primary || '#112240' }} />
                    <div className="rl-team-info">
                      <span className="rl-team-name">{team.name}</span>
                      {team.schoolName && <span className="rl-team-school">{team.schoolName}</span>}
                    </div>
                    {team.province && <span className="rl-team-province">{team.province}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Ranking List" size="sm">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <FormField label="List Name" required>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Final Rankings, Cup Seeds" autoFocus required />
          </FormField>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" variant="accent">Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Ranking List" message="This will permanently delete this ranking list." confirmLabel="Delete" danger />
    </div>
  );
}
