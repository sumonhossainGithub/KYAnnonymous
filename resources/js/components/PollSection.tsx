import { useState, useEffect, useRef, type FormEvent } from 'react';
import { usePage } from '@inertiajs/react';
import type { PollItem, SharedProps } from '@/types';
import { BarChart3, Plus, X, Clock, CheckCircle2, Trash2, ShieldCheck, Undo2, Check, Sparkles } from 'lucide-react';

interface PollSectionProps {
  polls: PollItem[];
  onCreatePoll: (data: { question: string; options: string[] }) => Promise<boolean>;
  onVotePoll: (pollPublicId: string, optionIndex: number) => Promise<boolean>;
  onRetractPollVote?: (pollPublicId: string) => Promise<boolean>;
  onDeletePoll?: (pollPublicId: string) => Promise<boolean>;
  canCreate: boolean;
  sending: boolean;
  isCreateOpen?: boolean;
  onToggleCreate?: (open: boolean) => void;
}

function getRemainingTime(expiresAt: string | null): { text: string; isClosed: boolean } {
  if (!expiresAt) return { text: '24h remaining', isClosed: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return { text: 'Closed (24h ended)', isClosed: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return { text: `${hours}h ${minutes}m left`, isClosed: false };
  }
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { text: `${minutes}m ${seconds}s left`, isClosed: false };
}

export default function PollSection({
  polls,
  onCreatePoll,
  onVotePoll,
  onRetractPollVote,
  onDeletePoll,
  canCreate,
  sending,
  isCreateOpen,
  onToggleCreate,
}: PollSectionProps) {
  const { auth } = usePage<SharedProps>().props;
  const [internalCreateForm, setInternalCreateForm] = useState(false);
  const showCreateForm = isCreateOpen !== undefined ? isCreateOpen : internalCreateForm;

  const setShowCreateForm = (open: boolean) => {
    if (onToggleCreate) {
      onToggleCreate(open);
    } else {
      setInternalCreateForm(open);
    }
  };

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [votingPoll, setVotingPoll] = useState<string | null>(null);
  const [, setTimeTick] = useState(0);
  const optionInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Update 24h countdown every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setTimeTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
      setTimeout(() => {
        optionInputsRef.current[options.length]?.focus();
      }, 50);
    }
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, value: string) => {
    setOptions(options.map((o, i) => (i === idx ? value : o)));
  };

  const handleCreatePoll = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedQ = question.trim();
    const trimmedOpts = options.map((o) => o.trim()).filter((o) => o !== '');
    if (!trimmedQ || trimmedOpts.length < 2) return;
    const success = await onCreatePoll({ question: trimmedQ, options: trimmedOpts });
    if (success) {
      setQuestion('');
      setOptions(['', '']);
      setShowCreateForm(false);
    }
  };

  const handleVote = async (pollPublicId: string, optionIndex: number) => {
    setVotingPoll(pollPublicId);
    await onVotePoll(pollPublicId, optionIndex);
    setVotingPoll(null);
  };

  const handleRetract = async (pollPublicId: string) => {
    if (!onRetractPollVote) return;
    setVotingPoll(pollPublicId);
    await onRetractPollVote(pollPublicId);
    setVotingPoll(null);
  };

  if (polls.length === 0 && !showCreateForm) return null;

  return (
    <div className="mb-4">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 font-mono text-[11px] text-emerald-300 uppercase tracking-wider">
          <BarChart3 size={14} className="text-emerald-400" />
          <span>Telegram-Style Polls</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono">
            24h active
          </span>
          {polls.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[9px] text-slate-300">
              {polls.length}
            </span>
          )}
        </span>
        {canCreate && auth.user && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition shadow-sm ${
              showCreateForm
                ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-emerald-300'
            }`}
          >
            {showCreateForm ? <X size={12} /> : <Plus size={12} />}
            <span>{showCreateForm ? 'Cancel' : 'New Poll'}</span>
          </button>
        )}
      </div>

      {/* Telegram-style Create Poll Dialog */}
      {showCreateForm && (
        <form
          onSubmit={handleCreatePoll}
          className="mb-4 p-4 sm:p-5 rounded-2xl bg-[#081714]/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                <BarChart3 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Create Telegram Poll</h3>
                <p className="text-[10px] font-mono text-emerald-400/80">Anonymous voting · 24-hour duration</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Question Input */}
          <div>
            <label className="block font-mono text-[10px] text-emerald-400 uppercase tracking-wider mb-1.5">
              Poll Question
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-slate-950/90 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-sans shadow-inner transition"
              autoFocus
            />
          </div>

          {/* Option Inputs (Telegram style up to 10 options) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider">
                Poll Options (2 – 10)
              </label>
              <span className="font-mono text-[10px] text-slate-500">{options.length}/10</span>
            </div>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 font-mono text-[10px] text-slate-400 flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    ref={(el) => {
                      optionInputsRef.current[idx] = el;
                    }}
                    type="text"
                    required
                    maxLength={100}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (idx === options.length - 1 && options.length < 10) {
                          addOption();
                        } else if (idx + 1 < options.length) {
                          optionInputsRef.current[idx + 1]?.focus();
                        }
                      }
                    }}
                    placeholder={`Add an option ${idx + 1}...`}
                    className="flex-1 bg-slate-950/90 border border-slate-700/90 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-sans shadow-inner transition"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Remove option"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/30 transition shadow-sm"
              >
                <Plus size={13} />
                <span>Add an option...</span>
              </button>
            )}
          </div>

          {/* Telegram Settings Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Anonymous Voting</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-cyan-400" />
                <span>Poll Duration</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">
                24 HOURS
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !question.trim() || options.filter((o) => o.trim()).length < 2}
              className="button button-small !py-2 !px-5 !text-xs font-semibold flex items-center gap-1.5"
            >
              <BarChart3 size={14} />
              <span>{sending ? 'Posting Poll…' : 'Create Poll'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Telegram Polls */}
      {polls.length > 0 && (
        <div className="space-y-3.5">
          {polls.map((poll) => {
            const hasVoted = poll.user_vote !== null;
            const maxVotes = Math.max(...poll.results, 1);
            const remaining = getRemainingTime(poll.expires_at);
            const isClosed = poll.is_expired || remaining.isClosed;

            return (
              <div
                key={poll.public_id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl backdrop-blur-md ${
                  isClosed
                    ? 'bg-[#091114]/90 border-slate-800'
                    : 'bg-[#071915]/95 border-emerald-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
                }`}
              >
                {/* Telegram Poll Header */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-medium">
                        <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0" />
                        <span>Anonymous Poll</span>
                      </span>
                      <span className="text-slate-600 font-mono text-[11px]">·</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          isClosed
                            ? 'bg-slate-800 border border-slate-700 text-slate-400'
                            : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        <Clock size={11} />
                        <span>{remaining.text}</span>
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug break-words">
                      {poll.question}
                    </h3>
                  </div>
                </div>

                {/* Telegram Poll Options List */}
                <div className="space-y-2">
                  {poll.options.map((option, idx) => {
                    const voteCount = poll.results[idx] || 0;
                    const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                    const isSelected = poll.user_vote === idx;
                    const isWinning = voteCount === maxVotes && voteCount > 0;

                    if (!hasVoted && !isClosed) {
                      // Telegram Unvoted State: Radio row with click to vote
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={sending || votingPoll === poll.public_id}
                          onClick={() => handleVote(poll.public_id, idx)}
                          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-700/60 bg-slate-950/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-slate-500 group-hover:border-emerald-400 group-hover:scale-110 flex items-center justify-center transition-all flex-shrink-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-xs sm:text-sm text-slate-200 group-hover:text-white font-sans leading-normal break-words flex-1">
                            {option}
                          </span>
                        </button>
                      );
                    }

                    // Telegram Voted / Results State: Progress fill bar & percentages
                    return (
                      <div
                        key={idx}
                        className={`relative w-full rounded-xl overflow-hidden border transition-all ${
                          isSelected
                            ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                            : 'border-slate-800/80 bg-slate-950/50'
                        }`}
                      >
                        {/* Telegram Animated Progress Fill Bar */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                            isSelected
                              ? 'bg-emerald-500/25'
                              : isWinning
                              ? 'bg-emerald-500/15'
                              : 'bg-slate-700/20'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />

                        {/* Option content */}
                        <div className="relative z-10 flex items-center justify-between px-3.5 py-2.5 gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-slate-600 font-mono text-[10px]">
                                {idx + 1}
                              </div>
                            )}
                            <span
                              className={`text-xs sm:text-sm break-words ${
                                isSelected ? 'text-emerald-200 font-semibold' : 'text-slate-200'
                              }`}
                            >
                              {option}
                            </span>
                          </div>

                          {/* Percentage & Vote Count */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className={`text-xs sm:text-sm font-bold font-mono ${
                                isSelected
                                  ? 'text-emerald-300'
                                  : isWinning
                                  ? 'text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {percentage}%
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">({voteCount})</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Telegram Poll Footer */}
                <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 flex-wrap">
                    <span className="font-semibold text-slate-300">
                      {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
                    </span>
                    <span>·</span>
                    <span>by {poll.creator.display_name}</span>
                    {poll.creator.is_admin && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-300 font-mono">
                        ADMIN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Telegram Retract Vote button */}
                    {hasVoted && !isClosed && onRetractPollVote && (
                      <button
                        type="button"
                        disabled={sending || votingPoll === poll.public_id}
                        onClick={() => handleRetract(poll.public_id)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-emerald-300 transition hover:underline cursor-pointer"
                      >
                        <Undo2 size={12} />
                        <span>Retract vote</span>
                      </button>
                    )}

                    {onDeletePoll && auth.user && (auth.user.role === 'SUPER_ADMIN' || (poll.creator.public_id && auth.user.public_id === poll.creator.public_id)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this poll?')) {
                            void onDeletePoll(poll.public_id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                        title="Delete poll"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
