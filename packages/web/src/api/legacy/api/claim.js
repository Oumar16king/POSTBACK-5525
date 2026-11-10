/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Claim (Direct to Games)
// The bot already verifies registration + deposit before
// showing the Predictions button. So claim.js just
// redirects to the games page with the user's info.
// ═══════════════════════════════════════════════════════
import crypto from 'crypto';
import { query } from '../lib/db.js';
const LINK_SECRET = process.env.LINK_SECRET || process.env.ADMIN_PASSWORD || '';

function htmlRedirect(url) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<script>window.location.replace("${url}");</script>
<meta http-equiv="refresh" content="0;url=${url}">
</head><body><p>Redirection...</p><script>window.location.replace("${url}");</script></body></html>`;
}

export default async function handler(req, res) {
    try {
        const token = req.query.token;
        const BASE = process.env.PREDICTION_URL || '';

        // No token → redirect to games without uid (public view)
        if (!token) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlRedirect(`${BASE}/jeux/index.html`));
        }

        let decoded;
        try {
            decoded = Buffer.from(token, 'base64url').toString('utf8');
        } catch (e) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlRedirect(`${BASE}/jeux/index.html`));
        }

        const parts = decoded.split(':');
        if (parts.length !== 3) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlRedirect(`${BASE}/jeux/index.html`));
        }

        const [telegramId, expiresAt, sig] = parts;

        // Verify token signature
        const expectedSig = crypto.createHmac('sha256', LINK_SECRET)
            .update(`${telegramId}:${expiresAt}`)
            .digest('hex')
            .substring(0, 12);

        if (sig !== expectedSig) {
            console.warn('[CLAIM] Invalid token for user', telegramId);
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlRedirect(`${BASE}/jeux/index.html`));
        }

        // Token valid → get user info and redirect to games
        let userLang = 'fr';
        try {
            const users = await query('SELECT language FROM users WHERE telegram_id = $1', [parseInt(telegramId)]);
            if (users.length > 0 && users[0].language) userLang = users[0].language;
        } catch (e) {
            console.warn('[CLAIM] DB lookup failed:', e.message);
        }

        const predTarget = `${BASE}/jeux/index.html?uid=${telegramId}&lang=${userLang}`;
        console.log('[CLAIM] Redirecting user', telegramId, 'to games');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlRedirect(predTarget));
    } catch (error) {
        console.error('[CLAIM ERROR]', error);
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlRedirect('/jeux/index.html'));
    }
};
