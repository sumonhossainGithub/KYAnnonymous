<?php

namespace App\Http\Controllers;

use App\Models\{AppSetting, AdminAuditLog, ChatRoom};
use App\Support\SiteSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SiteSettingsController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Settings', [
            'settings' => SiteSettings::all(), 'defaults' => SiteSettings::defaults(),
            'rooms' => ChatRoom::orderBy('name')->get(['public_id', 'name', 'slug', 'description', 'is_active']),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate(SiteSettings::rules());
        if (!ChatRoom::where('slug', $data['default_room_slug'])->where('is_active', true)->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['default_room_slug' => 'Choose an active default room.']);
        }
        foreach (SiteSettings::defaults() as $key => $value) {
            $data[$key] = is_bool($value) ? $request->boolean($key) : (is_int($value) ? (int) $data[$key] : ($data[$key] ?? ''));
        }
        $changed = array_keys(array_udiff_assoc($data, SiteSettings::all(), fn ($a, $b) => $a <=> $b));
        DB::transaction(function () use ($request, $data, $changed) {
            AppSetting::set('site_customization', json_encode($data, JSON_THROW_ON_ERROR));
            AdminAuditLog::create(['admin_id' => $request->user()->id, 'action' => 'SITE_SETTINGS_UPDATED', 'target_type' => 'settings', 'safe_metadata' => ['changed_fields' => $changed], 'created_at' => now()]);
        });
        return back()->with('success', 'Website settings saved.');
    }

    public function saveRoom(Request $request, ?string $publicId = null)
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:3', 'max:60'], 'description' => ['nullable', 'string', 'max:240'], 'is_active' => ['required', 'boolean']]);
        $room = $publicId ? ChatRoom::where('public_id', $publicId)->firstOrFail() : new ChatRoom(['slug' => (Str::slug($data['name']) ?: 'room').'-'.Str::lower(Str::ulid()), 'created_by' => $request->user()->id]);
        if (!$data['is_active'] && $room->slug === SiteSettings::get('default_room_slug')) {
            return back()->withErrors(['is_active' => 'Choose another default room before closing this one.']);
        }
        $room->fill($data)->save();
        AdminAuditLog::create(['admin_id' => $request->user()->id, 'action' => 'CHAT_ROOM_SAVED', 'target_type' => 'chat_room', 'target_public_id' => $room->public_id, 'created_at' => now()]);
        return back()->with('success', 'Chat room saved.');
    }
}
