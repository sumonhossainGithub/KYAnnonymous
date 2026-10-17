<?php

namespace Tests\Unit;

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    private string $hotFile;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hotFile = tempnam(sys_get_temp_dir(), 'kyanonymous-vite-');
        Vite::useHotFile($this->hotFile);
    }

    protected function tearDown(): void
    {
        if (is_file($this->hotFile)) {
            unlink($this->hotFile);
        }
        parent::tearDown();
    }

    public function test_local_development_allows_the_actual_vite_origin(): void
    {
        $this->app->instance('env', 'local');
        file_put_contents($this->hotFile, "http://localhost:5199/\n");

        $policy = $this->response()->headers->get('Content-Security-Policy');

        foreach (['script-src', 'style-src', 'connect-src', 'img-src', 'font-src'] as $directive) {
            $this->assertMatchesRegularExpression('/'.preg_quote($directive, '/').'[^;]*http:\/\/localhost:5199/', $policy);
        }
        $this->assertStringContainsString("frame-ancestors 'none'; object-src 'none'", $policy);
    }

    public function test_local_built_assets_do_not_need_a_vite_origin(): void
    {
        $this->app->instance('env', 'local');
        unlink($this->hotFile);

        $policy = $this->response()->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("script-src 'self' 'unsafe-inline';", $policy);
        $this->assertStringNotContainsString('localhost', $policy);
    }

    public function test_production_does_not_allow_vite_even_with_a_stale_hot_file(): void
    {
        $this->app->instance('env', 'production');
        file_put_contents($this->hotFile, 'http://localhost:5199');

        $response = $this->response();

        $this->assertStringNotContainsString('localhost', $response->headers->get('Content-Security-Policy'));
        $this->assertSame('max-age=31536000; includeSubDomains', $response->headers->get('Strict-Transport-Security'));
    }

    private function response(): Response
    {
        return (new SecurityHeaders)->handle(Request::create('/'), fn () => new Response('OK'));
    }
}
