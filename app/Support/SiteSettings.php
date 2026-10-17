<?php

namespace App\Support;

use App\Models\AppSetting;

class SiteSettings
{
    public static function defaults(): array
    {
        return [
            'site_name' => 'KYAnonymous', 'tagline' => '', 'logo_text' => '👻',
            'primary_color' => '#10b981', 'background_color' => '#030c0e', 'surface_color' => '#081a17',
            'corner_radius' => 12, 'font_family' => 'system', 'density' => 'comfortable', 'animations_enabled' => true,
            'homepage_layout' => 'chat', 'default_room_slug' => 'common-orbit',
            'homepage_title' => '',
            'homepage_description' => '',
            'welcome_message' => 'Welcome! Be kind and keep personal information private.',
            'announcement_enabled' => false, 'announcement_text' => '',
            'footer_text' => 'A community built for open conversations.',
            'rules_text' => '', 'privacy_text' => '',
            'registration_enabled' => true, 'chat_enabled' => true, 'guest_chat_enabled' => true,
            'member_rooms_enabled' => true, 'anonymous_enabled' => true, 'replies_enabled' => true,
            'posts_enabled' => true, 'comments_enabled' => true,
            'message_max_length' => 1000, 'message_rate_limit' => 30, 'guest_rate_limit' => 20,
            'poll_interval' => 2500, 'history_limit' => 500, 'guest_retention_minutes' => 43200,
        ];
    }

    public static function all(): array
    {
        $stored = json_decode(AppSetting::get('site_customization', '{}'), true) ?: [];
        return array_replace(static::defaults(), array_intersect_key($stored, static::defaults()));
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::all()[$key] ?? $default;
    }

    public static function rules(): array
    {
        $rules = [];
        foreach (static::defaults() as $key => $value) {
            $rules[$key] = is_bool($value) ? ['required', 'boolean'] : ['present', 'nullable', 'string', 'max:500'];
        }
        foreach (['site_name' => 50, 'logo_text' => 8, 'welcome_message' => 500, 'footer_text' => 200] as $key => $max) {
            $rules[$key] = ['required', 'string', "max:$max"];
        }
        $rules['homepage_title'] = ['present', 'nullable', 'string', 'max:120'];
        $rules['tagline'] = ['present', 'nullable', 'string', 'max:100'];
        $rules['homepage_description'] = ['present', 'nullable', 'string', 'max:500'];
        foreach (['rules_text', 'privacy_text'] as $key) $rules[$key] = ['present', 'nullable', 'string', 'max:15000'];
        foreach (['primary_color', 'background_color', 'surface_color'] as $key) $rules[$key] = ['required', 'regex:/^#[0-9a-fA-F]{6}$/'];
        $rules['font_family'] = ['required', 'in:system,mono,serif'];
        $rules['density'] = ['required', 'in:comfortable,compact'];
        $rules['homepage_layout'] = ['required', 'in:chat,feed'];
        $rules['default_room_slug'] = ['required', 'string', 'exists:chat_rooms,slug'];
        foreach (['corner_radius' => [0, 24], 'message_max_length' => [50, 2000], 'message_rate_limit' => [1, 60], 'guest_rate_limit' => [1, 30], 'poll_interval' => [1000, 10000], 'history_limit' => [10, 2000], 'guest_retention_minutes' => [1, 43200]] as $key => [$min, $max]) {
            $rules[$key] = ['required', 'integer', "min:$min", "max:$max"];
        }
        return $rules;
    }
}
