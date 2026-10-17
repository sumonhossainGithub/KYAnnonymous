<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\Anonymity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateSuperAdmin extends Command
{
    /**
     * The name and signature of the console command (§22).
     * Password is NOT taken as an argument to avoid shell history leakage.
     */
    protected $signature = 'app:create-super-admin {username?}';

    /**
     * The console command description.
     */
    protected $description = 'Create the single Super Admin account for KYAnonymous';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // 1. Enforce single Super Admin rule
        $existingAdmin = User::where('role', 'SUPER_ADMIN')->first();
        if ($existingAdmin) {
            $this->error('A Super Admin account already exists (@' . $existingAdmin->username . '). Only exactly ONE Super Admin is permitted.');
            return self::FAILURE;
        }

        $username = $this->argument('username') ?: $this->ask('Enter Super Admin Username');
        if (empty($username)) {
            $this->error('Username cannot be empty.');
            return self::FAILURE;
        }

        $normalized = Anonymity::normalizeUsername($username);

        if (User::where('username_normalized', $normalized)->exists()) {
            $this->error('Username is already taken by another account.');
            return self::FAILURE;
        }

        $displayName = $this->ask('Enter Super Admin Display Name', 'Super Admin');

        // Prompt securely without echoing to shell
        $password = $this->secret('Enter Super Admin Password (min 12 chars)');
        if (strlen($password) < 12) {
            $this->error('Super Admin password must be at least 12 characters.');
            return self::FAILURE;
        }

        $confirm = $this->secret('Confirm Super Admin Password');
        if ($password !== $confirm) {
            $this->error('Passwords do not match.');
            return self::FAILURE;
        }

        $admin = User::create([
            'display_name' => $displayName,
            'username' => $username,
            'username_normalized' => $normalized,
            'gender' => 'Male',
            'show_gender' => false,
            'password' => Hash::make($password),
            'role' => 'SUPER_ADMIN',
            'status' => 'ACTIVE',
        ]);

        $this->info("Super Admin account created successfully! Public ID: {$admin->public_id}, Username: @{$admin->username}");
        return self::SUCCESS;
    }
}
