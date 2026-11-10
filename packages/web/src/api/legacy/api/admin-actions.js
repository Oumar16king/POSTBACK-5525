/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Admin Actions API
// ═══════════════════════════════════════════
import { query } from '../lib/db.js';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dyvsadmin2024';
const BOT_TOKEN = process.env.BOT_TOKEN;

async function tgAPI(method, data, token) {
    const t = token || BOT_TOKEN;
    try {
        const res = await fetch('https://api.telegram.org/bot' + t + '/' + method, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        console.error('[TG API ERROR]', e);
        return { ok: false };
    }
}

async function tgAPIMedia(method, formData, token) {
    const t = token || BOT_TOKEN;
    try {
        const res = await fetch('https://api.telegram.org/bot' + t + '/' + method, {
            method: 'POST',
            body: formData
        });
        return await res.json();
    } catch (e) {
        console.error('[TG MEDIA ERROR]', e);
        return { ok: false };
    }
}

async function getChatInfo(tid, token) {
    const t = token || BOT_TOKEN;
    try {
        const res = await fetch('https://api.telegram.org/bot' + t + '/getChat?chat_id=' + tid);
        const data = await res.json();
        return data.ok ? data.result : null;
    } catch (e) { return null; }
}

function checkAuth(body) {
    return body?.password === ADMIN_PASSWORD;
}

function getFileExt(mimeType) {
    if (!mimeType) return 'bin';
    if (mimeType.startsWith('image/')) return mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
    if (mimeType.startsWith('video/')) return 'mp4';
    if (mimeType.includes('ogg') || mimeType.includes('voice') || mimeType.includes('audio')) return 'ogg';
    return 'bin';
}

function getMediaType(mimeType) {
    if (!mimeType) return null;
    if (mimeType.startsWith('image/')) return 'photo';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/') || mimeType.includes('voice') || mimeType.includes('ogg')) return 'voice';
    return null;
}

function getTGMethod(mediaType) {
    switch (mediaType) {
        case 'photo': return 'sendPhoto';
        case 'video': return 'sendVideo';
        case 'voice': return 'sendVoice';
        case 'audio': return 'sendAudio';
        case 'animation': return 'sendAnimation';
        case 'document': return 'sendDocument';
        default: return 'sendMessage';
    }
}

// ─── Enhanced Target User Query ───
// Supports: target (all/registered/vip), lang, deposit range, specific IDs, group IDs
async function getTargetUsers(target, lang, depositFilter, specificIds, groupIds) {
    let sql = 'SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL';
    const params = [];
    let paramIndex = 1;

    // Specific IDs override everything else
    if (specificIds && specificIds.length > 0) {
        const placeholders = specificIds.map(() => `$${paramIndex++}`).join(',');
        sql = `SELECT telegram_id FROM users WHERE telegram_id IN (${placeholders})`;
        params.push(...specificIds.map(id => String(id).trim()));
        return await query(sql, params);
    }

    // Group IDs override target/lang/deposit
    if (groupIds && groupIds.length > 0) {
        const placeholders = groupIds.map(() => `$${paramIndex++}`).join(',');
        sql = `SELECT telegram_id FROM users WHERE telegram_id IN (${placeholders})`;
        params.push(...groupIds.map(id => String(id).trim()));
        return await query(sql, params);
    }

    // Target filter
    if (target === 'registered') sql += ' AND is_registered = TRUE';
    if (target === 'vip') sql += ' AND is_deposited = TRUE';

    // Language filter
    if (lang && lang !== 'all') {
        sql += ` AND language = $${paramIndex++}`;
        params.push(lang);
    }

    // Deposit filter
    if (depositFilter) {
        const min = parseFloat(depositFilter.min) || 0;
        const max = parseFloat(depositFilter.max) || Infinity;
        if (max < Infinity) {
            sql += ` AND deposit_amount >= $${paramIndex++} AND deposit_amount <= $${paramIndex++}`;
            params.push(min, max);
        } else {
            sql += ` AND deposit_amount >= $${paramIndex++}`;
            params.push(min);
        }
    }

    return await query(sql, params);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).send('OK');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (!checkAuth(body)) return res.status(403).json({ error: 'Non autorise' });

    try {
        const action = body.action;

        // ─── GET CONFIG (bot token for direct upload) ───
        if (action === 'get_config') {
            return res.status(200).json({ bot_token: BOT_TOKEN });
        }

        // ─── GET FIRST TARGET USER (for direct TG upload) ───
        if (action === 'get_first_target') {
            const target = body.target || 'all';
            const lang = body.lang || 'all';
            const depositFilter = body.deposit_filter || null;
            const specificIds = body.specific_ids || null;
            const groupIds = body.group_ids || null;
            const users = await getTargetUsers(target, lang, depositFilter, specificIds, groupIds);
            return res.status(200).json({
                telegram_id: users.length > 0 ? users[0].telegram_id : null,
                total: users.length
            });
        }

        // ─── BROADCAST COPY (copyMessage from uploaded media) ───
        if (action === 'broadcast_copy') {
            const { from_chat_id, message_id, caption, target } = body;
            const lang = body.lang || 'all';
            const depositFilter = body.deposit_filter || null;
            const specificIds = body.specific_ids || null;
            const groupIds = body.group_ids || null;

            if (!from_chat_id || !message_id) {
                return res.status(400).json({ error: 'Parametres manquants' });
            }

            const users = await getTargetUsers(target || 'all', lang, depositFilter, specificIds, groupIds);
            if (users.length === 0) {
                return res.status(200).json({ success: true, sent: 0, failed: 0, total: 0 });
            }

            let sent = 0, failed = 0;
            const cap = caption || '';
            const srcChatId = String(from_chat_id);
            const srcMsgId = parseInt(message_id);

            for (const u of users) {
                // Skip the source chat (already received the original upload)
                if (String(u.telegram_id) === srcChatId) {
                    sent++;
                    continue;
                }
                try {
                    const r = await tgAPI('copyMessage', {
                        from_chat_id: srcChatId,
                        message_id: srcMsgId,
                        chat_id: u.telegram_id,
                        caption: cap || undefined,
                        parse_mode: cap ? 'HTML' : undefined
                    }, BOT_TOKEN);
                    if (r.ok) sent++; else failed++;
                } catch (e) {
                    failed++;
                    console.error('[BC COPY ERR]', u.telegram_id, e.message);
                }
                await new Promise(r => setTimeout(r, 30));
            }
            return res.status(200).json({ success: true, sent, failed, total: users.length });
        }

        // ─── BROADCAST TEXT (Enhanced) ───
        if (action === 'broadcast') {
            const message = body.message || '';
            const target = body.target || 'all';
            const lang = body.lang || 'all';
            const depositFilter = body.deposit_filter || null;
            const specificIds = body.specific_ids || null;
            const groupIds = body.group_ids || null;

            if (!message.trim() && !specificIds && !groupIds) {
                return res.status(400).json({ error: 'Message vide' });
            }

            const users = await getTargetUsers(target, lang, depositFilter, specificIds, groupIds);
            if (users.length === 0) return res.status(200).json({ success: true, sent: 0, failed: 0, total: 0 });

            let sent = 0, failed = 0;
            for (const u of users) {
                try {
                    const r = await tgAPI('sendMessage', {
                        chat_id: u.telegram_id,
                        text: message,
                        parse_mode: 'HTML'
                    }, BOT_TOKEN);
                    if (r.ok) sent++; else failed++;
                } catch (e) { failed++; }
                await new Promise(r => setTimeout(r, 40));
            }
            return res.status(200).json({ success: true, sent, failed, total: users.length });
        }

        // ─── BROADCAST MEDIA (Enhanced - copyMessage optimization) ───
        if (action === 'broadcast_media') {
            const { media_base64, media_type, mime_type, caption, target } = body;
            const lang = body.lang || 'all';
            const depositFilter = body.deposit_filter || null;
            const specificIds = body.specific_ids || null;
            const groupIds = body.group_ids || null;

            if (!media_base64 || !media_type) {
                return res.status(400).json({ error: 'Media manquant' });
            }

            const users = await getTargetUsers(target || 'all', lang, depositFilter, specificIds, groupIds);
            if (users.length === 0) {
                return res.status(200).json({ success: true, sent: 0, failed: 0, total: 0 });
            }

            const fileBuffer = Buffer.from(media_base64, 'base64');
            const ext = getFileExt(mime_type);
            const tgMethod = getTGMethod(media_type);
            const cap = caption || '';

            // Step 1: Send media to first user to get a message_id, then copyMessage to the rest
            let sent = 0, failed = 0;
            let sourceChatId = null;
            let sourceMessageId = null;

            // Send to first user normally (upload once)
            const firstUser = users[0];
            try {
                const formData = new FormData();
                const blob = new Blob([fileBuffer], { type: mime_type || 'application/octet-stream' });
                const fieldName = media_type === 'photo' ? 'photo' : media_type === 'voice' ? 'voice' : 'video';
                formData.append(fieldName, blob, `broadcast.${ext}`);
                formData.append('chat_id', firstUser.telegram_id);
                if (cap) {
                    formData.append('caption', cap);
                    formData.append('parse_mode', 'HTML');
                }
                const r = await tgAPIMedia(tgMethod, formData, BOT_TOKEN);
                if (r.ok) {
                    sent++;
                    sourceChatId = firstUser.telegram_id;
                    sourceMessageId = r.result.message_id;
                } else {
                    failed++;
                    console.error('[BC MEDIA FIRST ERR]', firstUser.telegram_id, r.description);
                }
            } catch (e) {
                failed++;
                console.error('[BC MEDIA FIRST ERR]', firstUser.telegram_id, e.message);
            }

            // Step 2: Use copyMessage for remaining users (instant, no re-upload)
            if (sourceMessageId && users.length > 1) {
                for (let i = 1; i < users.length; i++) {
                    try {
                        const r = await tgAPI('copyMessage', {
                            from_chat_id: sourceChatId,
                            message_id: sourceMessageId,
                            chat_id: users[i].telegram_id,
                            caption: cap || undefined,
                            parse_mode: cap ? 'HTML' : undefined
                        }, BOT_TOKEN);
                        if (r.ok) sent++; else failed++;
                    } catch (e) {
                        failed++;
                        console.error('[BC COPY ERR]', users[i].telegram_id, e.message);
                    }
                    await new Promise(r => setTimeout(r, 30));
                }
            }

            return res.status(200).json({ success: true, sent, failed, total: users.length });
        }

        // ─── SEND TO SINGLE USER ───
        if (action === 'send_to_user') {
            const { telegram_id, message } = body;
            if (!telegram_id || !message) return res.status(400).json({ error: 'Donnees manquantes' });
            const r = await tgAPI('sendMessage', {
                chat_id: String(telegram_id),
                text: message,
                parse_mode: 'HTML'
            }, BOT_TOKEN);
            return res.status(200).json({ success: r.ok });
        }

        // ─── ADD USER ───
        if (action === 'add_user') {
            const tid = String(body.telegram_id || '').trim().replace(/[^0-9]/g, '');
            const winId = String(body.one_win_id || '').trim().replace(/[^0-9]/g, '');
            const isRegistered = body.is_registered === true || body.is_registered === 'true';
            const isDeposited = body.is_deposited === true || body.is_deposited === 'true';
            const lang = body.language || 'fr';

            if (!tid || tid.length < 5) return res.status(400).json({ error: 'ID Telegram invalide' });

            const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [tid]);
            if (existing.length > 0) {
                await query(
                    'UPDATE users SET is_registered = $1, is_deposited = $2, language = $3, updated_at = NOW() WHERE telegram_id = $4',
                    [isRegistered, isDeposited, lang, tid]
                );
                if (winId) await query('UPDATE users SET one_win_user_id = $1 WHERE telegram_id = $2', [winId, tid]);
                return res.status(200).json({ success: true, action: 'updated', telegram_id: tid });
            }

            let name = 'Inconnu';
            const ci = await getChatInfo(tid);
            if (ci) name = [ci.first_name, ci.last_name].filter(Boolean).join(' ') || 'Inconnu';

            await query(
                'INSERT INTO users (telegram_id, first_name, one_win_user_id, is_registered, is_deposited, language, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
                [tid, name, winId || null, isRegistered, isDeposited, lang]
            );
            return res.status(200).json({ success: true, action: 'created', telegram_id: tid, name });
        }

        // ─── EDIT USER (Enhanced with deposit_amount) ───
        if (action === 'edit_user') {
            const tid = String(body.telegram_id || '').trim();
            const isRegistered = body.is_registered === true || body.is_registered === 'true';
            const isDeposited = body.is_deposited === true || body.is_deposited === 'true';
            const depositAmount = body.deposit_amount !== undefined && body.deposit_amount !== null ? parseFloat(body.deposit_amount) : null;
            const lang = body.language || null;

            if (!tid) return res.status(400).json({ error: 'ID manquant' });
            const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [tid]);
            if (existing.length === 0) return res.status(404).json({ error: 'Utilisateur non trouve' });

            if (depositAmount !== null && !isNaN(depositAmount)) {
                const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 15;
                const isDep = depositAmount >= MIN_DEPOSIT;
                await query(
                    'UPDATE users SET is_registered = $1, is_deposited = $2, deposit_amount = $3, language = COALESCE($4, language), updated_at = NOW() WHERE telegram_id = $5',
                    [isRegistered, isDep || isDeposited, depositAmount, lang, tid]
                );
            } else {
                await query(
                    'UPDATE users SET is_registered = $1, is_deposited = $2, language = COALESCE($3, language), updated_at = NOW() WHERE telegram_id = $4',
                    [isRegistered, isDeposited, lang, tid]
                );
            }
            return res.status(200).json({ success: true, action: 'updated', telegram_id: tid });
        }

        // ─── DELETE USER ───
        if (action === 'delete_user') {
            const tid = String(body.telegram_id || '').trim();
            if (!tid) return res.status(400).json({ error: 'ID manquant' });
            await query('DELETE FROM users WHERE telegram_id = $1', [tid]);
            return res.status(200).json({ success: true, action: 'deleted', telegram_id: tid });
        }

        // ─── EDIT REFERRAL COUNT (add/remove referrals for a user) ───
        if (action === 'edit_referral') {
            const referrerId = String(body.referrer_id || '').trim();
            const targetAction = String(body.target_action || '').trim(); // 'add' or 'remove'
            const referredId = String(body.referred_id || '').trim();
            const referredUsername = String(body.referred_username || '').trim() || null;

            if (!referrerId || !targetAction) return res.status(400).json({ error: 'referrer_id et target_action requis' });

            if (targetAction === 'add') {
                if (!referredId) return res.status(400).json({ error: 'referred_id requis pour ajouter' });
                const existing = await query('SELECT id FROM referrals WHERE referrer_id = $1 AND referred_id = $2', [referrerId, referredId]);
                if (existing.length > 0) return res.status(400).json({ error: 'Ce parrainage existe deja' });
                await query('INSERT INTO referrals (referrer_id, referred_id, referred_username, created_at) VALUES ($1, $2, $3, NOW())',
                    [referrerId, referredId, referredUsername]);
                return res.status(200).json({ success: true, action: 'referral_added' });
            } else if (targetAction === 'remove') {
                if (!referredId) return res.status(400).json({ error: 'referred_id requis pour supprimer' });
                await query('DELETE FROM referrals WHERE referrer_id = $1 AND referred_id = $2', [referrerId, referredId]);
                return res.status(200).json({ success: true, action: 'referral_removed' });
            } else {
                return res.status(400).json({ error: 'target_action doit etre add ou remove' });
            }
        }

        // ─── GET REFERRALS FOR A USER ───
        if (action === 'get_referrals') {
            const tid = String(body.telegram_id || req.query.telegram_id || '').trim();
            if (!tid) return res.status(400).json({ error: 'ID manquant' });
            const referrals = await query('SELECT * FROM referrals WHERE referrer_id = $1 ORDER BY created_at DESC', [tid]);
            return res.status(200).json({ referrals });
        }

        // ─── GET DEPOSITS ───
        if (action === 'get_deposits') {
            const tid = String(body.telegram_id || '').trim();
            if (!tid) return res.status(400).json({ error: 'ID manquant' });
            const user = await query('SELECT one_win_user_id FROM users WHERE telegram_id = $1', [tid]);
            const winId = user.length > 0 ? user[0].one_win_user_id : null;
            let deposits;
            if (winId) {
                deposits = await query(
                    'SELECT d.* FROM deposits d WHERE d.telegram_id = $1 OR d.one_win_user_id = $2 ORDER BY d.created_at DESC LIMIT 100',
                    [tid, winId]
                );
            } else {
                deposits = await query(
                    'SELECT d.* FROM deposits d WHERE d.telegram_id = $1 ORDER BY d.created_at DESC LIMIT 100',
                    [tid]
                );
            }
            return res.status(200).json({ success: true, deposits });
        }

        // ─── CLEANUP DEPOSIT DUPLICATES ───
        if (action === 'cleanup_deposits') {
            const allDeposits = await query('SELECT * FROM deposits ORDER BY created_at DESC');
            const groups = {};
            for (const d of allDeposits) {
                const minute = d.created_at ? d.created_at.toISOString().substring(0, 16) : '';
                const key = d.one_win_user_id + '|' + d.amount + '|' + minute;
                if (!groups[key]) groups[key] = [];
                groups[key].push(d);
            }
            let deleted = [], kept = [];
            for (const [key, group] of Object.entries(groups)) {
                if (group.length <= 1) continue;
                group.sort((a, b) => (a.transaction_id && !b.transaction_id) ? -1 : (!a.transaction_id && b.transaction_id) ? 1 : 0);
                kept.push(group[0]);
                for (let i = 1; i < group.length; i++) {
                    await query('DELETE FROM deposits WHERE id = $1', [group[i].id]);
                    deleted.push(group[i]);
                }
            }
            const affectedUsers = new Set();
            [...deleted, ...kept].forEach(d => {
                if (d.telegram_id) affectedUsers.add(d.telegram_id);
                if (d.one_win_user_id) affectedUsers.add('win:' + d.one_win_user_id);
            });
            let recalculated = 0;
            const MIN_DEP = parseFloat(process.env.MIN_DEPOSIT) || 15;
            for (const uid of affectedUsers) {
                let userResult;
                if (uid.startsWith('win:')) {
                    const winId = uid.substring(4);
                    userResult = await query('SELECT telegram_id FROM users WHERE one_win_user_id = $1', [winId]);
                } else {
                    userResult = await query('SELECT telegram_id FROM users WHERE telegram_id = $1', [uid]);
                }
                if (userResult.length > 0 && userResult[0].telegram_id) {
                    const tgId = userResult[0].telegram_id;
                    const sumResult = await query(
                        "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE telegram_id = $1 OR one_win_user_id = (SELECT one_win_user_id FROM users WHERE telegram_id = $1)",
                        [tgId]
                    );
                    const newTotal = parseFloat(sumResult[0].total);
                    const isDep = newTotal >= MIN_DEP;
                    await query('UPDATE users SET deposit_amount = $1, is_deposited = $2, updated_at = NOW() WHERE telegram_id = $3', [newTotal, isDep, tgId]);
                    recalculated++;
                }
            }
            return res.status(200).json({
                success: true,
                duplicates_removed: deleted.length,
                users_recalculated: recalculated,
                remaining_deposits: allDeposits.length - deleted.length
            });
        }

        // ─── UPDATE BROADCAST STATS ───
        if (action === 'update_broadcast_stats') {
            const stats = body.stats; // { deposited_yesterday: "42", active_players: "128", total_revenue: "5230" }
            if (!stats || typeof stats !== 'object') return res.status(400).json({ error: 'Stats invalides' });

            let updated = 0;
            for (const [key, value] of Object.entries(stats)) {
                const validKeys = ['deposited_yesterday', 'active_players', 'total_revenue'];
                if (!validKeys.includes(key)) continue;
                await query(
                    'INSERT INTO broadcast_stats (stat_key, stat_value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (stat_key) DO UPDATE SET stat_value = $2, updated_at = NOW()',
                    [key, String(value)]
                );
                updated++;
            }
            return res.status(200).json({ success: true, updated });
        }

        return res.status(400).json({ error: 'Action inconnue' });
    } catch (error) {
        console.error('[ADMIN ACTIONS ERROR]', error);
        return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
};
