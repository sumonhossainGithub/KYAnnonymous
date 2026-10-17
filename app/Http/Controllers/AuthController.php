<?php

namespace App\Http\Controllers;

use App\Models\PasswordRecovery;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\Anonymity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    public function register(Request $request)
    {
        if (!\App\Support\SiteSettings::get('registration_enabled')) {
            return back()->withErrors(['username' => 'Registration is currently closed. Please check back later.']);
        }
        // Rate limit registrations based on HMAC IP digest (§29, §45)
        $ipHash = Anonymity::hashIp($request->ip());
        $limiterKey = 'register:' . $ipHash;

        if (RateLimiter::tooManyAttempts($limiterKey, 5)) {
            SecurityEvent::create([
                'event_type' => 'REGISTRATION_RATE_LIMIT',
                'pseudonymous_digest' => $ipHash,
            ]);
            return back()->withErrors(['username' => 'Too many registration attempts. Please wait before trying again.']);
        }
        RateLimiter::hit($limiterKey, 3600); // 5 per hour

        $request->validate([
            'display_name' => ['required', 'string', 'min:2', 'max:50', 'regex:/^[a-zA-Z0-9 _\-\p{L}]+$/u'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-zA-Z0-9_]+$/'],
            'gender' => ['required', 'in:Male,Female'],
            'show_gender' => ['boolean'],
            'password' => ['required', 'string', Password::min(8)],
        ]);

        $normalized = Anonymity::normalizeUsername($request->username);

        if (User::where('username_normalized', $normalized)->exists()) {
            return back()->withErrors(['username' => 'This username is already taken.']);
        }

        $user = User::create([
            'display_name' => trim(strip_tags($request->display_name)),
            'username' => trim($request->username),
            'username_normalized' => $normalized,
            'gender' => $request->gender,
            'show_gender' => $request->boolean('show_gender', false),
            'password' => Hash::make($request->password),
            'role' => 'USER',
            'status' => 'ACTIVE',
        ]);

        // Generate one-time recovery code (§10)
        $rawRecoveryCode = Anonymity::generateRecoveryCode();
        PasswordRecovery::create([
            'user_id' => $user->id,
            'recovery_code_hash' => Hash::make($rawRecoveryCode),
            'attempts' => 0,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        // Flash recovery code to session ONCE.
        return redirect()->route('recovery.display')->with('recovery_code', $rawRecoveryCode);
    }

    public function showRecoveryDisplay(Request $request)
    {
        $code = $request->session()->get('recovery_code');
        if (!$code) {
            return redirect()->route('home');
        }

        return Inertia::render('Auth/RecoveryDisplay', [
            'recoveryCode' => $code,
        ]);
    }

    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $normalized = Anonymity::normalizeUsername($request->username);
        $ipHash = Anonymity::hashIp($request->ip());
        $limiterKey = 'login:' . $normalized . ':' . $ipHash;

        if (RateLimiter::tooManyAttempts($limiterKey, 5)) {
            SecurityEvent::create([
                'event_type' => 'LOGIN_THROTTLED',
                'pseudonymous_digest' => $ipHash,
            ]);
            return back()->withErrors(['username' => 'Too many login attempts. Please wait 5 minutes.']);
        }

        $user = User::where('username_normalized', $normalized)->first();

        // Constant-time defense against username enumeration (§46)
        if (!$user || !Hash::check($request->password, $user->password)) {
            if (!$user) {
                // Compute dummy hash
                Hash::check($request->password, '$argon2id$v=19$m=65536,t=3,p=2$dummyhashforconstanttiming000$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
            }
            RateLimiter::hit($limiterKey, 300);

            return back()->withErrors(['username' => 'Invalid username or password.']);
        }

        if ($user->status === 'BANNED' || $user->status === 'SUSPENDED') {
            return back()->withErrors(['username' => 'This account has been suspended or banned.']);
        }

        RateLimiter::clear($limiterKey);

        Auth::login($user);
        $request->session()->regenerate();

        $intended = $request->session()->pull('url.intended');
        $targetUrl = '/';

        if ($intended) {
            $parsedPath = parse_url($intended, PHP_URL_PATH) ?: $intended;
            if (!in_array($parsedPath, ['/login', '/register', '/recovery'])) {
                $targetUrl = $intended;
            }
        }

        return Inertia::location($targetUrl);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Inertia::location('/');
    }

    public function showRecovery()
    {
        return Inertia::render('Auth/Recovery');
    }

    public function recoverPassword(Request $request)
    {
        $request->validate([
            'username' => ['required', 'string'],
            'recovery_code' => ['required', 'string'],
            'password' => ['required', 'string', Password::min(8)],
        ]);

        $normalized = Anonymity::normalizeUsername($request->username);
        $ipHash = Anonymity::hashIp($request->ip());
        $limiterKey = 'recover:' . $ipHash;

        if (RateLimiter::tooManyAttempts($limiterKey, 5)) {
            return back()->withErrors(['recovery_code' => 'Too many recovery attempts. Please wait.']);
        }
        RateLimiter::hit($limiterKey, 900);

        $user = User::where('username_normalized', $normalized)->first();

        if (!$user) {
            return back()->withErrors(['recovery_code' => 'Invalid recovery credentials provided.']);
        }

        $recovery = PasswordRecovery::where('user_id', $user->id)->first();
        if (!$recovery || !Hash::check(strtoupper(trim($request->recovery_code)), $recovery->recovery_code_hash)) {
            return back()->withErrors(['recovery_code' => 'Invalid recovery credentials provided.']);
        }

        // Rotate password and generate NEW single-use recovery code (§10)
        $user->password = Hash::make($request->password);
        $user->force_password_reset = false;
        $user->save();

        $newRecoveryCode = Anonymity::generateRecoveryCode();
        $recovery->recovery_code_hash = Hash::make($newRecoveryCode);
        $recovery->attempts = 0;
        $recovery->used_at = now();
        $recovery->save();

        // Invalidate all other sessions (§10, §37)
        \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $user->id)->delete();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('recovery.display')->with('recovery_code', $newRecoveryCode);
    }
}
