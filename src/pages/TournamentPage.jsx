import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BarChart3, Trophy, Users,
  TrendingUp, Settings, ArrowLeft
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext.jsx';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { TabNav } from '../components/layout/TabNav.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { useToast } from '../hooks/useToast.js';
import { ToastContainer } from '../components/ui/Toast.jsx';
import { getTournamentStats } from '../lib/tournament.js';

// Tab views
import { OverviewTab } from '../components/tabs/OverviewTab.jsx';
import { FixturesTab } from '../components/tabs/FixturesTab.jsx';
import { StandingsTab } from '../components/tabs/StandingsTab.jsx';
import { PlayoffsTab } from '../components/tabs/PlayoffsTab.jsx';
import { PlayersTab } from '../components/tabs/PlayersTab.jsx';
import { StatsTab } from '../components/tabs/StatsTab.jsx';
import { AdminTab } from '../components/tabs/AdminTab.jsx';

/** isAdmin=true  → full admin view (all tabs, edit controls)
 *  isAdmin=false → read-only viewer (no Admin tab, no edit controls) */
export function TournamentPage({ isAdmin = false }) {
  const { id, sport } = useParams();
  const navigate = useNavigate();
  const { tournament, dispatch } = useTournament(id);
  const [activeTab, setActiveTab] = useState('overview');
  const toast = useToast();

  const backPath = isAdmin ? '/admin/dashboard' : `/sports/${sport || tournament?.sport || 'netball'}`;

  if (!tournament) return <Navigate to={isAdmin ? '/admin/dashboard' : '/sports'} replace />;

  const stats = getTournamentStats(tournament);

  const tabs = [
    { id: 'overview',  label: 'Overview',   icon: <LayoutDashboard size={15} /> },
    { id: 'fixtures',  label: 'Fixtures',   icon: <Calendar size={15} />, badge: stats.remainingFixtures || null },
    { id: 'standings', label: 'Standings',  icon: <BarChart3 size={15} /> },
    { id: 'playoffs',  label: 'Playoffs',   icon: <Trophy size={15} /> },
    { id: 'players',   label: 'Players',    icon: <Users size={15} />, badge: stats.totalPlayers || null },
    { id: 'stats',     label: 'Statistics', icon: <TrendingUp size={15} /> },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: <Settings size={15} /> }] : []),
  ];

  const tabProps = { tournament, dispatch, toast, isAdmin };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        title={tournament.name}
        subtitle={[tournament.ageGroup, tournament.organizingBody].filter(Boolean).join(' · ')}
        backPath={backPath}
        isAdmin={isAdmin}
      />

      <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'overview'  && <OverviewTab  {...tabProps} />}
        {activeTab === 'fixtures'  && <FixturesTab  {...tabProps} />}
        {activeTab === 'standings' && <StandingsTab {...tabProps} />}
        {activeTab === 'playoffs'  && <PlayoffsTab  {...tabProps} />}
        {activeTab === 'players'   && <PlayersTab   {...tabProps} />}
        {activeTab === 'stats'     && <StatsTab     {...tabProps} />}
        {activeTab === 'admin' && isAdmin && <AdminTab {...tabProps} />}
      </main>

      <Footer />
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
    </div>
  );
}
