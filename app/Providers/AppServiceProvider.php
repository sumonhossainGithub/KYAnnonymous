<?php

namespace App\Providers;

use App\Support\AnonymousDatabaseSessionHandler;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register custom session handler for database sessions without IP/UA (§29, §37)
        Session::extend('database', function ($app) {
            $table = $app['config']['session.table'];
            $lifetime = $app['config']['session.lifetime'];
            $connection = $app['config']['session.connection'];

            return new AnonymousDatabaseSessionHandler(
                DB::connection($connection),
                $table,
                $lifetime,
                $app
            );
        });
    }
}
