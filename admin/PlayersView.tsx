import React, { useState } from 'react';
import { Player, PlayerRole } from '../../types';
import { Search, Plus, User, Edit2, Trash2, Award, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayersViewProps {
  players: Player[];
  teams: { name: string; playerIds: string[] }[];
  isAdmin?: boolean;
  onAddPlayer: (player: Omit<Player, 'id' | 'stats'>) => Promise<boolean>;
  onEditPlayer: (id: string, player: Omit<Player, 'id' | 'stats'>) => Promise<boolean>;
  onDeletePlayer: (id: string) => void;
  onSelectPlayer: (id: string) => void;
}

export default function PlayersView({
  players,
  teams,
  isAdmin = false,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onSelectPlayer,
}: PlayersViewProps) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('Batsman');
  const [jerseyNo, setJerseyNo] = useState('');
  const [age, setAge] = useState<number | ''>('');

  const getTeamOfPlayer = (playerId: string) => {
    const team = teams.find(t => t.playerIds.includes(playerId));
    return team ? team.name : 'No Team Assigned';
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingPlayer(null);
    setName('');
    setRole('Batsman');
    setJerseyNo('');
    setAge('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Player) => {
    setEditingPlayer(p);
    setName(p.name);
    setRole(p.role);
    setJerseyNo(p.jerseyNo);
    setAge(p.age || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;

    const playerData = {
      name: name.trim(),
      role,
      jerseyNo: jerseyNo.trim() || '#',
      age: age === '' ? undefined : Number(age),
    };

    setSaving(true);
    const ok = editingPlayer
      ? await onEditPlayer(editingPlayer.id, playerData)
      : await onAddPlayer(playerData);
    setSaving(false);
    if (ok) setIsModalOpen(false);
  };

  return (
    <div id="players-view" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-neutral-900 truncate">Players Directory</h1>
          <p className="text-xs text-neutral-400 line-clamp-1">Manage profiles, jersey assignments, and roles</p>
        </div>
        {isAdmin && (
          <button
            id="add-player-btn"
            onClick={openAddModal}
            className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-4 py-2 min-h-[44px] text-sm font-bold text-neutral-950 transition hover:bg-emerald-400 active:scale-95 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} className="flex-shrink-0" />
            Add Player
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
          <Search size={18} />
        </span>
        <input
          id="player-search-input"
          type="text"
          placeholder="Search players by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pr-4 pl-10 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
        />
      </div>

      {/* Players List Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredPlayers.map(p => {
            const teamName = getTeamOfPlayer(p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-xs transition hover:border-emerald-200 hover:shadow-sm"
              >
                {/* Jersey Emblem */}
                <div
                  onClick={() => onSelectPlayer(p.id)}
                  className="flex h-12 w-12 cursor-pointer flex-shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 font-mono text-emerald-700 transition group-hover:bg-emerald-100/80"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60 leading-none">Jersey</span>
                  <span className="text-lg font-black tabular-nums leading-none mt-0.5">{p.jerseyNo || '#'}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectPlayer(p.id)}>
                  <h3 className="truncate font-bold text-neutral-900 group-hover:text-emerald-600 transition">
                    {p.name}
                  </h3>
                  <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-400">
                    <span className="flex-shrink-0">{p.role}</span>
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-neutral-200"></span>
                    <span className="truncate">{teamName}</span>
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      aria-label="Edit profile"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 animate-none"
                      title="Edit profile"
                    >
                      <Edit2 size={14} className="flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => onDeletePlayer(p.id)}
                      aria-label="Delete player"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 animate-none"
                      title="Delete player"
                    >
                      <Trash2 size={14} className="flex-shrink-0" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400">
          No players match your search criteria. Add some players to begin.
        </div>
      )}

      {/* Add / Edit Player Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-100 bg-white p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <h2 className="min-w-0 truncate text-lg font-black text-neutral-900">
                {editingPlayer ? 'Edit Player Profile' : 'Add New Player'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-400 transition hover:bg-neutral-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virat Kohli"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Player Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as PlayerRole)}
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-rounder">All-rounder</option>
                    <option value="Wicket-keeper">Wicket-keeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Jersey No
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="e.g. 18"
                    value={jerseyNo}
                    onChange={e => setJerseyNo(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 28"
                  value={age}
                  onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-neutral-100 py-2.5 min-h-[44px] text-sm font-bold text-neutral-600 transition hover:bg-neutral-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 min-h-[44px] text-sm font-bold text-neutral-950 transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving to database...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
