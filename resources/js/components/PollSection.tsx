import { useState, type FormEvent } from 'react';
import { usePage } from '@inertiajs/react';
import type { PollItem, SharedProps } from '@/types';
import { BarChart3, Plus, X, Vote, Clock, CheckCircle2, Trash2 } from 'lucide-react';

interface PollSectionProps {
  polls: PollItem[];
  onCreatePoll: (data: { question: string; options: string[] }) => Promise<boolean>;
  onVotePoll: (pollPublicId: string, optionIndex: number) => Promise<boolean>;
  onDeletePoll?: (pollPublicId: string) => Promise<boolean>;
  canCreate: boolean;
  sending: boolean;
  isCreateOpen?: boolean;
  onToggleCreate?: (open: boolean) => void;
}

export default function PollSection({
  polls,
  onCreatePoll,
  onVotePoll,
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

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    setOptions(options.map((o, i) => (i === idx ? value : o)));
  };

  const handleCreatePoll = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedQ = question.trim();
    const trimmedOpts = options.map(o => o.trim()).filter(o => o !== '');
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

  if (polls.length === 0 && !showCreateForm) return null;

  return (
    <div className="mb-4">
      {/* Poll Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300 uppercase tracking-wider">
          <BarChart3 size={13} className="text-emerald-400" />
          <span>Live Polls</span>
          {polls.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[9px] text-emerald-300">
              {polls.length}
            </span>
          )}
        </span>
        {canCreate && auth.user && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono transition ${
              showCreateForm
                ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-emerald-300'
            }`}
          >
            {showCreateForm ? <X size={11} /> : <Plus size={11} />}
            <span>{showCreateForm ? 'Cancel' : 'Create Poll'}</span>
          </button>
        )}
      </div>

      {/* Create Poll Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreatePoll}
          className="mb-4 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 shadow-lg backdrop-blur-sm space-y-3"
        >
          <div>
            <label className="block font-mono text-[10px] text-slate-300 mb-1 uppercase tracking-wider">
              Poll Question
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] text-slate-300 mb-1 uppercase tracking-wider">
              Options (2-6)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-500 w-4 text-center flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition"
              >
                <Plus size={11} />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !question.trim() || options.filter(o => o.trim()).length < 2}
              className="button button-small !py-1.5 !px-4 !text-[10px]"
            >
              <BarChart3 size={12} />
              <span>{sending ? 'Creating…' : 'Create Poll'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Polls */}
      {polls.length > 0 && (
        <div className="space-y-3">
          {polls.map((poll) => {
            const hasVoted = poll.user_vote !== null;
            const maxVotes = Math.max(...poll.results, 1);

            return (
              <div
                key={poll.public_id}
                className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${
                  poll.is_expired
                    ? 'bg-slate-900/60 border-slate-700/50'
                    : 'bg-slate-900/80 border-emerald-500/25'
                }`}
              >
                {/* Poll Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Vote size={13} className="text-emerald-400 flex-shrink-0" />
                      <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-wider">
                        POLL
                      </span>
                      {poll.is_expired && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-600/50 text-[8px] font-mono text-slate-400 uppercase">
                          Ended
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 leading-snug break-words">
                      {poll.question}
                    </h4>
                  </div>
                </div>

                {/* Poll Options */}
                <div className="space-y-2">
                  {poll.options.map((option, idx) => {
                    const voteCount = poll.results[idx] || 0;
                    const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
                    const isSelected = poll.user_vote === idx;
                    const isWinning = voteCount === maxVotes && voteCount > 0;

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={hasVoted || poll.is_expired || sending || votingPoll === poll.public_id}
                        onClick={() => handleVote(poll.public_id, idx)}
                        className={`w-full text-left relative overflow-hidden rounded-lg border transition group ${
                          isSelected
                            ? 'border-emerald-500/60 bg-emerald-950/40'
                            : hasVoted || poll.is_expired
                            ? 'border-slate-700/50 bg-slate-950/50'
                            : 'border-slate-700/60 bg-slate-950/70 hover:border-emerald-500/40 hover:bg-slate-900/80 cursor-pointer'
                        }`}
                      >
                        {/* Vote percentage bar (shown after voting) */}
                        {(hasVoted || poll.is_expired) && (
                          <div
                            className={`absolute inset-0 transition-all duration-700 ease-out ${
                              isWinning
                                ? 'bg-emerald-500/15'
                                : 'bg-slate-500/8'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected ? (
                              <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                            ) : (
                              <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 ${
                                hasVoted || poll.is_expired
                                  ? 'border-slate-600'
                                  : 'border-slate-500 group-hover:border-emerald-400'
                              }`} />
                            )}
                            <span className={`text-xs break-words ${
                              isSelected ? 'text-emerald-200 font-medium' : 'text-slate-200'
                            }`}>
                              {option}
                            </span>
                          </div>
                          {(hasVoted || poll.is_expired) && (
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className={`text-[10px] font-mono ${
                                isWinning ? 'text-emerald-300 font-bold' : 'text-slate-400'
                              }`}>
                                {percentage}%
                              </span>
                              <span className="text-[9px] font-mono text-slate-500">
                                ({voteCount})
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Poll Footer */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-slate-500">
                    <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>by {poll.creator.display_name}</span>
                    {poll.creator.is_admin && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-300 font-mono">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                      <Clock size={10} />
                      <span>{poll.created_at}</span>
                    </span>
                    {onDeletePoll && auth.user && (auth.user.role === 'SUPER_ADMIN' || (poll.creator.public_id && auth.user.public_id === poll.creator.public_id)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this poll?')) {
                            void onDeletePoll(poll.public_id);
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
            );
          })}
        </div>
      )}
    </div>
  );
}
