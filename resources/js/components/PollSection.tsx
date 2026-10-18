import { useState, useEffect, useRef, type FormEvent } from 'react';
import { usePage } from '@inertiajs/react';
import type { PollItem, SharedProps } from '@/types';
import { BarChart3, Plus, X, Clock, Trash2, ShieldCheck, Undo2, Check, Sparkles } from 'lucide-react';

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

export function getRemainingTime(expiresAt: string | null): { text: string; isClosed: boolean } {
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

/**
 * Compact Telegram-Style Poll Card that looks and fits like a chat message.
 * When anyone votes within 24 hours, it bumps to the latest message position in the stream.
 */
export function PollCard({
  poll,
  onVote,
  onRetract,
  onDelete,
  sending,
}: {
  poll: PollItem;
  onVote: (pollPublicId: string, optionIndex: number) => Promise<boolean>;
  onRetract?: (pollPublicId: string) => Promise<boolean>;
  onDelete?: (pollPublicId: string) => Promise<boolean>;
  sending: boolean;
}) {
  const { auth } = usePage<SharedProps>().props;
  const [voting, setVoting] = useState(false);
  const [, setTimeTick] = useState(0);

  // Update 24h countdown every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => setTimeTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const hasVoted = poll.user_vote !== null;
  const maxVotes = Math.max(...poll.results, 1);
  const remaining = getRemainingTime(poll.expires_at);
  const isClosed = poll.is_expired || remaining.isClosed;

  const handleVote = async (optionIndex: number) => {
    if (sending || voting) return;
    setVoting(true);
    await onVote(poll.public_id, optionIndex);
    setVoting(false);
  };

  const handleRetract = async () => {
    if (!onRetract || sending || voting) return;
    setVoting(true);
    await onRetract(poll.public_id);
    setVoting(false);
  };

  const canDelete =
    Boolean(onDelete) &&
    Boolean(auth.user) &&
    (auth.user.role === 'SUPER_ADMIN' ||
      (poll.creator.public_id && auth.user.public_id === poll.creator.public_id));

  return (
    <article
      id={`poll-${poll.public_id}`}
      className="chat-message poll-message select-none transition-all duration-300"
    >
      {/* Poll Avatar */}
      <span className="message-avatar font-mono overflow-hidden !bg-emerald-950/90 !border-emerald-500/40 !text-emerald-300 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)] flex-shrink-0">
        <BarChart3 size={15} className="text-emerald-400" />
      </span>

      <div className="chat-message-content min-w-0">
        {/* Meta Header */}
        <div className="message-meta font-mono text-[11px] flex items-center gap-1.5 flex-wrap mb-1">
          <strong className="text-emerald-400">
            Poll by {poll.creator.display_name}
          </strong>
          {poll.creator.is_admin && (
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-300 font-mono">
              ADMIN
            </span>
          )}
          <span className="text-slate-600">·</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock size={11} className={isClosed ? 'text-slate-500' : 'text-cyan-400'} />
            <span>{remaining.text}</span>
          </span>
          {isClosed ? (
            <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px] text-slate-400 font-mono">
              CLOSED
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono flex items-center gap-0.5">
              <Sparkles size={9} />
              24h active
            </span>
          )}
        </div>

        {/* Compact Telegram Poll Bubble (sized like a message bubble) */}
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-start w-full max-w-[340px] sm:max-w-[380px]">
            <div
              className={`w-full p-3 sm:p-3.5 rounded-2xl border shadow-xl backdrop-blur-md space-y-2.5 transition-all ${
                isClosed
                  ? 'bg-[#091114]/95 border-slate-800 text-slate-300'
                  : 'bg-[#071a16]/95 border-emerald-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Question */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug break-words">
                  {poll.question}
                </h4>
              </div>

              {/* Telegram Options List */}
              <div className="space-y-1.5">
                {poll.options.map((option, idx) => {
                  const voteCount = poll.results[idx] || 0;
                  const percentage =
                    poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                  const isSelected = poll.user_vote === idx;
                  const isWinning = voteCount === maxVotes && voteCount > 0;

                  if (!hasVoted && !isClosed) {
                    // Telegram Unvoted State: Compact clickable row
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={sending || voting}
                        onClick={() => handleVote(idx)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-950/70 hover:bg-emerald-950/50 hover:border-emerald-500/50 transition-all cursor-pointer group text-left"
                      >
                        <div className="w-4 h-4 rounded-full border border-slate-500 group-hover:border-emerald-400 group-hover:scale-110 flex items-center justify-center transition-all flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-xs text-slate-200 group-hover:text-white font-sans break-words flex-1">
                          {option}
                        </span>
                      </button>
                    );
                  }

                  // Telegram Voted State: Compact Progress fill bar
                  return (
                    <div
                      key={idx}
                      className={`relative w-full rounded-xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'border-slate-800/80 bg-slate-950/60'
                      }`}
                    >
                      {/* Animated Progress Fill Bar */}
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

                      {/* Content */}
                      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isSelected ? (
                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Check size={11} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-500 font-mono text-[10px]">
                              {idx + 1}
                            </div>
                          )}
                          <span
                            className={`break-words ${
                              isSelected ? 'text-emerald-200 font-semibold' : 'text-slate-200'
                            }`}
                          >
                            {option}
                          </span>
                        </div>

                        {/* Percentage & Vote Count */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1 font-mono text-[11px]">
                          <span
                            className={`font-bold ${
                              isSelected
                                ? 'text-emerald-300'
                                : isWinning
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {percentage}%
                          </span>
                          <span className="text-[10px] text-slate-500">({voteCount})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Footer */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/70 text-[10px] font-mono text-slate-400 flex-wrap gap-1">
                <span className="font-semibold text-slate-300">
                  {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'} · 24h
                </span>

                <div className="flex items-center gap-2">
                  {/* Retract vote */}
                  {hasVoted && !isClosed && onRetract && (
                    <button
                      type="button"
                      disabled={sending || voting}
                      onClick={handleRetract}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-emerald-300 transition hover:underline cursor-pointer"
                    >
                      <Undo2 size={11} />
                      <span>Retract vote</span>
                    </button>
                  )}

                  {/* Delete poll */}
                  {canDelete && onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this poll?')) {
                          void onDelete(poll.public_id);
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                      title="Delete poll"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Subtle status caption */}
            <span className="text-[9px] font-mono text-emerald-400/70 select-none mt-1 px-1">
              {hasVoted ? '✓ You voted · updates bump to latest' : 'Tap option to vote · 24h'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Compact Telegram-Style Create Poll Modal Dialog
 */
export function PollCreateModal({
  isOpen,
  onClose,
  onCreatePoll,
  sending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (data: { question: string; options: string[] }) => Promise<boolean>;
  sending: boolean;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const optionInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedQ = question.trim();
    const trimmedOpts = options.map((o) => o.trim()).filter((o) => o !== '');
    if (!trimmedQ || trimmedOpts.length < 2) return;
    const success = await onCreatePoll({ question: trimmedQ, options: trimmedOpts });
    if (success) {
      setQuestion('');
      setOptions(['', '']);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-4 sm:p-5 rounded-2xl bg-[#071915] border border-emerald-500/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-100"
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
            onClick={onClose}
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
            className="w-full bg-slate-950/90 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-sans shadow-inner transition"
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
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                  className="flex-1 bg-slate-950/90 border border-slate-700/90 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-sans shadow-inner transition"
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
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/30 transition shadow-sm cursor-pointer"
            >
              <Plus size={13} />
              <span>Add an option...</span>
            </button>
          )}
        </div>

        {/* Telegram Settings Card */}
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Anonymous Voting</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-cyan-400" />
              <span>Duration</span>
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
            onClick={onClose}
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
    </div>
  );
}

/**
 * Slim Active Poll Banner (height ~28px) at the top of the chat panel.
 * Lets users quickly see if there is an active poll and jump straight to it in the stream.
 */
export function ActivePollBanner({
  polls,
  onJumpToPoll,
}: {
  polls: PollItem[];
  onJumpToPoll: (pollPublicId: string) => void;
}) {
  const activePoll = polls.find((p) => !p.is_expired);
  if (!activePoll) return null;

  const remaining = getRemainingTime(activePoll.expires_at);

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-emerald-950/40 border-b border-emerald-500/20 text-[11px] font-mono text-emerald-300 backdrop-blur-sm animate-in fade-in">
      <div className="flex items-center gap-1.5 min-w-0 truncate">
        <BarChart3 size={12} className="text-emerald-400 flex-shrink-0" />
        <span className="text-emerald-400 font-semibold flex-shrink-0">Poll:</span>
        <span className="truncate text-slate-200">{activePoll.question}</span>
        <span className="text-slate-500 flex-shrink-0">·</span>
        <span className="text-emerald-400/80 flex-shrink-0 text-[10px]">{remaining.text}</span>
      </div>
      <button
        type="button"
        onClick={() => onJumpToPoll(activePoll.public_id)}
        className="ml-2 px-2 py-0.5 rounded text-[10px] bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/30 flex-shrink-0 transition cursor-pointer"
      >
        Jump to poll
      </button>
    </div>
  );
}

/**
 * Standard PollSection component maintained for backwards compatibility
 */
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
  const [internalCreateForm, setInternalCreateForm] = useState(false);
  const showCreateForm = isCreateOpen !== undefined ? isCreateOpen : internalCreateForm;

  const setShowCreateForm = (open: boolean) => {
    if (onToggleCreate) {
      onToggleCreate(open);
    } else {
      setInternalCreateForm(open);
    }
  };

  return (
    <>
      <PollCreateModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreatePoll={onCreatePoll}
        sending={sending}
      />
      <div className="space-y-3">
        {polls.map((poll) => (
          <PollCard
            key={poll.public_id}
            poll={poll}
            onVote={onVotePoll}
            onRetract={onRetractPollVote}
            onDelete={onDeletePoll}
            sending={sending}
          />
        ))}
      </div>
    </>
  );
}
