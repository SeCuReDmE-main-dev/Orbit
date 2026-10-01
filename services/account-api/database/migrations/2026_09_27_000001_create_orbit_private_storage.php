<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_login_enabled')->default(false);
        });
        Schema::create('social_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 16);
            $table->string('subject', 191);
            $table->unique(['provider', 'subject']);
            $table->timestamps();
        });
        Schema::create('email_challenges', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('code_hash', 64);
            $table->string('session_hash', 64);
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
        });
        Schema::create('private_workspaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('workspace_id');
            $table->unsignedInteger('revision');
            $table->json('document');
            $table->timestamps();
            $table->unique(['user_id', 'workspace_id']);
        });
        Schema::create('workspace_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('operation_id');
            $table->string('request_hash', 64);
            $table->unsignedSmallInteger('http_status');
            $table->json('response');
            $table->timestamp('created_at');
            $table->unique(['user_id', 'operation_id']);
        });
        Schema::create('workspace_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('workspace_id');
            $table->unsignedInteger('base_revision');
            $table->boolean('conflict');
            $table->json('document');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_versions');
        Schema::dropIfExists('workspace_operations');
        Schema::dropIfExists('private_workspaces');
        Schema::dropIfExists('email_challenges');
        Schema::dropIfExists('social_identities');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('email_login_enabled'));
    }
};
