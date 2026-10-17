<?php
/**
 * CLI utility to reset a user's password to Bcrypt.
 * Usage: php reset_password.php <username> <new_password>
 * Example: php reset_password.php venom admin12345
 */

if ($argc < 3) {
    echo "Usage: php reset_password.php <username> <new_password>\n";
    echo "Example: php reset_password.php venom mynewpassword\n";
    exit(1);
}

$username = trim($argv[1]);
$newPassword = $argv[2];

if (strlen($newPassword) < 8) {
    echo "Error: Password must be at least 8 characters.\n";
    exit(1);
}

$dbPath = __DIR__ . '/database/database.sqlite';
if (!file_exists($dbPath)) {
    echo "Error: Database file not found at $dbPath\n";
    exit(1);
}

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $normalized = mb_strtolower(trim($username), 'UTF-8');
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE username_normalized = ? OR username = ?");
    $stmt->execute([$normalized, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "Error: User '{$username}' not found in database.\n";
        exit(1);
    }

    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $update = $pdo->prepare("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?");
    $update->execute([$hash, $user['id']]);

    echo "SUCCESS: Password for user '{$user['username']}' (Role: {$user['role']}) has been updated using Bcrypt.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
