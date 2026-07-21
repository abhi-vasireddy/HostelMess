/**
 * CricketScoring — Ball-by-ball scoring with player tracking
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trophy, Users, Activity, X, Play, StopCircle,
} from 'lucide-react';
import { Button } from './Button';
import { MockDB } from '../services/mockDb';
import { getTodayDateString } from '../services/timeUtils';
import type {
  CricketMatch, CricketInnings, CricketBall, CricketTournament, User
} from '../types';

function fmtO(o: number, b: number) { return o + '.' + b; }
function calcRR(runs: number, overs: number) { return overs > 0 ? (runs / overs).toFixed(1) : '0.0'; }
function calcNRR(forR: number, forO: number, agR: number, agO: number) { return forO > 0 ? ((forR/forO) - (agR/(agO||1))).toFixed(2) : '0.00'; }

const BALL_VALUES = [0, 1, 2, 3, 4, 6];
const EXTRAS = [
  { label: 'WD', clr: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' },
  { label: 'NB', clr: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' },
  { label: 'LB', clr: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' },
  { label: 'B', clr: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' },
  { label: 'W', clr: 'bg-red-50 dark:bg-red-900/20 text-red-700' },
];

export const CricketScoring: React.FC<{ user: User }> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [tab, setTab] = useState<'live' | 'scorecard' | 'teams' | 'tournaments'>('live');
  // Teams are now inline in match creation
  const [matches, setMatches] = useState<CricketMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  
  const [showTourM, setShowTourM] = useState(false);
  const [tournaments, setTournaments] = useState<CricketTournament[]>([]);
  
  const [tourForm, setTourForm] = useState({ name: '' });
  const [showMatchM, setShowMatchM] = useState(false);
  const [mForm, setMForm] = useState({ aName: '', bName: '', aPlayers: '', bPlayers: '', venue: '', ov: 5, date: getTodayDateString() });

  // Scoring
  const [sm, setSm] = useState<CricketMatch | null>(null);
  const [inn, setInn] = useState(0);
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  const load = async () => {
    setLoading(true);
    const [m, tours] = await Promise.all([MockDB.getCricketMatches(), MockDB.getCricketTournaments()]);
    setMatches(m); setTournaments(tours); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Extract current striker/non-striker/bowler from ball-by-ball data
  const syncPlayerNames = (innings: CricketInnings | undefined) => {
    const balls = innings?.balls || [];
    if (balls.length === 0) return;
    const lastBall = balls[balls.length - 1];
    setBowler(lastBall.bowler || '');
    // Find last two distinct batters (the current batting pair)
    const uniqueBatters = [...new Set(
      [...balls].reverse().map(b => b.batter).filter(Boolean)
    )];
    if (uniqueBatters[0]) setStriker(uniqueBatters[0]);
    if (uniqueBatters[1]) setNonStriker(uniqueBatters[1]);
  };

  // Lightweight refresh — updates data WITHOUT showing a spinner (avoids blinking)
  const refreshData = async () => {
    const [m, tours] = await Promise.all([MockDB.getCricketMatches(), MockDB.getCricketTournaments()]);
    setMatches(m); setTournaments(tours);
    // If viewing a match created by someone else, update sm so scoreboard refreshes live
    if (sm && sm.id) {
      const freshMatch = m.find(x => x.id === sm.id);
      if (freshMatch && freshMatch.createdBy?.uid !== user.uid) {
        // Match completed by creator — exit scoring screen
        if (freshMatch.status === 'completed') {
          setSm(null);
          setInn(0);
          return;
        }
        setSm(freshMatch);
        // Determine which innings the viewer should be looking at
        const movedToSecond = inn === 0 && freshMatch.innings && freshMatch.innings.length > 1;
        if (movedToSecond) {
          setInn(1);
          setStriker('');
          setNonStriker('');
          setBowler('');
        }
        // Sync player names so viewer sees who's batting/bowling
        const targetIdx = movedToSecond ? 1 : inn;
        syncPlayerNames(freshMatch.innings?.[targetIdx]);
      }
    }
  };

  // Auto-refresh every 1s so scores update live (like Cricbuzz) — no loading flash
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const interval = setInterval(() => {
      // If user is actively scoring their own match, local state handles it
      if (sm && sm.createdBy?.uid === user.uid) return;
      refreshData();
    }, 1000);
    return () => clearInterval(interval);
  }, [sm, user.uid]);

  // Refresh matches when switching tabs (skip initial mount)
  const isFirstTabRef = useRef(true);
  useEffect(() => {
    if (isFirstTabRef.current) { isFirstTabRef.current = false; return; }
    refreshData();
  }, [tab]);

  // View-only mode: only the creator (or admin) can score
  const isViewOnly = sm != null && sm.createdBy != null && sm.createdBy.uid !== user.uid && !isAdmin;
  const canEdit = sm == null || !isViewOnly;

  const curInn = sm?.innings?.[inn];
  const battingTeamId = inn === 0 ? sm?.teamAId : sm?.teamBId;
  const bowlingTeamId = inn === 0 ? sm?.teamBId : sm?.teamAId;

  const handleBall = async (runs: number, extra?: string) => {
    if (!sm || !striker || !bowler) return;
    const nb = (curInn?.balls?.length || 0) + 1;
    const ov = Math.floor(nb / 6);
    const b = nb % 6;
    const isW = extra === 'W';
    const isWD = extra === 'WD';
    const isNB = extra === 'NB';
    const totalRuns = runs + (isWD || isNB ? 1 : 0);
    const ball: CricketBall = {
      over: ov, ball: b, batter: striker, bowler,
      runs: totalRuns, isWicket: isW, isFour: runs === 4, isSix: runs === 6,
      wide: isWD, noBall: isNB, bye: extra === 'B', legBye: extra === 'LB',
      description: isW ? 'Wicket!' : runs === 4 ? 'FOUR!' : runs === 6 ? 'SIX!' : runs + ' runs',
    };
    const updated = { ...(curInn || { id: '', matchId: '', battingTeamId: '', bowlingTeamId: '', total: 0, wickets: 0, overs: 0, balls: [] }) };
    updated.balls = [...(updated.balls || []), ball];
    updated.total += totalRuns;
    if (isW) updated.wickets++;
    updated.overs = ov + b / 10;
    // Create a NEW innings array (immutable state update)
    const newInn = [...(sm.innings || [])];
    newInn[inn] = updated;
    await MockDB.updateCricketMatch(sm.id, { innings: newInn, status: 'live' });
    setSm({ ...sm, innings: newInn, status: 'live' });
    // Strike rotation:
    // 1. On odd runs, batsmen cross (only for non-wide deliveries)
    let nextStriker = striker;
    let nextNonStriker = nonStriker;
    if (runs >= 1 && runs % 2 === 1 && !isW) {
      nextStriker = nonStriker;
      nextNonStriker = striker;
    }
    // 2. At end of over (every 6 deliveries by code count), strike rotates
    //    because the bowling changes ends. Note: wides/noballs inflate the
    //    count — this is approximate when extras are present.
    if (b === 0 && nb > 1) {
      [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
    }
    setStriker(nextStriker);
    setNonStriker(nextNonStriker);
  };

  const endInnings = async () => {
    if (!sm) return;
    if (inn === 0) {
      const sec: CricketInnings = { id: '', matchId: sm.id, battingTeamId: sm.teamBId, bowlingTeamId: sm.teamAId, total: 0, wickets: 0, overs: 0, balls: [] };
      const updatedInnings = [...(sm.innings || []), sec];
      await MockDB.updateCricketMatch(sm.id, { innings: updatedInnings });
      setSm({ ...sm, innings: updatedInnings }); setInn(1);
      setStriker(''); setNonStriker(''); setBowler('');
    } else {
      const t1 = sm.innings[0]?.total || 0, t2 = sm.innings[1]?.total || 0;
      const w2 = sm.innings[1]?.wickets || 0;
      const res = t1 > t2 ? sm.teamAName + ' won by ' + (t1 - t2) + ' runs'
        : t2 > t1 ? sm.teamBName + ' won by ' + (10 - w2) + ' wickets' : 'Match Tied';;
      const topScorer = [...(sm.innings?.[0]?.balls || []), ...(sm.innings?.[1]?.balls || [])].reduce((acc: Record<string, number>, b) => { if (b.batter) acc[b.batter] = (acc[b.batter] || 0) + b.runs; return acc; }, {});
      const motmName = Object.entries(topScorer).sort(([,a], [,b]) => b - a)?.[0]?.[0] || '';
      await MockDB.updateCricketMatch(sm.id, { status: 'completed', result: res, innings: sm.innings, motm: motmName });
      setSm(null); setInn(0); load();
    }
  };

  const createMatch = async () => {
    if (!mForm.aName || !mForm.bName) return;
    const parsePlayers = (s: string) => s.split(',').map((n, i) => ({ id: 'p'+i, name: n.trim(), role: 'All-Rounder' as const, teamId: '' })).filter(p => p.name);
    const pa = parsePlayers(mForm.aPlayers);
    const pb = parsePlayers(mForm.bPlayers);
    const teamAId = 'a-' + Date.now();
    const teamBId = 'b-' + Date.now();
    const createdBy = { uid: user.uid, name: user.displayName };
    const id = await MockDB.createCricketMatch({
      id: '', teamAId, teamAName: mForm.aName, teamBId, teamBName: mForm.bName,
      date: mForm.date, venue: mForm.venue, totalOvers: mForm.ov, status: 'upcoming', innings: [], createdAt: Date.now(), createdBy,
    });
    setShowMatchM(false);
    startScoring({ id, teamAId, teamAName: mForm.aName, teamBId, teamBName: mForm.bName, date: mForm.date, venue: mForm.venue, totalOvers: mForm.ov, status: 'live', innings: [], createdAt: Date.now(), createdBy });
  };

  const startScoring = (m: CricketMatch) => { setSm(m); setInn(0); setStriker(''); setNonStriker(''); setBowler(''); setTab('live'); };

  // Fetch latest match data from Firestore before resuming scoring
  const handleResumeMatch = async (m: CricketMatch) => {
    const fresh = await MockDB.getCricketMatch(m.id);
    startScoring(fresh || m);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Sub tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
        {[
          { id: 'live', label: 'Live Score', icon: Activity },
          { id: 'scorecard', label: 'Results', icon: Trophy },
          { id: 'tournaments', label: 'Tournaments', icon: Trophy },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ' + (tab === t.id ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ LIVE SCORING ═══ */}
      {tab === 'live' && (
        <div>
          {!sm ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cricket Scoring</h2>
                <button onClick={() => setShowMatchM(true)} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all"><Plus size={14} /> New Match</button>
              </div>
              {/* Quick start with existing upcoming */}
              {matches.filter((m) => m.status === 'upcoming').slice(0, 5).map((m) => (
                <div key={m.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between mb-2 hover:shadow-md transition-all">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{m.teamAName} vs {m.teamBName}</p>
                    <p className="text-xs text-slate-500">{m.venue} • {m.date}</p>
                  </div>
                  <button onClick={() => handleResumeMatch(m)} className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"><Play size={14} /> Start</button>
                </div>
              ))}
              {matches.filter((m) => m.status === 'live').map((m) => (
                <div key={m.id} className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-2xl shadow-md flex items-center justify-between mb-2 text-white">
                  <div>
                    <p className="font-bold">{m.teamAName} vs {m.teamBName}</p>
                    <p className="text-white/80 text-xs">LIVE</p>
                  </div>
                  <button onClick={() => handleResumeMatch(m)} className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-xs font-bold">Score</button>
                </div>
              ))}
              {matches.filter((m) => m.status === 'upcoming').length === 0 && matches.filter((m) => m.status === 'live').length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No matches. Create one!</p>
                </div>
              )}
            </div>
          ) : (
            /* Scoring UI */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Scoreboard */}
              <div className="bg-gradient-to-r from-sky-600 to-cyan-600 p-5 text-white">
                <div className="flex justify-between items-start">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider">{(inn === 0 ? '1st' : '2nd') + ' Innings'} • {sm.totalOvers} overs</p>
                  {isViewOnly && <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-lg">View Only</span>}
                </div>
                <div className="flex justify-between items-end mt-1">
                  <div>
                    <h2 className="text-3xl font-black">{curInn?.total || 0}/{curInn?.wickets || 0}</h2>
                    <p className="text-white/80 text-sm mt-0.5">Overs: {curInn ? fmtO(Math.floor(curInn.overs), Math.round((curInn.overs % 1) * 10)) : '0.0'} • RR: {calcRR(curInn?.total || 0, curInn?.overs || 0)}{inn === 1 && sm?.innings?.[0] ? ' • Req: ' + calcRR((sm.innings[0].total || 0) - (curInn?.total || 0), curInn?.overs || 0) + '/over' : ''}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold">{inn === 0 ? sm.teamAName : sm.teamBName}</p>
                    <p className="text-white/60 text-xs">Batting</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Player selectors */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Striker</p>
                    <input placeholder={isViewOnly ? "View only" : "Name"} value={striker} onChange={(e) => setStriker(e.target.value)} disabled={isViewOnly} className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Non-Striker</p>
                    <input placeholder={isViewOnly ? "View only" : "Name"} value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} disabled={isViewOnly} className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Bowler</p>
                    <input placeholder={isViewOnly ? "View only" : "Name"} value={bowler} onChange={(e) => setBowler(e.target.value)} disabled={isViewOnly} className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white disabled:opacity-50" />
                  </div>
                </div>

                {/* Run buttons */}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Runs</p>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {BALL_VALUES.map((r) => (
                    <button key={r} onClick={() => handleBall(r)} disabled={!canEdit || !striker || !bowler}
                      className={'py-3 rounded-xl text-lg font-black transition-all active:scale-95 disabled:opacity-30 ' + (r === 4 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : r === 6 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700')}>
                      {r === 0 ? '0' : r.toString()}
                    </button>
                  ))}
                </div>

                {/* Extras */}
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Extras / Wicket</p>
                <div className="flex gap-2 mb-4">
                  {EXTRAS.map((e) => (
                    <button key={e.label} onClick={() => handleBall(0, e.label === 'W' ? 'W' : e.label)} disabled={!canEdit || !striker || !bowler} className={'flex-1 py-2.5 rounded-xl text-xs font-bold disabled:opacity-30 ' + e.clr}>{e.label}</button>
                  ))}
                </div>

                {/* Ball history */}
                {curInn?.balls && curInn.balls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Last 18 balls</p>
                    <div className="flex flex-wrap gap-1.5">
                      {curInn.balls.slice(-18).map((b, i) => (
                        <span key={i} className={'text-[11px] font-bold px-2.5 py-1 rounded-lg ' + (b.isSix ? 'bg-purple-100 text-purple-700' : b.isFour ? 'bg-emerald-100 text-emerald-700' : b.isWicket ? 'bg-red-100 text-red-700' : b.wide ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600')}>
                          {b.isWicket ? 'W' : b.wide ? 'WD' : b.noBall ? 'NB' : b.isSix ? '6' : b.isFour ? '4' : b.runs.toString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {curInn?.balls && curInn.balls.length > 0 && striker && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Partnership</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
                        {(() => {
                          let runs = 0, balls = 0;
                          const lastPartnership = [...(curInn?.balls || [])].reverse();
                          for (const b of lastPartnership) {
                            runs += b.runs;
                            balls++;
                            if (b.isWicket) break;
                          }
                          return runs + ' (' + balls + 'b)';
                        })()}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">This Over</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
                        {(() => {
                          const ballsData = curInn?.balls || [];
                          const currentOver = ballsData.length > 0 ? ballsData[ballsData.length - 1].over : 0;
                          const lastOver = ballsData.filter((b) => b.over === currentOver);
                          return lastOver.reduce((s, b) => s + b.runs, 0) + ' runs';
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* End innings */}
                                <button onClick={async () => { if (!sm || !curInn?.balls?.length) return; const b = [...curInn.balls]; b.pop(); const up = {...curInn, balls: b}; up.total = b.reduce((s, x) => s + x.runs, 0); up.wickets = b.filter((x) => x.isWicket).length; up.overs = b.length > 0 ? Math.floor(b.length / 6) + (b.length % 6) / 10 : 0; const ni = [...(sm.innings || [])]; ni[inn] = up; await MockDB.updateCricketMatch(sm.id, { innings: ni }); setSm({...sm, innings: ni}); }} disabled={!canEdit || !curInn?.balls?.length} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"><X size={16} /> Undo</button>
                <button onClick={endInnings} disabled={!canEdit || !curInn?.balls?.length}
                  className={'w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30 flex items-center justify-center gap-2 ' + (inn === 0 ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white')}>
                  <StopCircle size={16} /> {inn === 0 ? 'End Innings' : 'End Match'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SCORECARDS ═══ */}
      {tab === 'scorecard' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Results</h2>
          {matches.filter((m) => m.status === 'completed').length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No completed matches</p>
            </div>
          ) : matches.filter((m) => m.status === 'completed').reverse().map((m) => (
            <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-3">
              <div className="bg-gradient-to-r from-sky-600 to-cyan-600 p-4 text-white">
                <div className="flex justify-between items-start">
                  <div><p className="font-bold text-lg">{m.teamAName} vs {m.teamBName}</p><p className="text-white/70 text-xs">{m.date}</p></div>
                  <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-lg">{m.result}</span>
                    {m.motm && <span className="text-[10px] text-white/70 ml-2">🏆 {m.motm}</span>}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {m.innings?.map((inn, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-bold">{i === 0 ? m.teamAName : m.teamBName}</span><span className="font-semibold">{inn.total}/{inn.wickets} ({inn.overs ? Math.floor(inn.overs) + '.' + Math.round((inn.overs % 1) * 10) : '0.0'} ov)</span></div>
                    {inn.balls?.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Batting</p>
                        <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-slate-400 uppercase py-1 border-b border-slate-200 dark:border-slate-700">
                          <span className="col-span-2">Batter</span><span className="text-right">R</span><span className="text-right">B</span><span className="text-right">SR</span>
                        </div>
                        {(() => {
                          const s: Record<string, {r:number;b:number;f:number;s:number}> = {};
                          inn.balls.forEach((ball: CricketBall) => {
                            if (!ball.batter) return;
                            if (!s[ball.batter]) s[ball.batter] = { r:0, b:0, f:0, s:0 };
                            s[ball.batter].r += ball.runs;
                            if (!ball.wide && !ball.noBall) s[ball.batter].b++;
                            if (ball.isFour) s[ball.batter].f++;
                            if (ball.isSix) s[ball.batter].s++;
                          });
                          return Object.entries(s).map(([name, stats]) => (
                            <div key={name} className="grid grid-cols-5 gap-1 text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <span className="col-span-2 font-medium truncate">{name}</span>
                              <span className="text-right font-semibold">{stats.r}</span>
                              <span className="text-right text-slate-500">{stats.b}</span>
                              <span className="text-right text-slate-500">{stats.b > 0 ? (stats.r / stats.b * 100).toFixed(0) : '-'}</span>
                            </div>
                          ));
                        })()}                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Bowling</p>
                        <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-slate-400 uppercase py-1 border-b border-slate-200 dark:border-slate-700">
                          <span className="col-span-2">Bowler</span><span className="text-right">O</span><span className="text-right">R</span><span className="text-right">W</span>
                        </div>
                        {(() => {
                          const s: Record<string, {o:number;r:number;w:number}> = {};
                          inn.balls.forEach((ball: CricketBall) => {
                            if (!ball.bowler) return;
                            if (!s[ball.bowler]) s[ball.bowler] = { o:0, r:0, w:0 };
                            s[ball.bowler].r += ball.runs;
                            if (ball.isWicket) s[ball.bowler].w++;
                            if (!ball.wide && !ball.noBall) s[ball.bowler].o += 0.1;
                          });
                          return Object.entries(s).map(([name, stats]) => (
                            <div key={name} className="grid grid-cols-5 gap-1 text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <span className="col-span-2 font-medium truncate">{name}</span>
                              <span className="text-right font-semibold">{Math.floor(stats.o) + "." + Math.round((stats.o % 1) * 10)}</span>
                              <span className="text-right text-slate-500">{stats.r}</span>
                              <span className="text-right text-slate-500">{stats.w}</span>
                            </div>
                          ));
                        })()}                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TEAMS ═══ */}
      {tab === 'teams' && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Match Players</h2>
          {matches.filter((m) => m.status === 'completed' || m.status === 'live').length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">Play matches to see player stats</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // Aggregate stats across all completed matches
                const playerStats: Record<string, {r:number;b:number;w:number;m:Set<string>}> = {};
                matches.filter((m) => m.status === 'completed').forEach((m) => {
                  (m.innings || []).forEach((inn) => {
                    const teamName = inn.battingTeamId === m.teamAId ? m.teamAName : m.teamBName;
                    inn.balls.forEach((ball) => {
                      [ball.batter, ball.bowler].filter(Boolean).forEach((name) => {
                        if (!playerStats[name]) playerStats[name] = { r:0, b:0, w:0, m: new Set() };
                        playerStats[name].m.add(teamName);
                      });
                      if (ball.batter) {
                        playerStats[ball.batter].r += ball.runs;
                        if (!ball.wide) playerStats[ball.batter].b++;
                      }
                      if (ball.bowler && ball.isWicket) playerStats[ball.bowler].w++;
                    });
                  });
                });
                return Object.entries(playerStats).sort(([,a], [,b]) => b.r - a.r).slice(0, 20).map(([name, s]) => (
                  <div key={name} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">{name[0]}</div>
                      <div><p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{name}</p><p className="text-[10px] text-slate-400">{s.m.size} matches</p></div>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="text-center"><span className="block font-bold text-slate-800 dark:text-slate-200">{s.r}</span>Runs</span>
                      <span className="text-center"><span className="block font-bold text-slate-800 dark:text-slate-200">{s.b}</span>Balls</span>
                      <span className="text-center"><span className="block font-bold text-emerald-600">{s.w}</span>Wkts</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

            {/* ── New Match Modal ── */}      {/* ── New Match Modal ── */}
      {showMatchM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMatchM(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">New Match</h3><button onClick={() => setShowMatchM(false)}><X size={18} className="text-slate-400" /></button></div>
            <div className="space-y-3">
              <input placeholder="Team A Name" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.aName} onChange={(e) => setMForm({ ...mForm, aName: e.target.value })} />
              <input placeholder="Team B Name" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.bName} onChange={(e) => setMForm({ ...mForm, bName: e.target.value })} />
              <input placeholder="Team A Players (comma separated)" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.aPlayers} onChange={(e) => setMForm({ ...mForm, aPlayers: e.target.value })} />
              <input placeholder="Team B Players (comma separated)" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.bPlayers} onChange={(e) => setMForm({ ...mForm, bPlayers: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Overs" className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.ov} onChange={(e) => setMForm({ ...mForm, ov: Number(e.target.value) })} />
                <input type="date" className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.date} onChange={(e) => setMForm({ ...mForm, date: e.target.value })} />
              </div>
              <input placeholder="Venue" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={mForm.venue} onChange={(e) => setMForm({ ...mForm, venue: e.target.value })} />
              <button onClick={createMatch} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:shadow-lg transition-all">Create & Start</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Modal ── */}
      {showTourM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTourM(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">New Tournament</h3><button onClick={() => setShowTourM(false)}><X size={18} className="text-slate-400" /></button></div>
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Enter a name for the tournament.</p>
<input placeholder="Tournament Name" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 dark:text-white" value={tourForm.name} onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })} />
              <button onClick={async () => {
                if (tourForm.name) {
                  await MockDB.createCricketTournament({ id: '', name: tourForm.name, teamIds: [], matchIds: [], createdAt: Date.now() });
                  setShowTourM(false); setTourForm({ name: '' }); load();
                }
              }} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500">Create Tournament</button>
            </div>
          </div>
        </div>
      )
      }
    </div>
  );
};
