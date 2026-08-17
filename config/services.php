<?php

return [
    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'microsoft' => [
        'tenant_id' => env('AZURE_TENANT_ID'),
        'client_id' => env('AZURE_CLIENT_ID'),
        'client_secret' => env('AZURE_CLIENT_SECRET'),
        'redirect_uri' => env('AZURE_REDIRECT_URI'),
        'login_redirect_uri' => env('AZURE_LOGIN_REDIRECT_URI'),
    ],

    'planner' => [
        'plan_id' => env('PLANNER_PLAN_ID'),
        'bucket_name' => env('PLANNER_BUCKET_NAME'),
        'expected_account' => env('PLANNER_EXPECTED_ACCOUNT'),
        'notification_email' => env('PLANNER_NOTIFICATION_EMAIL', env('PLANNER_EXPECTED_ACCOUNT')),
    ],
];
