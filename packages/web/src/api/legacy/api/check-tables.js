/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Verification / Creation des tables
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';

export default async function handler(req, res) {
    try {
        // ─── DROP mode ───
        if (req.query.action === 'drop') {
            const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dyvsadmin2024';
            if (req.query.password !== ADMIN_PASSWORD) {
                return res.status(403).json({ error: 'Non autorise' });
            }
            await query('DROP TABLE IF EXISTS bot_sessions CASCADE');
            await query('DROP TABLE IF EXISTS deposits CASCADE');
            await query('DROP TABLE IF EXISTS access_codes CASCADE');
            await query('DROP TABLE IF EXISTS gaming_events CASCADE');
            await query('DROP TABLE IF EXISTS users CASCADE');
            return res.status(200).json({ status: 'OK', message: 'Toutes les tables ont ete supprimees' });
        }

        // ─── CREATE mode ───
        await query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            language TEXT DEFAULT 'fr',
            is_registered BOOLEAN DEFAULT FALSE,
            is_deposited BOOLEAN DEFAULT FALSE,
            deposit_amount NUMERIC DEFAULT 0,
            one_win_user_id TEXT,
            last_message_id BIGINT,
            registered_at TIMESTAMPTZ,
            deposited_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // Ajouter la colonne language si elle n'existe pas
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr'`); } catch (e) {}

        await query(`CREATE TABLE IF NOT EXISTS deposits (
            id SERIAL PRIMARY KEY,
            one_win_user_id TEXT,
            telegram_id BIGINT,
            amount NUMERIC DEFAULT 0,
            transaction_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        await query(`CREATE TABLE IF NOT EXISTS access_codes (
            id SERIAL PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            telegram_id BIGINT,
            is_used BOOLEAN DEFAULT FALSE,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── NEW: gaming_events table ───
        await query(`CREATE TABLE IF NOT EXISTS gaming_events (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT NOT NULL,
            one_win_user_id TEXT,
            event_type TEXT NOT NULL,
            amount NUMERIC DEFAULT 0,
            transaction_id TEXT,
            game_type TEXT,
            event_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // Index pour les requêtes fréquentes
        try { await query(`CREATE INDEX IF NOT EXISTS idx_gaming_telegram ON gaming_events(telegram_id)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_gaming_type ON gaming_events(event_type)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_gaming_txn ON gaming_events(transaction_id)`); } catch (e) {}

        // ─── GAMES MANAGEMENT ───
        await query(`CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            game_url TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            is_locked BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── GAME TASKS (unlock requirements) ───
        await query(`CREATE TABLE IF NOT EXISTS game_tasks (
            id SERIAL PRIMARY KEY,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            task_type TEXT NOT NULL,
            task_value NUMERIC NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── REFERRALS ───
        await query(`CREATE TABLE IF NOT EXISTS referrals (
            id SERIAL PRIMARY KEY,
            referrer_id BIGINT NOT NULL,
            referred_id BIGINT NOT NULL UNIQUE,
            referred_username TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── GAME UNLOCKS (per-user) ───
        await query(`CREATE TABLE IF NOT EXISTS game_unlocks (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT NOT NULL,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            unlocked_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(telegram_id, game_id)
        )`);

        // Indexes
        try { await query(`CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active, sort_order)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_game_tasks_game ON game_tasks(game_id)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_game_unlocks_user ON game_unlocks(telegram_id, game_id)`); } catch (e) {}

        // Add referred_by column to users if missing
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by)`); } catch (e) {}

        // ─── CRON AUTOMATION COLUMNS ───
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS relance_count INTEGER DEFAULT 0`); } catch (e) {}
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_relance_at TIMESTAMPTZ`); } catch (e) {}
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_broadcast_at TIMESTAMPTZ`); } catch (e) {}
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_referral_reminder_at TIMESTAMPTZ`); } catch (e) {}
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`); } catch (e) {}
        try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_bot BOOLEAN DEFAULT FALSE`); } catch (e) {}

        // ─── CRON LOGS TABLE ───
        await query(`CREATE TABLE IF NOT EXISTS cron_logs (
            id SERIAL PRIMARY KEY,
            cron_type TEXT NOT NULL,
            target_count INTEGER DEFAULT 0,
            sent_count INTEGER DEFAULT 0,
            failed_count INTEGER DEFAULT 0,
            details JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── MESSAGE LOG TABLE ───
        await query(`CREATE TABLE IF NOT EXISTS message_log (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT NOT NULL,
            message_type TEXT NOT NULL,
            message_lang TEXT,
            sent_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // ─── BROADCAST STATS TABLE (manually updated from admin panel) ───
        await query(`CREATE TABLE IF NOT EXISTS broadcast_stats (
            id SERIAL PRIMARY KEY,
            stat_key TEXT NOT NULL UNIQUE,
            stat_value TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);

        // Initialize default stats if empty
        const existingStats = await query('SELECT COUNT(*) as c FROM broadcast_stats');
        if (parseInt(existingStats[0].c) === 0) {
            await query(`INSERT INTO broadcast_stats (stat_key, stat_value, updated_at) VALUES
                ('deposited_yesterday', '3', NOW()),
                ('active_players', '5', NOW()),
                ('total_revenue', '0', NOW())
            `);
        }

        try { await query(`CREATE INDEX IF NOT EXISTS idx_broadcast_stats_key ON broadcast_stats(stat_key)`); } catch (e) {}

        // Indexes for cron tables
        try { await query(`CREATE INDEX IF NOT EXISTS idx_message_log_user ON message_log(telegram_id, message_type)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_message_log_sent ON message_log(sent_at)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_users_relance ON users(relance_count, is_deposited, is_registered)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, is_deposited)`); } catch (e) {}
        try { await query(`CREATE INDEX IF NOT EXISTS idx_cron_logs_type ON cron_logs(cron_type, created_at)`); } catch (e) {}

        // Lister les tables
        const tables = await query(`
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name IN ('users', 'deposits', 'access_codes')
            ORDER BY table_name, ordinal_position
        `);

        const userCount = await query('SELECT COUNT(*) as cnt FROM users');
        const depCount = await query('SELECT COUNT(*) as cnt FROM deposits');

        res.status(200).json({
            status: 'OK',
            tables: tables,
            counts: {
                users: parseInt(userCount[0].cnt),
                deposits: parseInt(depCount[0].cnt)
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
};
