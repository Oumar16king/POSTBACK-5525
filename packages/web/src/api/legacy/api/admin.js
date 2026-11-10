/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Admin API
// ═══════════════════════════════════════════
import { query } from '../lib/db.js';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dyvsadmin2024';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.query.password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Non autorise' });

    try {
        const action = req.query.action;

        // ─── Stats (enhanced with gaming) ───
        if (!action || action === 'stats') {
            const t = await query('SELECT COUNT(*) as c FROM users');
            const r = await query('SELECT COUNT(*) as c FROM users WHERE is_registered = TRUE');
            const d = await query('SELECT COUNT(*) as c FROM users WHERE is_deposited = TRUE');
            const rev = await query('SELECT COALESCE(SUM(deposit_amount),0) as t FROM users');
            const today = await query("SELECT COUNT(*) as c FROM users WHERE created_at >= CURRENT_DATE");
            const todayDep = await query("SELECT COUNT(*) as c FROM users WHERE deposited_at >= CURRENT_DATE");
            // Stats par langue
            const langStats = await query('SELECT language, COUNT(*) as count FROM users WHERE language IS NOT NULL GROUP BY language ORDER BY count DESC');

            // Gaming stats (wrapped in try/catch — table may not exist yet)
            let gaming = { totalBets: 0, totalWins: 0, totalLosses: 0, netRevenue: 0 };
            try {
                const gTotalBets = await query('SELECT COUNT(*) as c FROM gaming_events');
                const gTotals = await query(
                    `SELECT
                        COALESCE(SUM(CASE WHEN event_type = 'win' THEN amount ELSE 0 END), 0) as total_wins,
                        COALESCE(SUM(CASE WHEN event_type = 'loss' THEN amount ELSE 0 END), 0) as total_losses
                     FROM gaming_events`
                );
                gaming = {
                    totalBets: parseInt(gTotalBets[0].c),
                    totalWins: parseFloat(gTotals[0].total_wins),
                    totalLosses: parseFloat(gTotals[0].total_losses),
                    netRevenue: parseFloat(gTotals[0].total_losses) - parseFloat(gTotals[0].total_wins)
                };
            } catch (gErr) {
                console.warn('[ADMIN API] gaming_events table not available:', gErr.message);
            }

            return res.status(200).json({
                total: parseInt(t[0].c),
                registered: parseInt(r[0].c),
                deposited: parseInt(d[0].c),
                totalRevenue: parseFloat(rev[0].t),
                newToday: parseInt(today[0].c),
                depositedToday: parseInt(todayDep[0].c),
                langStats: langStats,
                gaming
            });
        }

        // ─── Users (enhanced with pagination) ───
        if (action === 'users') {
            const lang = req.query.lang;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            let users;
            let totalResult;
            if (lang && lang !== 'all') {
                totalResult = await query('SELECT COUNT(*) as c FROM users WHERE language = $1', [lang]);
                users = await query(
                    `SELECT u.telegram_id, u.first_name, u.last_name, u.username, u.language,
                            u.one_win_user_id, u.deposit_amount, u.is_registered, u.is_deposited,
                            u.created_at, u.deposited_at,
                            (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.telegram_id) AS referral_count,
                            u.referred_by
                     FROM users u WHERE u.language = $1 ORDER BY u.created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [lang, limit, offset]
                );
            } else {
                totalResult = await query('SELECT COUNT(*) as c FROM users');
                users = await query(
                    `SELECT u.telegram_id, u.first_name, u.last_name, u.username, u.language,
                            u.one_win_user_id, u.deposit_amount, u.is_registered, u.is_deposited,
                            u.created_at, u.deposited_at,
                            (SELECT COUNT(*) FROM referrals WHERE referrer_id = u.telegram_id) AS referral_count,
                            u.referred_by
                     FROM users u ORDER BY u.created_at DESC
                     LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );
            }
            const total = parseInt(totalResult[0].c);
            return res.status(200).json({
                users,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            });
        }

        // ─── Search ───
        if (action === 'search') {
            const q = req.query.q || '';
            if (!q.trim()) return res.status(200).json({ users: [] });
            const searchTerm = '%' + q.trim() + '%';
            const users = await query(
                `SELECT * FROM users
                 WHERE telegram_id::text ILIKE $1
                    OR one_win_user_id::text ILIKE $1
                    OR first_name ILIKE $1
                    OR last_name ILIKE $1
                    OR username ILIKE $1
                 ORDER BY created_at DESC LIMIT 50`,
                [searchTerm]
            );
            return res.status(200).json({ users });
        }

        // ─── Deposit history ───
        if (action === 'deposit_history') {
            const tid = req.query.telegram_id;
            if (!tid) return res.status(400).json({ error: 'ID manquant' });
            const deposits = await query(
                'SELECT * FROM deposits WHERE telegram_id = $1 ORDER BY created_at DESC',
                [tid]
            );
            const totalDeposits = await query(
                'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM deposits WHERE telegram_id = $1',
                [tid]
            );
            return res.status(200).json({
                deposits,
                total: parseFloat(totalDeposits[0].total),
                count: parseInt(totalDeposits[0].count)
            });
        }

        // ─── All deposits ───
        if (action === 'all_deposits') {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            const deposits = await query(
                'SELECT d.*, u.first_name, u.last_name, u.username, u.language FROM deposits d LEFT JOIN users u ON u.telegram_id = d.telegram_id ORDER BY d.created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );
            const total = await query('SELECT COUNT(*) as c FROM deposits');
            return res.status(200).json({
                deposits,
                total: parseInt(total[0].c),
                page,
                totalPages: Math.ceil(parseInt(total[0].c) / limit)
            });
        }

        // ─── Top depositors ───
        if (action === 'top_depositors') {
            const limit = parseInt(req.query.limit) || 10;
            const lang = req.query.lang;
            let topDepositors;
            if (lang && lang !== 'all') {
                topDepositors = await query(
                    'SELECT * FROM users WHERE deposit_amount > 0 AND language = $1 ORDER BY deposit_amount DESC LIMIT $2',
                    [lang, limit]
                );
            } else {
                topDepositors = await query(
                    'SELECT * FROM users WHERE deposit_amount > 0 ORDER BY deposit_amount DESC LIMIT $1',
                    [limit]
                );
            }
            return res.status(200).json({ top: topDepositors });
        }

        // ─── Codes ───
        if (action === 'codes') {
            const codes = await query(
                'SELECT ac.*, u.first_name, u.username FROM access_codes ac LEFT JOIN users u ON u.telegram_id = ac.telegram_id ORDER BY ac.created_at DESC'
            );
            return res.status(200).json({ codes });
        }

        // ─── Generate code ───
        if (action === 'generate') {
            const tid = req.query.telegram_id;
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = 'DVYS-';
            for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
            await query('INSERT INTO access_codes (code, telegram_id, created_at) VALUES ($1, $2, NOW())', [code, tid || null]);
            return res.status(200).json({ success: true, code });
        }

        // ═══════════════════════════════════════════════════
        // NEW GAMING ENDPOINTS
        // ═══════════════════════════════════════════════════

        // ─── Gaming stats (standalone) ───
        if (action === 'gaming_stats') {
            const totalBets = await query('SELECT COUNT(*) as c FROM gaming_events');
            const totals = await query(
                `SELECT
                    COALESCE(SUM(CASE WHEN event_type = 'win' THEN amount ELSE 0 END), 0) as total_wins,
                    COALESCE(SUM(CASE WHEN event_type = 'loss' THEN amount ELSE 0 END), 0) as total_losses
                 FROM gaming_events`
            );
            const activePlayers = await query(
                'SELECT COUNT(DISTINCT telegram_id) as c FROM gaming_events'
            );

            const wins = parseFloat(totals[0].total_wins);
            const losses = parseFloat(totals[0].total_losses);

            return res.status(200).json({
                totalBets: parseInt(totalBets[0].c),
                totalWins: wins,
                totalLosses: losses,
                netRevenue: losses - wins,
                activePlayers: parseInt(activePlayers[0].c)
            });
        }

        // ─── Top losers (biggest revenue for us) ───
        if (action === 'top_losers') {
            const limit = parseInt(req.query.limit) || 10;
            const losers = await query(
                `SELECT u.telegram_id, u.first_name, u.last_name, u.username, u.language,
                        COALESCE(SUM(CASE WHEN g.event_type = 'loss' THEN g.amount ELSE 0 END), 0) as total_losses,
                        COALESCE(SUM(CASE WHEN g.event_type = 'win' THEN g.amount ELSE 0 END), 0) as total_wins,
                        COUNT(g.id) as total_bets
                 FROM users u
                 LEFT JOIN gaming_events g ON g.telegram_id = u.telegram_id
                 GROUP BY u.telegram_id, u.first_name, u.last_name, u.username, u.language
                 HAVING COALESCE(SUM(CASE WHEN g.event_type = 'loss' THEN g.amount ELSE 0 END), 0) > 0
                 ORDER BY total_losses DESC
                 LIMIT $1`,
                [limit]
            );
            return res.status(200).json({ losers });
        }

        // ─── Gaming users (per-user gaming revenue, paginated) ───
        if (action === 'gaming_users') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;

            const users = await query(
                `SELECT u.telegram_id, u.first_name, u.last_name, u.username, u.language,
                        COALESCE(SUM(CASE WHEN g.event_type = 'win' THEN g.amount ELSE 0 END), 0) as total_wins,
                        COALESCE(SUM(CASE WHEN g.event_type = 'loss' THEN g.amount ELSE 0 END), 0) as total_losses,
                        COUNT(g.id) as total_bets,
                        COALESCE(SUM(CASE WHEN g.event_type = 'loss' THEN g.amount ELSE -g.amount END), 0) as net_revenue
                 FROM users u
                 LEFT JOIN gaming_events g ON g.telegram_id = u.telegram_id
                 GROUP BY u.telegram_id, u.first_name, u.last_name, u.username, u.language
                 ORDER BY net_revenue DESC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            const total = await query(
                `SELECT COUNT(*) as c FROM (
                    SELECT DISTINCT telegram_id FROM gaming_events
                 ) sub`
            );
            return res.status(200).json({
                users,
                total: parseInt(total[0].c),
                page,
                totalPages: Math.ceil(parseInt(total[0].c) / limit)
            });
        }

        // ─── Deposit filter users (count for broadcast preview) ───
        if (action === 'deposit_filter_users') {
            const depositMin = parseFloat(req.query.deposit_min) || 0;
            const depositMax = req.query.deposit_max
                ? parseFloat(req.query.deposit_max)
                : 999999999;

            const result = await query(
                'SELECT COUNT(*) as count FROM users WHERE deposit_amount >= $1 AND deposit_amount <= $2',
                [depositMin, depositMax]
            );

            return res.status(200).json({
                count: parseInt(result[0].count),
                filters: { deposit_min: depositMin, deposit_max: depositMax }
            });
        }

        // ─── Daily History ───
        if (action === 'daily_history') {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            try {
                const users = await query(
                    `SELECT telegram_id, first_name, last_name, username, language,
                            one_win_user_id, deposit_amount, is_registered, is_deposited,
                            created_at, deposited_at
                     FROM users
                     WHERE DATE(created_at) = $1
                     ORDER BY created_at DESC`,
                    [date]
                );
                const deposited = await query(
                    `SELECT telegram_id, first_name, last_name, username,
                            deposit_amount, deposited_at
                     FROM users
                     WHERE DATE(deposited_at) = $1
                     ORDER BY deposited_at DESC`,
                    [date]
                );
                const stats = await query(
                    `SELECT
                        COUNT(*) as new_users,
                        COUNT(*) FILTER (WHERE is_registered = TRUE) as registered,
                        COUNT(*) FILTER (WHERE is_deposited = TRUE) as deposited,
                        COALESCE(SUM(deposit_amount) FILTER (WHERE deposited_at::date = $1), 0) as daily_revenue
                     FROM users
                     WHERE DATE(created_at) = $1`,
                    [date]
                );
                return res.status(200).json({
                    date,
                    stats: stats[0],
                    users,
                    deposited
                });
            } catch (e) {
                return res.status(200).json({ date, stats: { new_users: 0, registered: 0, deposited: 0, daily_revenue: 0 }, users: [], deposited: [] });
            }
        }

        // ─── Daily Overview (last N days) ───
        if (action === 'daily_overview') {
            const days = parseInt(req.query.days) || 7;
            try {
                const overview = await query(
                    `SELECT
                        DATE(created_at) as date,
                        COUNT(*) as new_users,
                        COUNT(*) FILTER (WHERE is_registered = TRUE) as registered,
                        COUNT(*) FILTER (WHERE is_deposited = TRUE) as deposited,
                        COALESCE(SUM(deposit_amount) FILTER (WHERE is_deposited = TRUE), 0) as revenue
                     FROM users
                     WHERE created_at >= CURRENT_DATE - ($1 || ' days')::interval
                     GROUP BY DATE(created_at)
                     ORDER BY date DESC`,
                    [String(days)]
                );
                return res.status(200).json({ days: overview });
            } catch (e) {
                return res.status(200).json({ days: [] });
            }
        }

        // ─── Broadcast Stats (GET) ───
        if (action === 'broadcast_stats') {
            const stats = await query('SELECT stat_key, stat_value, updated_at FROM broadcast_stats ORDER BY stat_key');
            const result = {};
            for (const s of stats) { result[s.stat_key] = { value: s.stat_value, updated_at: s.updated_at }; }
            return res.status(200).json({ stats: result });
        }

        // ─── Cron Logs ───
        if (action === 'cron_logs') {
            try {
                const logs = await query('SELECT * FROM cron_logs ORDER BY created_at DESC LIMIT 50');
                return res.status(200).json({ logs });
            } catch (e) {
                return res.status(200).json({ logs: [], error: 'cron_logs table not available' });
            }
        }

        return res.status(400).json({ error: 'Action inconnue' });
    } catch (error) {
        console.error('[ADMIN API ERROR]', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
