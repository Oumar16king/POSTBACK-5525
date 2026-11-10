/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Verify 1Win ID
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';
const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 15;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { one_win_id } = req.body || {};
        if (!one_win_id || !one_win_id.toString().trim()) {
            return res.status(400).json({ success: false, message: 'Identifiant 1Win requis.' });
        }

        const winId = one_win_id.toString().trim();
        const users = await query('SELECT * FROM users WHERE one_win_user_id = $1', [winId]);

        if (users.length === 0) {
            return res.status(200).json({ success: false, message: 'Identifiant non reconnu. Assurez-vous d\'etre inscrit avec le code promo DVYS.' });
        }

        const user = users[0];

        if (!user.is_registered) {
            return res.status(200).json({ success: false, message: 'Inscription non encore confirmee. Veuillez patienter quelques minutes puis reessayez.' });
        }

        const totalDep = parseFloat(user.deposit_amount) || 0;

        if (totalDep < MIN_DEPOSIT) {
            const remaining = (MIN_DEPOSIT - totalDep).toFixed(2);
            if (totalDep > 0) {
                return res.status(200).json({
                    success: false,
                    message: 'Depot total insuffisant : ' + totalDep.toFixed(2) + '$. Il vous manque ' + remaining + '$ (soit environ ' + Math.ceil(parseFloat(remaining) * 666.67) + ' FCFA) pour atteindre le minimum de ' + MIN_DEPOSIT + '$.'
                });
            }
            return res.status(200).json({
                success: false,
                message: 'Aucun depot detecte. Effectuez un depot minimum de ' + MIN_DEPOSIT + '$ (10000 FCFA) sur votre compte 1Win.'
            });
        }

        return res.status(200).json({ success: true, message: 'Acces accorde !' });
    } catch (error) {
        console.error('[VERIFY 1WIN ERROR]', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur. Reessayez.' });
    }
};
