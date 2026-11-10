/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Postback Gaming
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';

const POSTBACK_SECRET = process.env.POSTBACK_SECRET;

function verifyPostback(req) {
    if (!POSTBACK_SECRET) {
        console.warn('[POSTBACK AUTH] POSTBACK_SECRET not set - postback auth disabled');
        return true;
    }
    const sig = req.query.sig || req.headers['x-postback-sig'] || '';
    if (sig === POSTBACK_SECRET) return true;
    console.warn('[POSTBACK AUTH] Invalid static token, rejected.');
    return false;
}

export default async function handler(req, res) {
    try {
        if (!verifyPostback(req)) {
            console.warn('[POSTBACK GAMING] Invalid signature, rejected.');
            return res.status(403).send('Forbidden');
        }

        const clickid = req.query.clickid || null;
        const userId1win = req.query.user_id;
        let eventType = req.query.event_type || '';
        let amount = parseFloat(req.query.amount) || 0;
        const transactionId = req.query.transactionid || req.query.txn_id || null;
        const gameType = req.query.game_type || null;
        const eventId = req.query.event_id || null;

        if (!userId1win && !clickid) return res.status(400).send('Missing identifiers');

        // ─── Auto-detect win/loss from amount sign (1Win Revenus) ───
        if (!eventType && amount !== 0) {
            if (amount < 0) {
                // Negative = affiliate lost money = player won
                eventType = 'win';
                amount = Math.abs(amount);
            } else {
                // Positive = affiliate gained money = player lost
                eventType = 'loss';
            }
        }
        if (!eventType) eventType = 'loss';

        console.log(`[POSTBACK GAMING] clickid=${clickid}, user_id=${userId1win}, type=${eventType}, amount=${amount}, txn=${transactionId}`);

        // ─── Déterminer le telegram_id ───
        let telegramId = clickid ? parseInt(clickid) : null;

        if (!telegramId && userId1win) {
            const found = await query('SELECT telegram_id FROM users WHERE one_win_user_id = $1 LIMIT 1', [String(userId1win)]);
            if (found.length > 0) telegramId = found[0].telegram_id;
        }

        if (!telegramId) {
            console.log(`[POSTBACK GAMING] No telegram_id found, skipping.`);
            return res.status(200).send('OK');
        }

        // ─── Vérifier si la transaction a déjà été traitée ───
        if (transactionId) {
            const dup = await query('SELECT id FROM gaming_events WHERE transaction_id = $1', [transactionId]);
            if (dup.length > 0) {
                console.log(`[POSTBACK GAMING] Transaction ${transactionId} already processed, skipping.`);
                return res.status(200).send('OK');
            }
        }

        // ─── S'assurer que l'utilisateur existe ───
        const existing = await query('SELECT telegram_id FROM users WHERE telegram_id = $1', [telegramId]);
        if (existing.length === 0) {
            console.log(`[POSTBACK GAMING] User ${telegramId} not found in users table, skipping.`);
            return res.status(200).send('OK');
        }

        // ─── Enregistrer l'événement de gaming ───
        await query(
            `INSERT INTO gaming_events (telegram_id, one_win_user_id, event_type, amount, transaction_id, game_type, event_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [telegramId, String(userId1win || ''), eventType, amount, transactionId, gameType, eventId]
        );

        console.log(`[POSTBACK GAMING] OK: ${eventType} ${amount}$ | tg=${telegramId} | 1win=${userId1win} | txn=${transactionId || 'N/A'}`);
        res.status(200).send('OK');
    } catch (error) {
        console.error('[POSTBACK GAMING ERROR]', error);
        res.status(500).send('Error');
    }
};
