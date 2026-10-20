<?php

namespace App\Services\Ghost;

class CommandParser
{
    /**
     * Parse a message for the /ai slash command.
     *
     * Format: ^\s*\/ai(?=\s|$) with case-insensitivity.
     *
     * @param string $message
     * @return array|null Null if not a valid command, or array ['is_command' => true, 'prompt' => string, 'is_empty' => bool]
     */
    public static function parse(string $message): ?array
    {
        if (preg_match('/^\s*\/ai(?=\s|$)(.*)$/is', $message, $matches)) {
            $rawPrompt = trim($matches[1]);
            $isEmpty = ($rawPrompt === '');

            return [
                'is_command' => true,
                'prompt' => $isEmpty ? 'hello' : $rawPrompt,
                'is_empty' => $isEmpty,
            ];
        }

        return null;
    }

    /**
     * Check if a message is an /ai slash command without returning full payload.
     *
     * @param string $message
     * @return bool
     */
    public static function isCommand(string $message): bool
    {
        return (bool) preg_match('/^\s*\/ai(?=\s|$)/i', $message);
    }
}
