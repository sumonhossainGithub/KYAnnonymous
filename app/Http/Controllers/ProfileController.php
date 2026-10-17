<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'user' => [
                'public_id' => $user->public_id,
                'display_name' => $user->display_name,
                'username' => $user->username,
                'gender' => $user->gender,
                'show_gender' => (bool) $user->show_gender,
                'avatar_url' => $user->avatar_url,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at ? $user->created_at->format('M d, Y') : null,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'display_name' => ['required', 'string', 'min:2', 'max:50', 'regex:/^[a-zA-Z0-9 _\-\p{L}]+$/u'],
            'show_gender' => ['boolean'],
        ]);

        $user->display_name = trim(strip_tags((string) $request->display_name));
        $user->show_gender = $request->boolean('show_gender', false);
        $user->save();

        return back()->with('success', 'Profile details updated.');
    }

    public function updateAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp,gif,svg', 'max:2048'],
            'avatar_preset' => ['nullable', 'string', 'max:500'],
        ]);

        if ($request->hasFile('avatar_file')) {
            $file = $request->file('avatar_file');
            $extension = $file->getClientOriginalExtension() ?: 'png';
            $filename = 'avatar_' . $user->public_id . '_' . time() . '.' . $extension;
            
            $destinationPath = public_path('uploads/avatars');
            if (!File::isDirectory($destinationPath)) {
                File::makeDirectory($destinationPath, 0755, true);
            }

            // Remove previous local avatar if one existed
            if ($user->avatar_url && Str::startsWith($user->avatar_url, '/uploads/avatars/')) {
                $oldPath = public_path(ltrim($user->avatar_url, '/'));
                if (File::exists($oldPath)) {
                    File::delete($oldPath);
                }
            }

            $file->move($destinationPath, $filename);
            $user->avatar_url = '/uploads/avatars/' . $filename;
            $user->save();

            return back()->with('success', 'Profile image uploaded successfully!');
        }

        if ($preset = $request->input('avatar_preset')) {
            // Remove previous local avatar if one existed
            if ($user->avatar_url && Str::startsWith($user->avatar_url, '/uploads/avatars/')) {
                $oldPath = public_path(ltrim($user->avatar_url, '/'));
                if (File::exists($oldPath)) {
                    File::delete($oldPath);
                }
            }

            $user->avatar_url = trim($preset);
            $user->save();

            return back()->with('success', 'Profile avatar updated!');
        }

        return back()->withErrors(['avatar' => 'Please select an image file or choose an avatar preset.']);
    }

    public function removeAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_url && Str::startsWith($user->avatar_url, '/uploads/avatars/')) {
            $oldPath = public_path(ltrim($user->avatar_url, '/'));
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }

        $user->avatar_url = null;
        $user->save();

        return back()->with('success', 'Profile image removed. Default avatar restored.');
    }
}
