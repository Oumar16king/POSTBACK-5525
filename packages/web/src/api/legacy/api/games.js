/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS - Games Management API
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dyvsadmin2024';
import { getBaseUrl } from '../lib/runtime.js';

// Ensure unlock columns exist
async function ensureColumns() {
    try { await query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS unlock_type TEXT DEFAULT 'deposit'`); } catch (e) {}
    try { await query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS unlock_value NUMERIC DEFAULT 0`); } catch (e) {}
    // Column for storing game HTML content (for DB-hosted games)
    try { await query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS game_html TEXT`); } catch (e) {}
    // Ensure game_unlocks table exists for auto-unlock
    try {
        await query(`CREATE TABLE IF NOT EXISTS game_unlocks (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT NOT NULL,
            game_id INTEGER NOT NULL,
            unlocked_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(telegram_id, game_id)
        )`);
    } catch (e) {}
    // Ensure daily_stats table exists for statistics
    try {
        await query(`CREATE TABLE IF NOT EXISTS daily_stats (
            id SERIAL PRIMARY KEY,
            stat_date DATE NOT NULL UNIQUE,
            total_players INTEGER DEFAULT 0,
            total_bets NUMERIC DEFAULT 0,
            total_winnings NUMERIC DEFAULT 0,
            top_game_slug TEXT,
            top_game_name TEXT,
            top_game_players INTEGER DEFAULT 0,
            top_game_winnings NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch (e) {}
    // Ensure daily_stats_games table exists for top 10 games per stat
    try {
        await query(`CREATE TABLE IF NOT EXISTS daily_stats_games (
            id SERIAL PRIMARY KEY,
            stat_id INTEGER NOT NULL REFERENCES daily_stats(id) ON DELETE CASCADE,
            game_slug TEXT NOT NULL,
            game_name TEXT,
            players INTEGER DEFAULT 0,
            winnings NUMERIC DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            UNIQUE(stat_id, game_slug)
        )`);
    } catch (e) {}
}

// Column mapping: DB uses is_active/is_locked/game_url, we expose active/locked/page_url
function mapGameFromDB(g) {
    return {
        id: g.id,
        slug: g.slug,
        name: g.name,
        description: g.description || '',
        image_url: g.image_url || '',
        page_url: g.game_url || '',
        active: g.is_active,
        locked: g.is_locked,
        unlock_type: g.unlock_type || 'deposit',
        unlock_value: parseFloat(g.unlock_value) || 0,
        sort_order: g.sort_order || 0,
        created_at: g.created_at,
        updated_at: g.updated_at
    };
}

// Build user-specific game data with tasks and progress
async function buildGameWithUserData(game, userId) {
    var g = {
        id: game.id,
        slug: game.slug,
        name: game.name,
        image_url: game.image_url || '',
        game_url: game.game_url || '',
        lock_status: 'unlocked',
        unlock_type: game.unlock_type || 'deposit',
        unlock_value: parseFloat(game.unlock_value) || 0,
        tasks: [],
        progress: {}
    };

    // If game is not locked at all, return unlocked
    if (!game.is_locked) return g;

    // Check if user already unlocked this game
    if (userId) {
        try {
            var unlocks = await query('SELECT id FROM game_unlocks WHERE telegram_id = $1 AND game_id = $2', [userId, game.id]);
            if (unlocks.length > 0) {
                g.lock_status = 'unlocked';
                return g;
            }
        } catch (e) {}
    }

    // Game is locked - build tasks based on unlock_type
    g.lock_status = 'locked';
    var unlockType = game.unlock_type || 'deposit';
    var unlockValue = parseFloat(game.unlock_value) || 0;

    // Get user data for progress
    var userDepositAmount = 0;
    var userReferralCount = 0;
    var referralLink = '';

    if (userId) {
        try {
            var users = await query('SELECT deposit_amount, referred_by FROM users WHERE telegram_id = $1', [userId]);
            if (users.length > 0) {
                userDepositAmount = parseFloat(users[0].deposit_amount) || 0;
            }
        } catch (e) {}

        try {
            var refs = await query('SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = $1', [userId]);
            if (refs.length > 0) {
                userReferralCount = parseInt(refs[0].cnt) || 0;
            }
        } catch (e) {}

        // Build referral link
        var botUsername = process.env.BOT_USERNAME || 'predvys_bot';
        referralLink = 'https://t.me/' + botUsername + '?start=ref' + userId;
    }

    // Build tasks based on unlock_type (handle both 'referral' and 'referrals')
    var isReferral = (unlockType === 'referral' || unlockType === 'referrals');
    if (isReferral) {
        // Default to requiring 1 referral if value not set
        if (unlockValue <= 0) unlockValue = 1;
        g.tasks.push({
            task_type: 'referrals',
            task_value: unlockValue
        });
        var remaining = Math.max(0, unlockValue - userReferralCount);
        g.progress.referrals = {
            current: userReferralCount,
            required: unlockValue,
            remaining: remaining,
            met: userReferralCount >= unlockValue,
            referral_link: referralLink
        };
    } else if (unlockType === 'deposit' && unlockValue > 0) {
        g.tasks.push({
            task_type: 'deposit_amount',
            task_value: unlockValue
        });
        var remaining2 = Math.max(0, unlockValue - userDepositAmount);
        g.progress.deposit_amount = {
            current: userDepositAmount,
            required: unlockValue,
            remaining: remaining2,
            met: userDepositAmount >= unlockValue
        };
    } else if (unlockType === 'both' || unlockType === 'referral_deposit') {
        // Both referral + deposit
        // Use unlock_value for referrals, and a separate query for deposit threshold
        // For simplicity: unlock_value = referral count needed
        // Deposit threshold comes from game_tasks table
        try {
            var tasks = await query('SELECT task_type, task_value FROM game_tasks WHERE game_id = $1', [game.id]);
            for (var t = 0; t < tasks.length; t++) {
                if (tasks[t].task_type === 'referrals') {
                    var req = parseFloat(tasks[t].task_value) || 0;
                    g.tasks.push({ task_type: 'referrals', task_value: req });
                    var rem = Math.max(0, req - userReferralCount);
                    g.progress.referrals = {
                        current: userReferralCount,
                        required: req,
                        remaining: rem,
                        met: userReferralCount >= req,
                        referral_link: referralLink
                    };
                } else if (tasks[t].task_type === 'deposit_amount') {
                    var req2 = parseFloat(tasks[t].task_value) || 0;
                    g.tasks.push({ task_type: 'deposit_amount', task_value: req2 });
                    var rem2 = Math.max(0, req2 - userDepositAmount);
                    g.progress.deposit_amount = {
                        current: userDepositAmount,
                        required: req2,
                        remaining: rem2,
                        met: userDepositAmount >= req2
                    };
                }
            }
        } catch (e) {}
    }

    // If no specific unlock value, show generic locked message
    if (g.tasks.length === 0) {
        g.tasks.push({
            task_type: unlockType || 'deposit',
            task_value: unlockValue
        });
    }

    // ─── AUTO-UNLOCK: check if all criteria are met ───
    if (userId && g.tasks.length > 0) {
        var allMet = true;
        var tasksWithProgress = ['referrals', 'deposit_amount'];

        for (var ti = 0; ti < g.tasks.length; ti++) {
            var tt = g.tasks[ti].task_type;
            var tv = parseFloat(g.tasks[ti].task_value) || 0;

            if (tt === 'referrals') {
                // Need both: referral count >= required AND the referral must be validated
                // (referred user joined channel + registered on 1Win)
                if (tv > 0 && userReferralCount < tv) allMet = false;
            } else if (tt === 'deposit_amount') {
                if (tv > 0 && userDepositAmount < tv) allMet = false;
            }
        }

        // If all criteria met, auto-unlock the game
        if (allMet) {
            try {
                // Insert into game_unlocks (ignore if already exists)
                await query(
                    'INSERT INTO game_unlocks (telegram_id, game_id, unlocked_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
                    [userId, game.id]
                );
                console.log('[AUTO-UNLOCK] Game', game.id, 'auto-unlocked for user', userId);
            } catch (e) {
                console.error('[AUTO-UNLOCK ERROR]', e.message);
            }

            // Return as unlocked
            g.lock_status = 'unlocked';
            g.tasks = [];
            g.progress = {};
            return g;
        }
    }

    return g;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // ─── Public endpoint: list active games with user-specific data ───
    if (req.method === 'GET' && (req.query.public === '1' || req.query.action === 'public')) {
        try {
            await ensureColumns();
            var userId = req.query.user_id ? parseInt(req.query.user_id) : null;
            var uid = req.query.uid ? parseInt(req.query.uid) : null;
            if (!userId && uid) userId = uid;

            var games = await query(
                'SELECT * FROM games WHERE is_active = TRUE ORDER BY sort_order ASC'
            );

            // Build games with user-specific data
            var gamesWithUserData = [];
            for (var i = 0; i < games.length; i++) {
                var gameData = await buildGameWithUserData(games[i], userId);
                gamesWithUserData.push(gameData);
            }

            return res.status(200).json({ success: true, games: gamesWithUserData });
        } catch (e) {
            console.error('[GAMES PUBLIC ERROR]', e);
            return res.status(200).json({ success: true, games: [] });
        }
    }

    // ═══════════════════════════════════════════
    // PUBLIC STATS (no auth required)
    // ═══════════════════════════════════════════
    if (req.method === 'GET' && req.query.action === 'stats') {
        try {
            await ensureColumns();
            var stats = await query('SELECT * FROM daily_stats ORDER BY stat_date DESC LIMIT 30');
            // Also fetch top 10 games per stat with image_url from games table
            var history = [];
            for (var si = 0; si < stats.length; si++) {
                var s = stats[si];
                var games = await query(
                    'SELECT sg.*, g.image_url FROM daily_stats_games sg LEFT JOIN games g ON g.slug = sg.game_slug WHERE sg.stat_id = $1 ORDER BY sg.sort_order ASC',
                    [s.id]
                );
                // Also get image for top game
                if (s.top_game_slug) {
                    var topImg = await query('SELECT image_url FROM games WHERE slug = $1', [s.top_game_slug]);
                    s.top_game_image = topImg.length > 0 ? (topImg[0].image_url || null) : null;
                }
                var entry = Object.assign({}, s, { games: games });
                history.push(entry);
            }
            return res.status(200).json({ success: true, history: history });
        } catch (e) {
            console.error('[STATS PUBLIC ERROR]', e);
            return res.status(200).json({ success: true, history: [] });
        }
    }

    // ─── Auth check ───
    let pw;
    if (req.method === 'GET') {
        pw = req.query.password;
    } else if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
            pw = body.password;
            req.parsedBody = body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON' });
        }
    }
    if (pw !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Non autorise' });

    try {
        await ensureColumns();
        const body = req.parsedBody || {};
        const action = req.query.action || body.action;

        // ═══════════════════════════════════════════
        // LIST ALL GAMES (admin)
        // ═══════════════════════════════════════════
        if (action === 'list') {
            const games = await query('SELECT * FROM games ORDER BY sort_order ASC');
            return res.status(200).json({ success: true, games: games.map(mapGameFromDB) });
        }

        // ═══════════════════════════════════════════
        // SEED 12 DEFAULT GAMES
        // ═══════════════════════════════════════════
        if (action === 'seed') {
            const defaultGames = [
                { slug: 'astronaut', name: 'Astronaut' },
                { slug: 'chicken-road', name: 'Chicken Road' },
                { slug: 'crash', name: 'Crash' },
                { slug: 'crime-empire', name: 'Crime Empire' },
                { slug: 'fortune', name: 'Fortune' },
                { slug: 'fox-job', name: 'Fox Job' },
                { slug: 'goall', name: 'Goall' },
                { slug: 'lucky-jet', name: 'Lucky Jet' },
                { slug: 'metacrash', name: 'Metacrash' },
                { slug: 'rocket-queen', name: 'Rocket Queen' },
                { slug: 'rocket-x', name: 'Rocket X' },
                { slug: 'tropicana', name: 'Tropicana' }
            ];

            let added = 0;
            let total = 0;
            for (let i = 0; i < defaultGames.length; i++) {
                const g = defaultGames[i];
                const existing = await query('SELECT id FROM games WHERE slug = $1', [g.slug]);
                if (existing.length === 0) {
                    await query(
                        'INSERT INTO games (slug, name, game_url, image_url, is_active, is_locked, sort_order) VALUES ($1, $2, $3, $4, TRUE, FALSE, $5)',
                        [g.slug, g.name, '/jeux/' + g.slug + '/index.html', '/images/' + g.slug + '.png', i]
                    );
                    added++;
                }
                total++;
            }

            // Activate all games
            await query('UPDATE games SET is_active = TRUE, is_locked = FALSE, updated_at = NOW()');

            return res.status(200).json({ success: true, added: added, total: total });
        }

        // ═══════════════════════════════════════════
        // ADD GAME
        // ═══════════════════════════════════════════
        if (action === 'add') {
            const { slug, name, page_url, image_url, game_html } = body;
            if (!slug || !name) {
                return res.status(400).json({ error: 'slug et name sont requis' });
            }
            const existing = await query('SELECT id FROM games WHERE slug = $1', [slug.trim()]);
            if (existing.length > 0) return res.status(400).json({ error: 'Ce slug existe deja' });

            const gameUrl = page_url?.trim() || '/api/game-page?slug=' + slug.trim();
            const imgUrl = image_url?.trim() || null;
            const maxSort = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM games');
            const result = await query(
                'INSERT INTO games (slug, name, game_url, image_url, game_html, is_active, is_locked, sort_order) VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, $6) RETURNING *',
                [slug.trim(), name.trim(), gameUrl, imgUrl, game_html || null, parseInt(maxSort[0].next)]
            );
            return res.status(200).json({ success: true, game: mapGameFromDB(result[0]) });
        }

        // ═══════════════════════════════════════════
        // EDIT GAME
        // ═══════════════════════════════════════════
        if (action === 'edit') {
            const { game_id, name, page_url, image_url, game_html, sort_order, active, locked, unlock_type, unlock_value } = body;
            if (!game_id) return res.status(400).json({ error: 'game_id requis' });

            const existing = await query('SELECT * FROM games WHERE id = $1', [game_id]);
            if (existing.length === 0) return res.status(404).json({ error: 'Jeu non trouve' });

            const sets = [];
            const vals = [];
            let paramIndex = 1;

            if (name !== undefined) { sets.push('name = $' + paramIndex++); vals.push(name.trim()); }
            if (page_url !== undefined) { sets.push('game_url = $' + paramIndex++); vals.push(page_url.trim()); }
            if (image_url !== undefined) { sets.push('image_url = $' + paramIndex++); vals.push(image_url?.trim() || null); }
            if (sort_order !== undefined) { sets.push('sort_order = $' + paramIndex++); vals.push(parseInt(sort_order)); }
            if (active !== undefined) { sets.push('is_active = $' + paramIndex++); vals.push(!!active); }
            if (locked !== undefined) { sets.push('is_locked = $' + paramIndex++); vals.push(!!locked); }
            if (unlock_type !== undefined) { sets.push('unlock_type = $' + paramIndex++); vals.push(unlock_type.trim()); }
            if (unlock_value !== undefined) { sets.push('unlock_value = $' + paramIndex++); vals.push(parseFloat(unlock_value)); }
            if (game_html !== undefined) { sets.push('game_html = $' + paramIndex++); vals.push(game_html); }

            if (sets.length > 0) {
                sets.push('updated_at = NOW()');
                vals.push(game_id);
                await query(
                    'UPDATE games SET ' + sets.join(', ') + ' WHERE id = $' + paramIndex,
                    vals
                );
            }
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // DELETE GAME
        // ═══════════════════════════════════════════
        if (action === 'delete') {
            const { game_id } = body;
            if (!game_id) return res.status(400).json({ error: 'game_id requis' });
            await query('DELETE FROM games WHERE id = $1', [game_id]);
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // TOGGLE ACTIVE
        // ═══════════════════════════════════════════
        if (action === 'toggle_active') {
            const { game_id } = body;
            if (!game_id) return res.status(400).json({ error: 'game_id requis' });
            const result = await query(
                'UPDATE games SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *',
                [game_id]
            );
            if (result.length === 0) return res.status(404).json({ error: 'Jeu non trouve' });
            return res.status(200).json({ success: true, active: result[0].is_active });
        }

        // ═══════════════════════════════════════════
        // TOGGLE LOCKED
        // ═══════════════════════════════════════════
        if (action === 'toggle_lock') {
            const { game_id } = body;
            if (!game_id) return res.status(400).json({ error: 'game_id requis' });
            const result = await query(
                'UPDATE games SET is_locked = NOT is_locked, updated_at = NOW() WHERE id = $1 RETURNING *',
                [game_id]
            );
            if (result.length === 0) return res.status(404).json({ error: 'Jeu non trouve' });
            return res.status(200).json({ success: true, locked: result[0].is_locked });
        }

        // ═══════════════════════════════════════════
        // ACTIVATE ALL
        // ═══════════════════════════════════════════
        if (action === 'activate_all') {
            await query('UPDATE games SET is_active = TRUE, is_locked = FALSE, updated_at = NOW()');
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // REORDER GAMES
        // Accepts: { slugs: ["slug1","slug2",...] } in desired display order
        // ═══════════════════════════════════════════
        if (action === 'reorder') {
            const { slugs } = body;
            if (!Array.isArray(slugs) || slugs.length === 0) {
                return res.status(400).json({ error: 'slugs array requis' });
            }
            for (var idx = 0; idx < slugs.length; idx++) {
                await query('UPDATE games SET sort_order = $1, updated_at = NOW() WHERE slug = $2', [idx, slugs[idx].trim()]);
            }
            return res.status(200).json({ success: true, message: slugs.length + ' games reordered' });
        }

        // ═══════════════════════════════════════════
        // GENERATE STATS (admin)
        // Generates fake stats based on ~20% of total platform users
        // 60-min freshness check: if stats exist and are <60 min old, reject
        // Auto-triggers broadcast to non-depositors if stats were stale (60+ min)
        // ═══════════════════════════════════════════
        if (action === 'generate_stats') {
            // Get today's date (stats are for today now, not yesterday)
            var today = new Date();
            var dateStr = today.toISOString().slice(0, 10);

            // ═══ 60-minute freshness check ═══
            var staleStats = false;
            var existingStats = await query('SELECT id, created_at FROM daily_stats WHERE stat_date = $1', [dateStr]);
            if (existingStats.length > 0) {
                var lastCreated = new Date(existingStats[0].created_at);
                var minutesSinceCreation = (Date.now() - lastCreated.getTime()) / 60000;
                if (minutesSinceCreation < 60) {
                    return res.status(200).json({
                        success: false,
                        error: 'Stats trop récentes (' + Math.floor(minutesSinceCreation) + ' min). Attendez 60 min entre chaque génération.',
                        minutes_remaining: Math.ceil(60 - minutesSinceCreation)
                    });
                }
                // Stats exist but are stale (60+ min old) → will auto-broadcast after regeneration
                staleStats = true;
                await query('DELETE FROM daily_stats WHERE stat_date = $1', [dateStr]);
            }

            // ═══ Calculate ~20% of total platform users as base ═══
            var totalUsersResult = await query('SELECT COUNT(*) as c FROM users WHERE is_active = TRUE OR is_active IS NULL');
            var totalUsers = parseInt(totalUsersResult[0].c) || 0;
            var basePlayers = Math.max(Math.floor(totalUsers * 0.20), 5); // 20% of users, minimum 5
            // Add some randomness: ±15% variation
            var playerVariation = Math.floor(basePlayers * (Math.random() * 0.30 - 0.15));
            var totalPlayers = Math.max(basePlayers + playerVariation, 3);

            // Scale bets and winnings based on player count (realistic ratios)
            // Average bet per player: $30-$80, total bets = players * avg_bet
            var avgBet = Math.floor(Math.random() * 50) + 30; // $30-$80
            var totalBets = totalPlayers * avgBet;
            // Total winnings: 70-120% of total bets (shows profit potential)
            var winRatio = 0.70 + (Math.random() * 0.50); // 70%-120%
            var totalWinnings = Math.floor(totalBets * winRatio);

            // Get random active games for top 10 (or fewer)
            var activeGames = await query('SELECT slug, name FROM games WHERE is_active = TRUE ORDER BY RANDOM()');
            var topCount = Math.min(activeGames.length, 10);
            var selectedGames = activeGames.slice(0, topCount);

            // Shuffle sort order
            for (var si = selectedGames.length - 1; si > 0; si--) {
                var rj = Math.floor(Math.random() * (si + 1));
                var tmp = selectedGames[si];
                selectedGames[si] = selectedGames[rj];
                selectedGames[rj] = tmp;
            }

            // Distribute players across games proportionally
            var remainingPlayers = totalPlayers;
            var topGame = selectedGames.length > 0 ? selectedGames[0] : null;

            // Insert main stat
            var statResult = await query(
                'INSERT INTO daily_stats (stat_date, total_players, total_bets, total_winnings, top_game_slug, top_game_name, top_game_players, top_game_winnings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
                [dateStr, totalPlayers, totalBets, totalWinnings,
                 topGame ? topGame.slug : null, topGame ? topGame.name : null,
                 0, 0] // Will be updated below
            );
            var statId = statResult[0].id;

            // Insert top 10 games for this stat with proportional distribution
            for (var gi = 0; gi < selectedGames.length; gi++) {
                var g = selectedGames[gi];
                // Distribute players: each game gets a share with some randomness
                var isLastGame = (gi === selectedGames.length - 1);
                var gPlayers;
                if (isLastGame) {
                    gPlayers = Math.max(remainingPlayers, 1);
                } else {
                    // Each game gets 8-20% of total players (with randomness)
                    var share = (0.08 + Math.random() * 0.12) * totalPlayers;
                    gPlayers = Math.max(Math.floor(share), 1);
                    remainingPlayers -= gPlayers;
                    if (remainingPlayers < 1) { remainingPlayers = 1; gPlayers = Math.max(gPlayers - 1, 1); }
                }
                // Winnings proportional to players with randomness
                var gAvgBet = Math.floor(Math.random() * 40) + 20; // $20-$60 avg
                var gBets = gPlayers * gAvgBet;
                var gWinRatio = 0.60 + (Math.random() * 0.60); // 60%-120%
                var gWinnings = Math.floor(gBets * gWinRatio);

                await query(
                    'INSERT INTO daily_stats_games (stat_id, game_slug, game_name, players, winnings, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (stat_id, game_slug) DO UPDATE SET players=$4, winnings=$5, sort_order=$6',
                    [statId, g.slug, g.name, gPlayers, gWinnings, gi]
                );

                // Track top game
                if (gi === 0) {
                    await query(
                        'UPDATE daily_stats SET top_game_players = $1, top_game_winnings = $2 WHERE id = $3',
                        [gPlayers, gWinnings, statId]
                    );
                }
            }

            // ═══ Auto-trigger broadcast to non-depositors if stats were stale ═══
            var broadcastTriggered = false;
            if (staleStats) {
                try {
                    var baseUrl = getBaseUrl();
                    var cronSecret = process.env.CRON_SECRET || 'dyvscron2024';
                    var broadcastRes = await fetch(baseUrl + '/api/cron?action=broadcast-game-stats&secret=' + cronSecret, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    var broadcastData = await broadcastRes.json();
                    broadcastTriggered = broadcastData.success === true;
                    console.log('[GENERATE_STATS] Auto-broadcast triggered:', JSON.stringify(broadcastData));
                } catch (e) {
                    console.error('[GENERATE_STATS] Auto-broadcast failed:', e.message);
                }
            }

            return res.status(200).json({
                success: true,
                stat: {
                    date: dateStr,
                    total_players: totalPlayers,
                    total_bets: totalBets,
                    total_winnings: totalWinnings,
                    total_users_platform: totalUsers,
                    percentage_used: '20%',
                    top_game: topGame ? topGame.name : null,
                    top_games_count: selectedGames.length
                },
                broadcast_triggered: broadcastTriggered
            });
        }

        // ═══════════════════════════════════════════
        // LIST STATS (admin) - includes top 10 games per stat
        // ═══════════════════════════════════════════
        if (action === 'list_stats') {
            var allStats = await query('SELECT * FROM daily_stats ORDER BY stat_date DESC LIMIT 60');
            var statsWithGames = [];
            for (var si2 = 0; si2 < allStats.length; si2++) {
                var st = allStats[si2];
                var stGames = await query('SELECT * FROM daily_stats_games WHERE stat_id = $1 ORDER BY sort_order ASC', [st.id]);
                statsWithGames.push(Object.assign({}, st, { games: stGames }));
            }
            return res.status(200).json({ success: true, stats: statsWithGames });
        }

        // ═══════════════════════════════════════════
        // UPDATE STATS (admin)
        // ═══════════════════════════════════════════
        if (action === 'update_stats') {
            const { stat_id, total_players, total_bets, total_winnings } = body;
            if (!stat_id) return res.status(400).json({ error: 'stat_id requis' });

            const sets2 = [];
            const vals2 = [];
            let pi2 = 1;

            if (total_players !== undefined) { sets2.push('total_players = $' + pi2++); vals2.push(parseInt(total_players)); }
            if (total_bets !== undefined) { sets2.push('total_bets = $' + pi2++); vals2.push(parseFloat(total_bets)); }
            if (total_winnings !== undefined) { sets2.push('total_winnings = $' + pi2++); vals2.push(parseFloat(total_winnings)); }

            if (sets2.length > 0) {
                vals2.push(stat_id);
                await query('UPDATE daily_stats SET ' + sets2.join(', ') + ' WHERE id = $' + pi2, vals2);
            }
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // UPDATE STAT GAME (admin)
        // ═══════════════════════════════════════════
        if (action === 'update_stat_game') {
            const { stat_game_id, players, winnings } = body;
            if (!stat_game_id) return res.status(400).json({ error: 'stat_game_id requis' });

            const sets3 = [];
            const vals3 = [];
            let pi3 = 1;

            if (players !== undefined) { sets3.push('players = $' + pi3++); vals3.push(parseInt(players)); }
            if (winnings !== undefined) { sets3.push('winnings = $' + pi3++); vals3.push(parseFloat(winnings)); }

            if (sets3.length > 0) {
                vals3.push(stat_game_id);
                await query('UPDATE daily_stats_games SET ' + sets3.join(', ') + ' WHERE id = $' + pi3, vals3);
            }
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // DELETE STAT GAME (admin)
        // ═══════════════════════════════════════════
        if (action === 'delete_stat_game') {
            const { stat_game_id } = body;
            if (!stat_game_id) return res.status(400).json({ error: 'stat_game_id requis' });
            await query('DELETE FROM daily_stats_games WHERE id = $1', [stat_game_id]);
            return res.status(200).json({ success: true });
        }

        // ═══════════════════════════════════════════
        // DELETE STATS (admin)
        // ═══════════════════════════════════════════
        if (action === 'delete_stats') {
            const { stat_id } = body;
            if (!stat_id) return res.status(400).json({ error: 'stat_id requis' });
            await query('DELETE FROM daily_stats WHERE id = $1', [stat_id]);
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Action inconnue' });
    } catch (error) {
        console.error('[GAMES API ERROR]', error);
        return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
};
