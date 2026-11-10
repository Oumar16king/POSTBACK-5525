/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// Last updated: 1778157824
// ═══════════════════════════════════════════════════════
// DVYS V2 - Postback Deposit
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';
import fetch from 'node-fetch';

const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 15;
const NOTIF_BOT_TOKEN = process.env.NOTIF_BOT_TOKEN;
const ADMIN_CHAT_IDS = (process.env.NOTIF_ADMIN_CHAT_ID || '').split(',').filter(id => id.trim() !== '');
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

async function sendNotif(chatId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${NOTIF_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
    } catch (e) { console.error('[NOTIF ERROR]', e.message); }
}

export default async function handler(req, res) {
    try {
        if (!verifyPostback(req)) {
            console.warn('[POSTBACK DEP] Invalid signature, rejected.');
            return res.status(403).send('Forbidden');
        }

        const clickid = req.query.clickid || null;
        const userId1win = req.query.user_id;
        const amount = parseFloat(req.query.amount) || 0;
        const transactionId = req.query.transactionid || null;

        if (!userId1win) return res.status(400).send('Missing user_id');
        console.log(`[POSTBACK DEP] clickid=${clickid}, user_id=${userId1win}, amount=${amount}, txn=${transactionId}`);

        // ─── Vérifier si la transaction a déjà été traitée ───
        if (transactionId) {
            const dup = await query('SELECT id FROM deposits WHERE transaction_id = $1', [transactionId]);
            if (dup.length > 0) {
                console.log(`[POSTBACK DEP] Transaction ${transactionId} déjà traitée, ignorée.`);
                return res.status(200).send('OK');
            }
        }

        let telegramId = clickid || null;
        let total = amount;

        if (clickid) {
            const existing = await query('SELECT * FROM users WHERE telegram_id = $1', [clickid]);
            if (existing.length > 0) {
                const user = existing[0];
                total = parseFloat(user.deposit_amount || 0) + amount;
                const ok = total >= MIN_DEPOSIT;
                await query(
                    'UPDATE users SET is_deposited = $1, deposit_amount = $2, one_win_user_id = $3, is_registered = TRUE, deposited_at = NOW(), updated_at = NOW() WHERE telegram_id = $4',
                    [ok, total, userId1win, clickid]
                );
            } else {
                const ok = amount >= MIN_DEPOSIT;
                await query(
                    'INSERT INTO users (telegram_id, one_win_user_id, is_registered, is_deposited, deposit_amount, deposited_at, created_at, updated_at) VALUES ($1, $2, TRUE, $3, $4, CASE WHEN $3 THEN NOW() ELSE NULL END, NOW(), NOW())',
                    [clickid, userId1win, ok, amount]
                );
            }
        } else {
            const existing = await query('SELECT * FROM users WHERE one_win_user_id = $1', [userId1win]);
            if (existing.length > 0) {
                telegramId = existing[0].telegram_id;
                total = parseFloat(existing[0].deposit_amount || 0) + amount;
                const ok = total >= MIN_DEPOSIT;
                await query(
                    'UPDATE users SET is_deposited = $1, deposit_amount = $2, is_registered = TRUE, deposited_at = NOW(), updated_at = NOW() WHERE one_win_user_id = $3',
                    [ok, total, userId1win]
                );
            } else {
                const ok = amount >= MIN_DEPOSIT;
                await query(
                    'INSERT INTO users (one_win_user_id, is_registered, is_deposited, deposit_amount, deposited_at, created_at, updated_at) VALUES ($1, TRUE, $2, $3, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW(), NOW())',
                    [userId1win, ok, amount]
                );
            }
        }

        // ─── Enregistrer la transaction ───
        await query(
            'INSERT INTO deposits (telegram_id, one_win_user_id, amount, transaction_id, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [telegramId, userId1win, amount, transactionId]
        );

        // ─── Notification Admin ───
        if (ADMIN_CHAT_IDS.length > 0 && NOTIF_BOT_TOKEN) {
            const notif = '<b>💰 Nouveau dépôt (DVYS V2)</b>\n\n'
                + '<b>ID 1Win :</b> <code>' + userId1win + '</code>\n'
                + '<b>Telegram ID :</b> <code>' + (telegramId || 'N/A') + '</code>\n'
                + '<b>Montant :</b> $' + amount.toFixed(2) + '\n'
                + '<b>Total :</b> $' + total.toFixed(2) + '\n'
                + '<b>Transaction :</b> <code>' + (transactionId || 'N/A') + '</code>';
            for (const chatId of ADMIN_CHAT_IDS) { await sendNotif(chatId, notif); }
        }

        // ─── Notification au parrain si le filleul dépose ───
        if (telegramId && total >= MIN_DEPOSIT) {
            try {
                const refUser = await query('SELECT referred_by FROM users WHERE telegram_id = $1', [telegramId]);
                if (refUser.length > 0 && refUser[0].referred_by) {
                    const referrerId = refUser[0].referred_by;
                    const depositor = await query('SELECT first_name, language FROM users WHERE telegram_id = $1', [telegramId]);
                    const referrer = await query('SELECT language, is_active, is_deposited, deposit_amount, blocked_bot FROM users WHERE telegram_id = $1', [referrerId]);

                    // Parrainage réservé uniquement aux users qui ont déposé et ont accès VIP
                    if (referrer.length > 0 && referrer[0].is_deposited && parseFloat(referrer[0].deposit_amount) >= MIN_DEPOSIT && referrer[0].is_active !== false && !referrer[0].blocked_bot) {
                        const depName = depositor.length > 0 ? (depositor[0].first_name || 'Un ami') : 'Un ami';
                        const refLang = referrer[0].language || 'fr';
                        const BOT_TOKEN = process.env.BOT_TOKEN;

                        const notifMsgs = {
                            fr: `💰 <b>Filleul VIP !</b>\n\nVotre filleul <b>${depName}</b> vient de déposer !\n\nC'est la preuve que ça marche — partagez encore plus ! 🏆`,
                            en: `💰 <b>VIP Referral!</b>\n\nYour referral <b>${depName}</b> just deposited!\n\nProof it works — share even more! 🏆`,
                            hi: `💰 <b>VIP रेफरल!</b>\n\nआपका रेफरल <b>${depName}</b> ने डिपॉजिट किया!\n\n🏆`,
                            uz: `💰 <b>VIP referal!</b>\n\nReferalingiz <b>${depName}</b> to'ldirdi!\n\n🏆`,
                            es: `💰 <b>Referido VIP!</b>\n\nSu referido <b>${depName}</b> depositó!\n\n🏆`,
                            az: `💰 <b>VIP referal!</b>\n\nReferalınız <b>${depName}</b> depozit etdi!\n\n🏆`,
                            tr: `💰 <b>VIP davet!</b>\n\nDavetiniz <b>${depName}</b> yatırdı!\n\n🏆`,
                            ar: `💰 <b>إحالة VIP!</b>\n\nإحالتك <b>${depName}</b> أودعت!\n\n🏆`,
                            ru: `💰 <b>VIP-реферал!</b>\n\nВаш реферал <b>${depName}</b> внёс депозит!\n\n🏆`,
                            pt: `💰 <b>Indicação VIP!</b>\n\nSua indicação <b>${depName}</b> depositou!\n\n🏆`
                        };

                        const notifText = notifMsgs[refLang] || notifMsgs.fr;
                        try {
                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ chat_id: referrerId, text: notifText, parse_mode: 'HTML' })
                            });
                        } catch (e) { console.error('[REFERRAL NOTIF ERROR]', e.message); }
                    }
                }
            } catch (refErr) {
                console.error('[REFERRAL DEPOSIT NOTIFY ERROR]', refErr.message);
            }
        }

        console.log(`[POSTBACK DEP] OK: ${amount}$ | tg=${telegramId || 'N/A'} | 1win=${userId1win}`);
        res.status(200).send('OK');
    } catch (error) {
        console.error('[POSTBACK DEP ERROR]', error);
        res.status(500).send('Error');
    }
};
