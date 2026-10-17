import React, { useState } from 'react';
import { useForm, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import type { Post, Comment, SharedProps } from '@/types';
import { ArrowBigUp, ArrowBigDown, MessageSquare, ArrowLeft, Flag, CornerDownRight, Send, Ghost, Lock } from 'lucide-react';

interface Props {
  post: Post;
  comments: Comment[];
}

export default function ShowPost({ post, comments }: Props) {
  const { site } = usePage<SharedProps>().props;
  const commentsLocked = post.comments_locked || !site.comments_enabled;
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const commentForm = useForm({
    body: '',
    parent_public_id: '',
  });

  const reportForm = useForm({
    target_type: 'post',
    target_public_id: post.public_id,
    reason: 'Spam',
    notes: '',
  });

  const handleVote = (desiredVote: number) => {
    const voteToSend = post.user_vote === desiredVote ? 0 : desiredVote;
    router.post(`/posts/${post.public_id}/vote`, { vote: voteToSend }, { preserveScroll: true });
  };

  const handleCommentSubmit = (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    commentForm.setData('parent_public_id', parentId || '');
    commentForm.post(`/posts/${post.public_id}/comments`, {
      preserveScroll: true,
      onSuccess: () => {
        commentForm.reset('body');
        setReplyTo(null);
      },
    });
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reportForm.post('/reports', {
      preserveScroll: true,
      onSuccess: () => {
        setShowReportModal(false);
        reportForm.reset('notes');
      },
    });
  };

  const renderComment = (comment: Comment) => (
    <div
      key={comment.public_id}
      className={`comment-card ${comment.depth > 0 ? 'comment-reply' : ''} mt-3 p-3.5 bg-slate-950/80 border border-cyan-950/60 rounded-xl`}
    >
      <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-400 mb-1 font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 flex-shrink-0">
            {comment.author.avatar_url ? (
              <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-cyan-300 font-bold">{comment.author.display_name.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="font-semibold text-slate-200">{comment.author.display_name}</span>
          <span className="text-slate-500">@{comment.author.username}</span>
          <span>•</span>
          <span className="text-[11px]">{comment.created_at}</span>
        </div>
        {comment.depth < 3 && !commentsLocked && (
          <button
            onClick={() => setReplyTo(replyTo === comment.public_id ? null : comment.public_id)}
            className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center space-x-1"
          >
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">{comment.body}</p>

      {/* Reply Input Box */}
      {replyTo === comment.public_id && (
        <form onSubmit={(e) => handleCommentSubmit(e, comment.public_id)} className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            value={commentForm.data.body}
            onChange={(e) => commentForm.setData('body', e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-cyan-950 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
          />
          <button
            type="submit"
            disabled={commentForm.processing}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold rounded-lg transition"
          >
            Reply
          </button>
        </form>
      )}

      {comment.replies && comment.replies.map((reply) => renderComment(reply))}
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Feed</span>
        </Link>

        {/* Post Container */}
        <div className="p-4 sm:p-6 bg-slate-950/80 border border-cyan-950/70 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-400 mb-3 font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 flex-shrink-0">
                {post.is_ghost ? (
                  <Ghost className="w-3.5 h-3.5 text-cyan-400" />
                ) : post.author.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-cyan-300 font-bold">{post.author.display_name.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className={`font-semibold ${post.is_ghost ? 'text-cyan-300' : 'text-slate-200'}`}>
                {post.author.display_name}
              </span>
              <span className="text-slate-500">@{post.author.username}</span>
              <span>•</span>
              <span>{post.created_at}</span>
              {post.organization && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400 font-medium">[{post.organization.name}]</span>
                </>
              )}
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="text-slate-500 hover:text-rose-400 text-xs flex items-center space-x-1 transition"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>

          <h1 className="text-xl font-bold text-slate-100 mb-3">{post.title}</h1>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line mb-6 font-sans">{post.body}</p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 border-t border-cyan-950/40 pt-4 font-mono">
            <div className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-cyan-950">
              <button
                onClick={() => handleVote(1)}
                className={`p-1 rounded transition ${
                  post.user_vote === 1 ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'
                }`}
              >
                <ArrowBigUp className="w-5 h-5 fill-current" />
              </button>
              <span className={`text-xs font-bold px-1 ${post.score > 0 ? 'text-cyan-400' : post.score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {post.score}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className={`p-1 rounded transition ${
                  post.user_vote === -1 ? 'text-rose-400' : 'text-slate-500 hover:text-rose-400'
                }`}
              >
                <ArrowBigDown className="w-5 h-5 fill-current" />
              </button>
            </div>

            <span className="text-xs text-slate-400 flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>{post.comments_count} Comments</span>
            </span>

            {commentsLocked && (
              <span className="text-xs text-amber-400 flex items-center gap-1 ml-auto">
                <Lock className="w-3.5 h-3.5" />
                <span>Comments Locked</span>
              </span>
            )}
          </div>
        </div>

        {/* Comment Section */}
        <div className="mt-6">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3">
            Comments ({post.comments_count})
          </h3>

          {!commentsLocked ? (
            <form onSubmit={(e) => handleCommentSubmit(e, null)} className="mb-6">
              <textarea
                required
                rows={3}
                value={commentForm.data.body}
                onChange={(e) => commentForm.setData('body', e.target.value)}
                placeholder="Write your comment..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-cyan-950 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
              />
              <button
                type="submit"
                disabled={commentForm.processing}
                className="mt-2 py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold rounded-xl transition flex items-center space-x-1.5 shadow"
              >
                <span>Post Comment</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-500 font-mono mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Comments are closed for this post.</span>
            </div>
          )}

          {/* Comments Nested Tree */}
          <div className="space-y-3">
            {comments.map((comment) => renderComment(comment))}
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="report-modal fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-label="Report Post" className="bg-slate-950 border border-cyan-950 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
              <h3 className="text-base font-bold font-mono text-slate-100 mb-3">Report Post</h3>
              <form onSubmit={handleReportSubmit} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Reason</label>
                  <select
                    value={reportForm.data.reason}
                    onChange={(e) => reportForm.setData('reason', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-cyan-950 rounded-xl text-slate-100 text-xs"
                  >
                    {['Spam', 'Harassment', 'Threat', 'Personal Information', 'Abuse', 'Impersonation', 'Other'].map(
                      (r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Details (Optional)</label>
                  <textarea
                    rows={3}
                    value={reportForm.data.notes}
                    onChange={(e) => reportForm.setData('notes', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-cyan-950 rounded-xl text-slate-100 text-xs font-sans"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportForm.processing}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
