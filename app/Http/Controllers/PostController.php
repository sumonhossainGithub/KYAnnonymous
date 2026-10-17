<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\ChatRoom;
use App\Models\Notice;
use App\Models\Organization;
use App\Models\Post;
use App\Models\PostVote;
use App\Support\Anonymity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;

class PostController extends Controller
{
    public function feed(Request $request)
    {
        $sort = $request->input('sort', 'new'); // new, top, discussed
        $orgSlug = $request->input('organization');

        $query = Post::with(['author', 'organization'])
            ->where('status', 'ACTIVE');

        if ($orgSlug) {
            $org = Organization::where('slug', $orgSlug)->where('status', 'ACTIVE')->first();
            if ($org) {
                $query->where('organization_id', $org->id);
            }
        }

        if ($sort === 'top') {
            $query->orderBy('score', 'desc')->orderBy('created_at', 'desc');
        } elseif ($sort === 'discussed') {
            $query->orderBy('comments_count', 'desc')->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $posts = $query->paginate(20)->withQueryString();

        // Attach authenticated user's current votes if logged in
        $userVotes = [];
        if ($request->user()) {
            $postIds = $posts->pluck('id')->toArray();
            $userVotes = PostVote::where('user_id', $request->user()->id)
                ->whereIn('post_id', $postIds)
                ->pluck('vote', 'post_id')
                ->toArray();
        }

        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');

        $formattedPosts = $posts->through(function ($post) use ($userVotes, $adminStealth) {
            $isGhost = (bool) ($post->is_ghost ?? false);
            $isAuthorSuperAdmin = $post->author && $post->author->isSuperAdmin();

            if ($isGhost) {
                $authorData = [
                    'public_id' => 'ghost-' . substr(md5($post->public_id), 0, 6),
                    'display_name' => $post->alias_name ?: 'Ghost Node',
                    'username' => 'ghost_' . substr(md5($post->public_id), 0, 4),
                    'is_ghost' => true,
                ];
            } elseif ($isAuthorSuperAdmin && $adminStealth) {
                $authorData = [
                    'public_id' => 'system-node',
                    'display_name' => '[CORE_NODE]',
                    'username' => 'system_core',
                    'is_ghost' => true,
                ];
            } else {
                $authorData = [
                    'public_id' => $post->author->public_id,
                    'display_name' => $post->author->display_name,
                    'username' => $post->author->username,
                    'avatar_url' => $post->author->avatar_url,
                    'is_ghost' => false,
                ];
            }

            return [
                'public_id' => $post->public_id,
                'title' => $post->title,
                'body' => $post->body,
                'upvotes_count' => $post->upvotes_count,
                'downvotes_count' => $post->downvotes_count,
                'score' => $post->score,
                'comments_count' => $post->comments_count,
                'comments_locked' => $post->comments_locked,
                'created_at' => $post->created_at->diffForHumans(),
                'is_ghost' => $isGhost,
                'author' => $authorData,
                'organization' => $post->organization ? [
                    'public_id' => $post->organization->public_id,
                    'name' => $post->organization->name,
                    'slug' => $post->organization->slug,
                ] : null,
                'user_vote' => $userVotes[$post->id] ?? 0,
            ];
        });

        $organizations = Organization::where('status', 'ACTIVE')->orderBy('sort_order')->get(['public_id', 'name', 'slug']);
        $notices = Notice::where('status', 'PUBLISHED')
            ->orderBy('pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->take(3)
            ->get(['public_id', 'title', 'body', 'pinned', 'created_at']);

        return Inertia::render('Feed/Index', [
            'posts' => $formattedPosts,
            'organizations' => $organizations,
            'notices' => $notices,
            'currentSort' => $sort,
            'currentOrg' => $orgSlug,
            'emergencyLockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
            'rooms' => ChatRoom::where('is_active', true)->withCount('messages')->orderBy('created_at')->take(6)->get(['id', 'public_id', 'name', 'slug', 'description']),
        ]);
    }

    public function showCreate()
    {
        $organizations = Organization::where('status', 'ACTIVE')->orderBy('sort_order')->get(['id', 'public_id', 'name']);
        return Inertia::render('Feed/CreatePost', [
            'organizations' => $organizations->map(fn($o) => ['public_id' => $o->public_id, 'name' => $o->name]),
            'emergencyLockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
        ]);
    }

    public function store(Request $request)
    {
        if (!\App\Support\SiteSettings::get('posts_enabled') && !$request->user()->isSuperAdmin()) {
            return back()->withErrors(['title' => 'New posts are currently paused by admin.']);
        }
        if (\App\Models\AppSetting::isTrue('emergency_lockdown') && !$request->user()->isSuperAdmin()) {
            return back()->withErrors(['title' => 'Platform is under security lockdown. Submissions are temporarily paused.']);
        }

        $ipHash = Anonymity::hashIp($request->ip());
        $limiterKey = 'post:' . $request->user()->id . ':' . $ipHash;

        if (RateLimiter::tooManyAttempts($limiterKey, 10)) {
            return back()->withErrors(['title' => 'Posting rate limit exceeded. Please wait a moment.']);
        }
        RateLimiter::hit($limiterKey, 60);

        $request->validate([
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'body' => ['required', 'string', 'min:3', 'max:10000'],
            'organization_public_id' => ['nullable', 'string', 'exists:organizations,public_id'],
            'is_ghost' => ['nullable', 'boolean'],
        ]);

        $orgId = null;
        if ($request->organization_public_id) {
            $org = Organization::where('public_id', $request->organization_public_id)->first();
            $orgId = $org?->id;
        }

        $isGhost = $request->boolean('is_ghost', false);
        if ($isGhost && !\App\Support\SiteSettings::get('anonymous_enabled')) {
            return back()->withErrors(['title' => 'Anonymous aliases are currently disabled.']);
        }
        $aliasName = null;
        if ($isGhost) {
            $aliasName = 'Ghost-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
        }

        $post = Post::create([
            'user_id' => $request->user()->id,
            'organization_id' => $orgId,
            'title' => trim(strip_tags($request->title)),
            'body' => trim(strip_tags($request->body)), // Plaintext only (§42)
            'status' => 'ACTIVE',
            'is_ghost' => $isGhost,
            'alias_name' => $aliasName,
        ]);

        return redirect()->route('posts.show', $post->public_id);
    }

    public function show(Request $request, string $publicId)
    {
        $post = Post::with(['author', 'organization'])
            ->where('public_id', $publicId)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $comments = Comment::with('author')
            ->where('post_id', $post->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $userVote = 0;
        if ($request->user()) {
            $v = PostVote::where('post_id', $post->id)->where('user_id', $request->user()->id)->first();
            $userVote = $v ? $v->vote : 0;
        }

        // Build hierarchical tree up to depth 3 (§15)
        $commentTree = $this->buildCommentTree($comments, null);

        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        $isGhost = (bool) ($post->is_ghost ?? false);
        $isAuthorSuperAdmin = $post->author && $post->author->isSuperAdmin();

        if ($isGhost) {
            $authorData = [
                'public_id' => 'ghost-' . substr(md5($post->public_id), 0, 6),
                'display_name' => $post->alias_name ?: 'Ghost Node',
                'username' => 'ghost_' . substr(md5($post->public_id), 0, 4),
                'is_ghost' => true,
            ];
        } elseif ($isAuthorSuperAdmin && $adminStealth) {
            $authorData = [
                'public_id' => 'system-node',
                'display_name' => '[CORE_NODE]',
                'username' => 'system_core',
                'is_ghost' => true,
            ];
        } else {
            $authorData = [
                'public_id' => $post->author->public_id,
                'display_name' => $post->author->display_name,
                'username' => $post->author->username,
                'avatar_url' => $post->author->avatar_url,
                'is_ghost' => false,
            ];
        }

        return Inertia::render('Feed/ShowPost', [
            'post' => [
                'public_id' => $post->public_id,
                'title' => $post->title,
                'body' => $post->body,
                'upvotes_count' => $post->upvotes_count,
                'downvotes_count' => $post->downvotes_count,
                'score' => $post->score,
                'comments_count' => $post->comments_count,
                'comments_locked' => $post->comments_locked,
                'created_at' => $post->created_at->diffForHumans(),
                'is_ghost' => $isGhost,
                'author' => $authorData,
                'organization' => $post->organization ? [
                    'public_id' => $post->organization->public_id,
                    'name' => $post->organization->name,
                    'slug' => $post->organization->slug,
                ] : null,
                'user_vote' => $userVote,
            ],
            'comments' => $commentTree,
        ]);
    }

    public function vote(Request $request, string $publicId)
    {
        $request->validate([
            'vote' => ['required', 'in:1,-1,0'],
        ]);

        $post = Post::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $desiredVote = (int) $request->vote;

        // Atomic Vote Transaction (§14)
        DB::transaction(function () use ($post, $user, $desiredVote) {
            $existing = PostVote::where('post_id', $post->id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if ($desiredVote === 0 || ($existing && $existing->vote === $desiredVote)) {
                // Remove vote
                if ($existing) {
                    $existing->delete();
                }
            } else {
                // Upsert vote
                PostVote::updateOrCreate(
                    ['post_id' => $post->id, 'user_id' => $user->id],
                    ['vote' => $desiredVote]
                );
            }

            // Recalculate counts safely
            $upvotes = PostVote::where('post_id', $post->id)->where('vote', 1)->count();
            $downvotes = PostVote::where('post_id', $post->id)->where('vote', -1)->count();
            $post->upvotes_count = $upvotes;
            $post->downvotes_count = $downvotes;
            $post->score = $upvotes - $downvotes;
            $post->save();
        });

        return back();
    }

    public function addComment(Request $request, string $publicId)
    {
        if (!\App\Support\SiteSettings::get('comments_enabled')) {
            return back()->withErrors(['body' => 'New comments are currently paused by admin.']);
        }
        $post = Post::where('public_id', $publicId)->firstOrFail();

        if ($post->comments_locked) {
            return back()->withErrors(['body' => 'Comments are locked on this post.']);
        }

        $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
            'parent_public_id' => ['nullable', 'string', 'exists:comments,public_id'],
        ]);

        $depth = 0;
        $parentId = null;
        if ($request->parent_public_id) {
            $parent = Comment::where('public_id', $request->parent_public_id)->firstOrFail();
            $depth = min($parent->depth + 1, 3); // Max depth 3 (§15)
            $parentId = $parent->id;
        }

        Comment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'parent_id' => $parentId,
            'depth' => $depth,
            'body' => trim(strip_tags($request->body)),
            'status' => 'ACTIVE',
        ]);

        $post->increment('comments_count');

        return back();
    }

    private function buildCommentTree($comments, $parentId = null): array
    {
        $branch = [];
        foreach ($comments as $comment) {
            if ($comment->parent_id == $parentId) {
                $children = $this->buildCommentTree($comments, $comment->id);
                $branch[] = [
                    'public_id' => $comment->public_id,
                    'body' => $comment->status === 'DELETED' ? '[deleted]' : $comment->body,
                    'depth' => $comment->depth,
                    'status' => $comment->status,
                    'created_at' => $comment->created_at->diffForHumans(),
                    'author' => $comment->status === 'DELETED' ? ['display_name' => 'Deleted User', 'username' => 'deleted', 'avatar_url' => null] : [
                        'public_id' => $comment->author->public_id,
                        'display_name' => $comment->author->display_name,
                        'username' => $comment->author->username,
                        'avatar_url' => $comment->author ? $comment->author->avatar_url : null,
                    ],
                    'replies' => $children,
                ];
            }
        }
        return $branch;
    }
}
