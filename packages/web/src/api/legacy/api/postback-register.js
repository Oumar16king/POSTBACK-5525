/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Postback Registration
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
            console.warn('[POSTBACK REG] Invalid signature, rejected.');
            return res.status(403).send('Forbidden');
        }

        const clickid = req.query.clickid || null;
        const userId1win = req.query.user_id;
        const hash = req.query.hash;
        const country = req.query.country;

        if (!userId1win) return res.status(400).send('Missing user_id');
        console.log(`[POSTBACK REG] clickid=${clickid}, user_id=${userId1win}, hash=${hash}`);

        if (clickid) {
            const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [clickid]);
            if (existing.length > 0) {
                await query(
                    'UPDATE users SET is_registered = TRUE, one_win_user_id = $1, registered_at = NOW(), updated_at = NOW() WHERE telegram_id = $2',
                    [userId1win, clickid]
                );
            } else {
                await query(
                    'INSERT INTO users (telegram_id, one_win_user_id, is_registered, created_at, updated_at) VALUES ($1, $2, TRUE, NOW(), NOW())',
                    [clickid, userId1win]
                );
            }
        } else {
            const existing = await query('SELECT * FROM users WHERE one_win_user_id = $1', [userId1win]);
            if (existing.length === 0) {
                await query(
                    'INSERT INTO users (one_win_user_id, is_registered, created_at, updated_at) VALUES ($1, TRUE, NOW(), NOW())',
                    [userId1win]
                );
            } else {
                await query(
                    'UPDATE users SET is_registered = TRUE, registered_at = NOW(), updated_at = NOW() WHERE one_win_user_id = $1',
                    [userId1win]
                );
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[POSTBACK REG ERROR]', error);
        res.status(500).send('Error');
    }
};
