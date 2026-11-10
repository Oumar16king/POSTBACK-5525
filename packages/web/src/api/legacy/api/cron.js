/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS V2 - Unified Cron Handler
// Route: GET /api/cron?action=relance|referral|broadcast-morning|broadcast-evening
// Combines all cron jobs into a single serverless function
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const REG_LINK = process.env.REG_LINK || 'https://one-vv343.com/casino?p=ufjv';
const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 15;
const PROMO = process.env.PROMO_CODE || 'DVYS';
const CHANNEL = process.env.CHANNEL || '@dvyswin';
const CRON_SECRET = process.env.CRON_SECRET || 'dyvscron2024';
const MAX_RELANCE = 5;
const MSG_DELAY_MS = 40;

const LANGS = {
    fr: { flag: '🇫🇷', rate: 666.67, symbol: 'FCFA' },
    en: { flag: '🇬🇧', rate: 1, symbol: '$' },
    hi: { flag: '🇮🇳', rate: 83.5, symbol: '₹' },
    uz: { flag: '🇺🇿', rate: 12650, symbol: "so'm" },
    es: { flag: '🇪🇸', rate: 0.92, symbol: '€' },
    az: { flag: '🇦🇿', rate: 1.7, symbol: '₼' },
    tr: { flag: '🇹🇷', rate: 34, symbol: '₺' },
    ar: { flag: '🇸🇦', rate: 3.75, symbol: 'ر.س' },
    ru: { flag: '🇷🇺', rate: 91.5, symbol: '₽' },
    pt: { flag: '🇵🇹', rate: 5.5, symbol: 'R$' }
};

function depStr(lang) {
    const l = LANGS[lang] || LANGS.fr;
    const local = Math.round(MIN_DEPOSIT * l.rate);
    if (lang === 'en') return `$${MIN_DEPOSIT}`;
    return `${MIN_DEPOSIT}$ (${local} ${l.symbol})`;
}

function regLinkTid(tid) { return `${REG_LINK}&sub1=${tid}`; }
function referralLink(tid) { return `https://t.me/${process.env.BOT_USERNAME || 'predvys_bot'}?start=ref${tid}`; }

async function tgAPI(method, data) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { console.error('[TG API ERROR]', e); return { ok: false }; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendMessageAndTrack(chatId, message, telegramId, messageType, lang) {
    const r = await tgAPI('sendMessage', {
        chat_id: chatId, text: message, parse_mode: 'HTML', disable_web_page_preview: true
    });
    if (r.ok) {
        await query('INSERT INTO message_log (telegram_id, message_type, message_lang, sent_at) VALUES ($1, $2, $3, NOW())',
            [telegramId, messageType, lang]);
        return true;
    } else {
        if (r.description && (r.description.includes('blocked') || r.description.includes('deactivated') || r.description.includes('not found'))) {
            await query('UPDATE users SET blocked_bot = TRUE, is_active = FALSE WHERE telegram_id = $1', [telegramId]);
        }
        return false;
    }
}

// ═══════════════════════════════════════════════════════
// RELANCE MESSAGES (5 templates × 10 languages)
// ═══════════════════════════════════════════════════════
const RELANCE_MSG = {
    fr: [
        (n, l, c) => `🎰 <b>${n}, ne ratez pas ça !</b>\n\n🔥 <b>${c} joueurs</b> ont déjà déposé aujourd'hui et accèdent aux prédictions VIP.\n\n⏳ Les places sont limitées — déposez minimum <b>${depStr('fr')}</b> maintenant.\n\n👉 <a href="${l}">Déposer maintenant</a>\n📝 Code promo: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, votre accès VIP vous attend !</b>\n\n✅ <b>${c} joueurs</b> actifs en ce moment\n\nUn dépôt de <b>${depStr('fr')}</b> suffit pour débloquer l'accès complet.\n\n⚡ <a href="${l}">Ouvrir mon compte</a>`,
        (n, l, c) => `🚨 <b>Dernière chance ${n} !</b>\n\n📊 <b>${c} dépôts</b> aujourd'hui — les joueurs gagnent ENCORE.\n\nDéposez <b>${depStr('fr')}</b> maintenant ou regardez les autres gagner.\n\n🎯 <a href="${l}">Je veux gagner aussi</a>`,
        (n, l, c) => `🏆 <b>${n}, on vous attend dans le VIP !</b>\n\n🔥 <b>${c} joueurs</b> profitent déjà des gains quotidiens.\n\nUn dépôt de seulement <b>${depStr('fr')}</b> et c'est parti !\n\n👉 <a href="${l}">Rejoindre le VIP</a>`,
        (n, l, c) => `⚡ <b>Offre exclusive pour ${n} !</b>\n\n✅ <b>${c} joueurs</b> ont déjà pris les devants.\n\nDéposez <b>${depStr('fr')}</b> maintenant et ne manquez plus aucun signal.\n\n🎯 <a href="${l}">Activer mon accès</a>`
    ],
    en: [
        (n, l, c) => `🎰 <b>${n}, don't miss out!</b>\n\n🔥 <b>${c} players</b> already deposited today and access VIP predictions.\n\n⏳ Spots limited — deposit minimum <b>${depStr('en')}</b> now.\n\n👉 <a href="${l}">Deposit now</a>\n📝 Promo: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, your VIP access awaits!</b>\n\n✅ <b>${c} players</b> active right now\n\nDeposit <b>${depStr('en')}</b> to unlock full access.\n\n⚡ <a href="${l}">Open my account</a>`,
        (n, l, c) => `🚨 <b>Last chance ${n}!</b>\n\n📊 <b>${c} deposits</b> today — players STILL winning.\n\nDeposit <b>${depStr('en')}</b> now or watch others win.\n\n🎯 <a href="${l}">I want to win too</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP awaits!</b>\n\n🔥 <b>${c} players</b> already profiting daily.\n\nDeposit just <b>${depStr('en')}</b> and you're in!\n\n👉 <a href="${l}">Join VIP</a>`,
        (n, l, c) => `⚡ <b>Exclusive offer for ${n}!</b>\n\n✅ <b>${c} players</b> already ahead.\n\nDeposit <b>${depStr('en')}</b> and never miss a signal.\n\n🎯 <a href="${l}">Activate access</a>`
    ],
    hi: [
        (n, l, c) => `🎰 <b>${n}, ये मत छोड़ें!</b>\n\n🔥 <b>${c} खिलाड़ी</b> ने आज जमा किया\n\n⏳ न्यूनतम <b>${depStr('hi')}</b> जमा करें\n\n👉 <a href="${l}">अभी जमा करें</a>\n📝 प्रोमो: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, VIP एक्सेस इंतज़ार कर रहा है!</b>\n\n✅ <b>${c} खिलाड़ी</b> एक्टिव\n\n<b>${depStr('hi')}</b> जमा करें\n\n⚡ <a href="${l}">अकाउंट खोलें</a>`,
        (n, l, c) => `🚨 <b>${n} अंतिम मौका!</b>\n\n📊 आज <b>${c} जमा</b>\n\n<b>${depStr('hi')}</b> जमा करें\n\n🎯 <a href="${l}">मैं भी जीतना चाहता हूँ</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP में आपका इंतज़ार!</b>\n\n🔥 <b>${c} खिलाड़ी</b> कमा रहे\n\nकेवल <b>${depStr('hi')}</b> जमा करें\n\n👉 <a href="${l}">VIP जॉइन करें</a>`,
        (n, l, c) => `⚡ <b>${n} के लिए एक्सक्लूसिव!</b>\n\n✅ <b>${c} खिलाड़ी</b> आगे\n\n<b>${depStr('hi')}</b> जमा करें\n\n🎯 <a href="${l}">एक्सेस एक्टिवेट करें</a>`
    ],
    uz: [
        (n, l, c) => `🎰 <b>${n}, buni o'tkazib yubormang!</b>\n\n🔥 <b>${c} o'yinchi</b> bugun to'ldirdi\n\n⏳ Kamida <b>${depStr('uz')}</b> to'ldiring\n\n👉 <a href="${l}">Hozir to'ldiring</a>\n📝 Promo: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, VIP sizni kutmoqda!</b>\n\n✅ <b>${c} o'yinchi</b> faol\n\n<b>${depStr('uz')}</b> to'ldiring\n\n⚡ <a href="${l}">Hisobimni ochish</a>`,
        (n, l, c) => `🚨 <b>${n}, so'nggi imkoniyat!</b>\n\n📊 <b>${c} to'ldirish</b> bugun\n\n<b>${depStr('uz')}</b> to'ldiring\n\n🎯 <a href="${l}">Men ham yutmoqchiman</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP kutmoqda!</b>\n\n🔥 <b>${c} o'yinchi</b> yutyapti\n\n<b>${depStr('uz')}</b> to'ldiring\n\n👉 <a href="${l}">VIP ga qo'shiling</a>`,
        (n, l, c) => `⚡ <b>${n} uchun maxsus!</b>\n\n✅ <b>${c} o'yinchi</b> oldinga chiqdi\n\n<b>${depStr('uz')}</b> to'ldiring\n\n🎯 <a href="${l}">Kirishni faollashtirish</a>`
    ],
    es: [
        (n, l, c) => `🎰 <b>${n}, no se lo pierda!</b>\n\n🔥 <b>${c} jugadores</b> depositaron hoy\n\n⏳ Depósito mínimo <b>${depStr('es')}</b>\n\n👉 <a href="${l}">Depositar ahora</a>\n📝 Código: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, su acceso VIP!</b>\n\n✅ <b>${c} jugadores</b> activos\n\nDeposite <b>${depStr('es')}</b>\n\n⚡ <a href="${l}">Abrir cuenta</a>`,
        (n, l, c) => `🚨 <b>Última oportunidad ${n}!</b>\n\n📊 <b>${c} depósitos</b> hoy\n\nDeposite <b>${depStr('es')}</b>\n\n🎯 <a href="${l}">Yo también quiero ganar</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP le espera!</b>\n\n🔥 <b>${c} jugadores</b> ganando\n\nSolo <b>${depStr('es')}</b>\n\n👉 <a href="${l}">Unirse a VIP</a>`,
        (n, l, c) => `⚡ <b>Oferta exclusiva ${n}!</b>\n\n✅ <b>${c} jugadores</b> adelante\n\nDeposite <b>${depStr('es')}</b>\n\n🎯 <a href="${l}">Activar acceso</a>`
    ],
    az: [
        (n, l, c) => `🎰 <b>${n}, bunu qaçırmayın!</b>\n\n🔥 <b>${c} oyunçu</b> depozit etdi\n\n⏳ Minimum <b>${depStr('az')}</b>\n\n👉 <a href="${l}">İndi daxil edin</a>\n📝 Promo: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, VIP girişiniz!</b>\n\n✅ <b>${c} oyunçu</b> aktiv\n\n<b>${depStr('az')}</b> daxil edin\n\n⚡ <a href="${l}">Hesabımı açmaq</a>`,
        (n, l, c) => `🚨 <b>${n}, son şans!</b>\n\n📊 <b>${c} depozit</b> bugün\n\n<b>${depStr('az')}</b> daxil edin\n\n🎯 <a href="${l}">Mən də qazanmaq istəyirəm</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP gözləyir!</b>\n\n🔥 <b>${c} oyunçu</b> qazanır\n\n<b>${depStr('az')}</b> daxil edin\n\n👉 <a href="${l}">VIP-ə qoşulun</a>`,
        (n, l, c) => `⚡ <b>${n} üçün eksklüziv!</b>\n\n✅ <b>${c} oyunçu</b> irəlidə\n\n<b>${depStr('az')}</b> daxil edin\n\n🎯 <a href="${l}">Girişi aktivləşdirin</a>`
    ],
    tr: [
        (n, l, c) => `🎰 <b>${n}, bunu kaçırmayın!</b>\n\n🔥 <b>${c} oyuncu</b> bugün yatırdı\n\n⏳ Minimum <b>${depStr('tr')}</b>\n\n👉 <a href="${l}">Şimdi yatırdın</a>\n📝 Promo: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, VIP erişim!</b>\n\n✅ <b>${c} oyuncu</b> aktif\n\n<b>${depStr('tr')}</b> yatırdın\n\n⚡ <a href="${l}">Hesabımı aç</a>`,
        (n, l, c) => `🚨 <b>${n}, son şans!</b>\n\n📊 <b>${c} yatırım</b> bugün\n\n<b>${depStr('tr')}</b> yatırdın\n\n🎯 <a href="${l}">Ben de kazanmak istiyorum</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP bekliyor!</b>\n\n🔥 <b>${c} oyuncu</b> kazanıyor\n\n<b>${depStr('tr')}</b> yatırdın\n\n👉 <a href="${l}">VIP'ye katıl</a>`,
        (n, l, c) => `⚡ <b>${n} için özel teklif!</b>\n\n✅ <b>${c} oyuncu</b> önde\n\n<b>${depStr('tr')}</b> yatırdın\n\n🎯 <a href="${l}">Erişimi etkinleştir</a>`
    ],
    ar: [
        (n, l, c) => `🎰 <b>${n}، لا تفوّت هذا!</b>\n\n🔥 <b>${c} لاعب</b> أودعوا اليوم\n\n⏳ أودع <b>${depStr('ar')}</b> الآن\n\n👉 <a href="${l}">أودع الآن</a>\n📝 الرمز: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}، وصولك VIP!</b>\n\n✅ <b>${c} لاعب</b> نشط\n\nإيداع <b>${depStr('ar')}</b>\n\n⚡ <a href="${l}">فتح حسابي</a>`,
        (n, l, c) => `🚨 <b>فرصة أخيرة ${n}!</b>\n\n📊 <b>${c} إيداع</b> اليوم\n\nأودع <b>${depStr('ar')}</b>\n\n🎯 <a href="${l}">أريد الفوز أيضاً</a>`,
        (n, l, c) => `🏆 <b>${n}، ننتظرك في VIP!</b>\n\n🔥 <b>${c} لاعب</b> يكسبون\n\nأودع <b>${depStr('ar')}</b>\n\n👉 <a href="${l}">انضم لـ VIP</a>`,
        (n, l, c) => `⚡ <b>عرض حصري لـ ${n}!</b>\n\n✅ <b>${c} لاعب</b> سبقوك\n\nأودع <b>${depStr('ar')}</b>\n\n🎯 <a href="${l}">تفعيل وصولي</a>`
    ],
    ru: [
        (n, l, c) => `🎰 <b>${n}, не упустите!</b>\n\n🔥 <b>${c} игроков</b> уже внесли депозит\n\n⏳ Минимум <b>${depStr('ru')}</b>\n\n👉 <a href="${l}">Внести депозит</a>\n📝 Промокод: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, VIP-доступ ждёт!</b>\n\n✅ <b>${c} игроков</b> активны\n\nДепозит <b>${depStr('ru')}</b>\n\n⚡ <a href="${l}">Открыть аккаунт</a>`,
        (n, l, c) => `🚨 <b>Последний шанс, ${n}!</b>\n\n📊 <b>${c} депозитов</b> сегодня\n\nВнесите <b>${depStr('ru')}</b>\n\n🎯 <a href="${l}">Я тоже хочу выиграть</a>`,
        (n, l, c) => `🏆 <b>${n}, ждём в VIP!</b>\n\n🔥 <b>${c} игроков</b> зарабатывают\n\nВнесите <b>${depStr('ru')}</b>\n\n👉 <a href="${l}">Вступить в VIP</a>`,
        (n, l, c) => `⚡ <b>Эксклюзив для ${n}!</b>\n\n✅ <b>${c} игроков</b> впереди\n\nВнесите <b>${depStr('ru')}</b>\n\n🎯 <a href="${l}">Активировать доступ</a>`
    ],
    pt: [
        (n, l, c) => `🎰 <b>${n}, não perca!</b>\n\n🔥 <b>${c} jogadores</b> depositaram hoje\n\n⏳ Mínimo <b>${depStr('pt')}</b>\n\n👉 <a href="${l}">Depositar agora</a>\n📝 Código: <b>${PROMO}</b>`,
        (n, l, c) => `💰 <b>${n}, acesso VIP!</b>\n\n✅ <b>${c} jogadores</b> ativos\n\nDeposite <b>${depStr('pt')}</b>\n\n⚡ <a href="${l}">Abrir conta</a>`,
        (n, l, c) => `🚨 <b>Última chance ${n}!</b>\n\n📊 <b>${c} depósitos</b> hoje\n\nDeposite <b>${depStr('pt')}</b>\n\n🎯 <a href="${l}">Eu quero ganhar</a>`,
        (n, l, c) => `🏆 <b>${n}, VIP espera!</b>\n\n🔥 <b>${c} jogadores</b> ganhando\n\nApenas <b>${depStr('pt')}</b>\n\n👉 <a href="${l}">Entrar no VIP</a>`,
        (n, l, c) => `⚡ <b>Oferta exclusiva ${n}!</b>\n\n✅ <b>${c} jogadores</b> adiante\n\nDeposite <b>${depStr('pt')}</b>\n\n🎯 <a href="${l}">Ativar acesso</a>`
    ]
};

// ═══════════════════════════════════════════════════════
// REFERRAL MESSAGES (4 types × 10 languages)
// ═══════════════════════════════════════════════════════
const REF_MSG = {
    fr: {
        initial: (n, l) => `🎁 <b>${n}, gagnez avec DVYS !</b>\n\nPartagez votre lien unique et invitez vos amis.\nChaque ami qui rejoint le bot vous rapproche du VIP !\n\n🔗 <b>Votre lien :</b>\n<code>${l}</code>\n\n📌 Copiez et envoyez à vos amis !`,
        reminder: (n, l, c) => `🔔 <b>Rappel parrainage — ${n}</b>\n\nVous avez <b>${c} filleul${c > 1 ? 's' : ''}</b> !\n\n🔗 <code>${l}</code>\n\nPlus vous parrainez, plus vous gagnez ! 💰`,
        new_ref: (n, rn) => `🎉 <b>Nouveau filleul !</b>\n\n${n}, <b>${rn}</b> vient de s'inscrire via votre lien !\n\nContinuez à partager ! 🚀`,
        ref_dep: (n, rn) => `💰 <b>Filleul VIP !</b>\n\n${n}, votre filleul <b>${rn}</b> vient de déposer !\n\nC'est la preuve que ça marche ! 🏆`
    },
    en: {
        initial: (n, l) => `🎁 <b>${n}, earn with DVYS!</b>\n\nShare your unique link and invite friends.\nEach friend who joins brings you closer to VIP!\n\n🔗 <b>Your link:</b>\n<code>${l}</code>\n\n📌 Copy and send to friends!`,
        reminder: (n, l, c) => `🔔 <b>Referral reminder — ${n}</b>\n\nYou have <b>${c} referral${c > 1 ? 's' : ''}!</b>\n\n🔗 <code>${l}</code>\n\nThe more you refer, the more you earn! 💰`,
        new_ref: (n, rn) => `🎉 <b>New referral!</b>\n\n${n}, <b>${rn}</b> signed up via your link!\n\nKeep sharing! 🚀`,
        ref_dep: (n, rn) => `💰 <b>VIP referral!</b>\n\n${n}, your referral <b>${rn}</b> just deposited!\n\nProof it works! 🏆`
    },
    hi: { initial: (n, l) => `🎁 <b>${n}, DVYS से कमाएं!</b>\n\n🔗 <code>${l}</code>\n\n📌 दोस्तों को भेजें!`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} रेफरल!</b>\n\n🔗 <code>${l}</code>\n\n💰`, new_ref: (n, rn) => `🎉 <b>नया रेफरल!</b>\n\n<b>${rn}</b> ने साइन अप किया! 🚀`, ref_dep: (n, rn) => `💰 <b>VIP रेफरल!</b>\n\n<b>${rn}</b> ने डिपॉजिट किया! 🏆` },
    uz: { initial: (n, l) => `🎁 <b>${n}, DVYS bilan yarating!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} referal!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Yangi referal!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>VIP referal!</b>\n\n<b>${rn}</b> 🏆` },
    es: { initial: (n, l) => `🎁 <b>${n}, gane con DVYS!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} referidos!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Nuevo referido!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>Referido VIP!</b>\n\n<b>${rn}</b> 🏆` },
    az: { initial: (n, l) => `🎁 <b>${n}, DVYS ilə qazanın!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} referal!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Yeni referal!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>VIP referal!</b>\n\n<b>${rn}</b> 🏆` },
    tr: { initial: (n, l) => `🎁 <b>${n}, DVYS ile kazanın!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} davet!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Yeni davet!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>VIP davet!</b>\n\n<b>${rn}</b> 🏆` },
    ar: { initial: (n, l) => `🎁 <b>${n}، اربح مع DVYS!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}، ${c} إحالة!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>إحالة جديدة!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>إحالة VIP!</b>\n\n<b>${rn}</b> 🏆` },
    ru: { initial: (n, l) => `🎁 <b>${n}, зарабатывайте с DVYS!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} рефералов!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Новый реферал!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>VIP-реферал!</b>\n\n<b>${rn}</b> 🏆` },
    pt: { initial: (n, l) => `🎁 <b>${n}, ganhe com DVYS!</b>\n\n🔗 <code>${l}</code>`, reminder: (n, l, c) => `🔔 <b>${n}, ${c} indicações!</b>\n\n🔗 <code>${l}</code>`, new_ref: (n, rn) => `🎉 <b>Nova indicação!</b>\n\n<b>${rn}</b> 🚀`, ref_dep: (n, rn) => `💰 <b>Indicação VIP!</b>\n\n<b>${rn}</b> 🏆` }
};

// ═══════════════════════════════════════════════════════
// BROADCAST MESSAGES (Morning + Evening × 5 templates × 10 langs)
// ═══════════════════════════════════════════════════════
const MORNING_MSG = {
    fr: [
        (s) => `☀️ <b>Bonjour ! Prêt pour une journée gagnante ?</b>\n\n📊 Hier: <b>${s.depositedYesterday} joueurs</b> ont déposé\n💰 Total gains: <b>$${s.totalRevenue}</b>\n\nRejoignez les gagnants — déposez <b>${MIN_DEPOSIT}$</b>\n\n🔥 <a href="${REG_LINK}">Commencer maintenant</a>`,
        (s) => `🌅 <b>Les signaux du matin sont là !</b>\n\n✅ <b>${s.activePlayers} joueurs</b> actifs\n📈 Les prédictions d'hier étaient excellentes\n\n👉 <a href="${REG_LINK}">Accéder aux prédictions</a>`,
        (s) => `💪 <b>C'est le moment de gagner !</b>\n\nHier, <b>${s.depositedYesterday} nouveaux VIP</b> ont rejoint DVYS.\n\nDéposez <b>${MIN_DEPOSIT}$</b> et commencez.\n\n⚡ <a href="${REG_LINK}">Devenir VIP</a>`,
        (s) => `🏆 <b>Résultats d'hier :</b>\n\n📊 <b>${s.depositedYesterday} dépôts</b>\n👥 <b>${s.activePlayers} joueurs</b> actifs\n\nLes prédictions vous attendent !\n\n🎯 <a href="${REG_LINK}">Voir les signaux</a>`,
        (s) => `🎯 <b>Prédictions du jour disponibles !</b>\n\n<b>${s.depositedYesterday} joueurs</b> ont pris les devants hier.\n\n👉 Canal: ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Accéder maintenant</a>`
    ],
    en: [
        (s) => `☀️ <b>Good morning! Ready for a winning day?</b>\n\n📊 Yesterday: <b>${s.depositedYesterday} players</b> deposited\n💰 Total: <b>$${s.totalRevenue}</b>\n\nJoin the winners — deposit <b>$${MIN_DEPOSIT}</b>\n\n🔥 <a href="${REG_LINK}">Start now</a>`,
        (s) => `🌅 <b>Morning signals are here!</b>\n\n✅ <b>${s.activePlayers} players</b> active\n📈 Yesterday's predictions were excellent\n\n👉 <a href="${REG_LINK}">Access predictions</a>`,
        (s) => `💪 <b>Time to win!</b>\n\nYesterday, <b>${s.depositedYesterday} new VIPs</b> joined DVYS.\n\nDeposit <b>$${MIN_DEPOSIT}</b> and start.\n\n⚡ <a href="${REG_LINK}">Become VIP</a>`,
        (s) => `🏆 <b>Yesterday's results:</b>\n\n📊 <b>${s.depositedYesterday} deposits</b>\n👥 <b>${s.activePlayers} players</b> active\n\nPredictions await!\n\n🎯 <a href="${REG_LINK}">See signals</a>`,
        (s) => `🎯 <b>Today's predictions available!</b>\n\n<b>${s.depositedYesterday} players</b> got ahead yesterday.\n\n👉 Channel: ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Access now</a>`
    ],
    hi: [
        (s) => `☀️ <b>सुप्रभात!</b>\n\n📊 कल: <b>${s.depositedYesterday} खिलाड़ी</b> ने जमा किया\n\n🔥 <a href="${REG_LINK}">अभी शुरू करें</a>`,
        (s) => `🌅 <b>सुबह के सिग्नल!</b>\n\n✅ <b>${s.activePlayers} खिलाड़ी</b> एक्टिव\n\n👉 <a href="${REG_LINK}">भविष्यवाणियाँ</a>`,
        (s) => `💪 <b>जीतने का समय!</b>\n\nकल <b>${s.depositedYesterday} नए VIP</b>\n\n⚡ <a href="${REG_LINK}">VIP बनें</a>`,
        (s) => `🏆 <b>कल के नतीजे:</b>\n\n📊 <b>${s.depositedYesterday} जमा</b>\n\n🎯 <a href="${REG_LINK}">सिग्नल</a>`,
        (s) => `🎯 <b>आज की भविष्यवाणियाँ!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">एक्सेस</a>`
    ],
    uz: [
        (s) => `☀️ <b>Xayrli tong!</b>\n\n📊 Kecha: <b>${s.depositedYesterday} o'yinchi</b>\n\n🔥 <a href="${REG_LINK}">Boshlang</a>`,
        (s) => `🌅 <b>Ertalabgi signallar!</b>\n\n✅ <b>${s.activePlayers} o'yinchi</b>\n\n👉 <a href="${REG_LINK}">Taxminlar</a>`,
        (s) => `💪 <b>Yutish vaqti!</b>\n\n<b>${s.depositedYesterday} yangi VIP</b>\n\n⚡ <a href="${REG_LINK}">VIP bo'ling</a>`,
        (s) => `🏆 <b>Kecha natijalari:</b>\n\n<b>${s.depositedYesterday} to'ldirish</b>\n\n🎯 <a href="${REG_LINK}">Signallar</a>`,
        (s) => `🎯 <b>Bugungi taxminlar!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Kirish</a>`
    ],
    es: [
        (s) => `☀️ <b>¡Buenos días!</b>\n\n📊 Ayer: <b>${s.depositedYesterday} jugadores</b>\n\n🔥 <a href="${REG_LINK}">Empezar</a>`,
        (s) => `🌅 <b>¡Señales matutinas!</b>\n\n✅ <b>${s.activePlayers} jugadores</b>\n\n👉 <a href="${REG_LINK}">Predicciones</a>`,
        (s) => `💪 <b>¡Hora de ganar!</b>\n\n<b>${s.depositedYesterday} nuevos VIP</b>\n\n⚡ <a href="${REG_LINK}">Ser VIP</a>`,
        (s) => `🏆 <b>Resultados de ayer:</b>\n\n<b>${s.depositedYesterday} depósitos</b>\n\n🎯 <a href="${REG_LINK}">Señales</a>`,
        (s) => `🎯 <b>¡Predicciones de hoy!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Acceder</a>`
    ],
    az: [
        (s) => `☀️ <b>Sabahınız xeyir!</b>\n\n📊 Dünən: <b>${s.depositedYesterday} oyunçu</b>\n\n🔥 <a href="${REG_LINK}">Başlayın</a>`,
        (s) => `🌅 <b>Səhər siqnalları!</b>\n\n✅ <b>${s.activePlayers} oyunçu</b>\n\n👉 <a href="${REG_LINK}">Proqnozlar</a>`,
        (s) => `💪 <b>Qazanmaq vaxtı!</b>\n\n<b>${s.depositedYesterday} yeni VIP</b>\n\n⚡ <a href="${REG_LINK}">VIP olun</a>`,
        (s) => `🏆 <b>Dünənki nəticələr:</b>\n\n<b>${s.depositedYesterday} depozit</b>\n\n🎯 <a href="${REG_LINK}">Siqnallar</a>`,
        (s) => `🎯 <b>Bugünkü proqnozlar!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Daxil olun</a>`
    ],
    tr: [
        (s) => `☀️ <b>Günaydın!</b>\n\n📊 Dün: <b>${s.depositedYesterday} oyuncu</b>\n\n🔥 <a href="${REG_LINK}">Başlayın</a>`,
        (s) => `🌅 <b>Sabah sinyalleri!</b>\n\n✅ <b>${s.activePlayers} oyuncu</b>\n\n👉 <a href="${REG_LINK}">Tahminler</a>`,
        (s) => `💪 <b>Kazanma zamanı!</b>\n\n<b>${s.depositedYesterday} yeni VIP</b>\n\n⚡ <a href="${REG_LINK}">VIP olun</a>`,
        (s) => `🏆 <b>Dünkü sonuçlar:</b>\n\n<b>${s.depositedYesterday} yatırım</b>\n\n🎯 <a href="${REG_LINK}">Sinyaller</a>`,
        (s) => `🎯 <b>Bugünün tahminleri!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Erişin</a>`
    ],
    ar: [
        (s) => `☀️ <b>صباح الخير!</b>\n\n📊 أمس: <b>${s.depositedYesterday} لاعب</b>\n\n🔥 <a href="${REG_LINK}">ابدأ الآن</a>`,
        (s) => `🌅 <b>إشارات الصباح!</b>\n\n✅ <b>${s.activePlayers} لاعب</b>\n\n👉 <a href="${REG_LINK}">التوقعات</a>`,
        (s) => `💪 <b>وقت الفوز!</b>\n\n<b>${s.depositedYesterday} VIP جديد</b>\n\n⚡ <a href="${REG_LINK}">كن VIP</a>`,
        (s) => `🏆 <b>نتائج أمس:</b>\n\n<b>${s.depositedYesterday} إيداع</b>\n\n🎯 <a href="${REG_LINK}">الإشارات</a>`,
        (s) => `🎯 <b>توقعات اليوم!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">ادخل الآن</a>`
    ],
    ru: [
        (s) => `☀️ <b>Доброе утро!</b>\n\n📊 Вчера: <b>${s.depositedYesterday} игроков</b>\n\n🔥 <a href="${REG_LINK}">Начать сейчас</a>`,
        (s) => `🌅 <b>Утренние сигналы!</b>\n\n✅ <b>${s.activePlayers} игроков</b>\n\n👉 <a href="${REG_LINK}">Прогнозы</a>`,
        (s) => `💪 <b>Время выигрывать!</b>\n\n<b>${s.depositedYesterday} новых VIP</b>\n\n⚡ <a href="${REG_LINK}">Стать VIP</a>`,
        (s) => `🏆 <b>Результаты вчера:</b>\n\n<b>${s.depositedYesterday} депозитов</b>\n\n🎯 <a href="${REG_LINK}">Сигналы</a>`,
        (s) => `🎯 <b>Прогнозы на сегодня!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Доступ</a>`
    ],
    pt: [
        (s) => `☀️ <b>Bom dia!</b>\n\n📊 Ontem: <b>${s.depositedYesterday} jogadores</b>\n\n🔥 <a href="${REG_LINK}">Começar</a>`,
        (s) => `🌅 <b>Sinais da manhã!</b>\n\n✅ <b>${s.activePlayers} jogadores</b>\n\n👉 <a href="${REG_LINK}">Previsões</a>`,
        (s) => `💪 <b>Hora de ganhar!</b>\n\n<b>${s.depositedYesterday} novos VIPs</b>\n\n⚡ <a href="${REG_LINK}">Ser VIP</a>`,
        (s) => `🏆 <b>Resultados de ontem:</b>\n\n<b>${s.depositedYesterday} depósitos</b>\n\n🎯 <a href="${REG_LINK}">Sinais</a>`,
        (s) => `🎯 <b>Previsões de hoje!</b>\n\n👉 ${CHANNEL}\n\n⚡ <a href="${REG_LINK}">Acessar</a>`
    ]
};

const EVENING_MSG = {
    fr: [
        (s) => `🌙 <b>Prédictions du soir disponibles !</b>\n\n🔥 Les analyses nocturnes sont prêtes.\n<b>${s.activePlayers} joueurs</b> connectés.\n\n⏳ Les opportunités ne durent pas.\n\n👉 <a href="${REG_LINK}">Voir les prédictions</a>`,
        (s) => `🎰 <b>Ce soir, ça gagne gros !</b>\n\nLes prédictions VIP du soir ont un taux élevé.\n<b>${s.depositedYesterday} joueurs</b> ont gagné hier.\n\nDéposez <b>${MIN_DEPOSIT}$</b> et jouez gagnant.\n\n⚡ <a href="${REG_LINK}">Accès VIP</a>`,
        (s) => `⏰ <b>Dernière chance du jour !</b>\n\nLes signaux du soir sont les plus rentables.\n✅ <b>${s.activePlayers} joueurs</b> y accèdent déjà.\n\n🎯 <a href="${REG_LINK}">Je veux les signaux</a>`,
        (s) => `🔥 <b>Alerte soirée VIP !</b>\n\nPrédictions exclusives EN LIGNE.\nHier soir: <b>${s.depositedYesterday} joueurs</b> ont gagné.\n\nUn dépôt de <b>${MIN_DEPOSIT}$</b> suffit.\n\n👉 <a href="${REG_LINK}">Débloquer l'accès</a>`,
        (s) => `🚨 <b>Urgence — signaux du soir !</b>\n\n<b>${s.activePlayers} joueurs</b> sont prêts.\n\nDéposez maintenant et ne ratez rien.\n\n⚡ <a href="${REG_LINK}">Je suis prêt</a>`
    ],
    en: [
        (s) => `🌙 <b>Evening predictions available!</b>\n\n🔥 Night analyses ready.\n<b>${s.activePlayers} players</b> connected.\n\n⏳ Opportunities don't last.\n\n👉 <a href="${REG_LINK}">See predictions</a>`,
        (s) => `🎰 <b>Tonight's the night!</b>\n\nVIP evening predictions have high success rate.\n<b>${s.depositedYesterday} players</b> profited yesterday.\n\nDeposit <b>$${MIN_DEPOSIT}</b> and win.\n\n⚡ <a href="${REG_LINK}">VIP access</a>`,
        (s) => `⏰ <b>Last chance today!</b>\n\nEvening signals are most profitable.\n✅ <b>${s.activePlayers} players</b> already accessing.\n\n🎯 <a href="${REG_LINK}">I want the signals</a>`,
        (s) => `🔥 <b>VIP evening alert!</b>\n\nExclusive predictions ONLINE.\nLast night: <b>${s.depositedYesterday} players</b> won.\n\nA deposit of <b>$${MIN_DEPOSIT}</b> is all it takes.\n\n👉 <a href="${REG_LINK}">Unlock access</a>`,
        (s) => `🚨 <b>Urgent — evening signals!</b>\n\n<b>${s.activePlayers} players</b> are ready.\n\nDeposit now and don't miss out.\n\n⚡ <a href="${REG_LINK}">I'm ready</a>`
    ],
    hi: [
        (s) => `🌙 <b>शाम की भविष्यवाणियाँ!</b>\n\n🔥 <b>${s.activePlayers} खिलाड़ी</b> कनेक्ट\n\n👉 <a href="${REG_LINK}">भविष्यवाणियाँ देखें</a>`,
        (s) => `🎰 <b>आज रात बड़ी जीत!</b>\n\n<b>${s.depositedYesterday} खिलाड़ी</b> ने कल फायदा उठाया\n\n⚡ <a href="${REG_LINK}">VIP एक्सेस</a>`,
        (s) => `⏰ <b>आज का आखिरी मौका!</b>\n\n✅ <b>${s.activePlayers} खिलाड़ी</b> एक्सेस कर रहे\n\n🎯 <a href="${REG_LINK}">सिग्नल चाहिए</a>`,
        (s) => `🔥 <b>VIP शाम अलर्ट!</b>\n\n<b>${s.depositedYesterday} खिलाड़ी</b> ने कल रात कमाया\n\n👉 <a href="${REG_LINK}">एक्सेस अनलॉक</a>`,
        (s) => `🚨 <b>अर्जेंट — शाम के सिग्नल!</b>\n\n⚡ <a href="${REG_LINK}">मैं तैयार हूँ</a>`
    ],
    uz: [
        (s) => `🌙 <b>Kechgi taxminlar!</b>\n\n🔥 <b>${s.activePlayers} o'yinchi</b>\n\n👉 <a href="${REG_LINK}">Taxminlar</a>`,
        (s) => `🎰 <b>Bugun katta yutish!</b>\n\n⚡ <a href="${REG_LINK}">VIP kirish</a>`,
        (s) => `⏰ <b>Bugungi so'nggi imkoniyat!</b>\n\n🎯 <a href="${REG_LINK}">Signallar</a>`,
        (s) => `🔥 <b>VIP kechki!</b>\n\n👉 <a href="${REG_LINK}">Kirishni oching</a>`,
        (s) => `🚨 <b>Shoshilinch — kechki signallar!</b>\n\n⚡ <a href="${REG_LINK}">Tayyorman</a>`
    ],
    es: [
        (s) => `🌙 <b>¡Predicciones nocturnas!</b>\n\n🔥 <b>${s.activePlayers} jugadores</b>\n\n👉 <a href="${REG_LINK}">Ver predicciones</a>`,
        (s) => `🎰 <b>¡Esta noche se gana!</b>\n\n⚡ <a href="${REG_LINK}">Acceso VIP</a>`,
        (s) => `⏰ <b>¡Última oportunidad!</b>\n\n🎯 <a href="${REG_LINK}">Quiero señales</a>`,
        (s) => `🔥 <b>¡Alerta VIP!</b>\n\n👉 <a href="${REG_LINK}">Desbloquear</a>`,
        (s) => `🚨 <b>¡Urgente — señales!</b>\n\n⚡ <a href="${REG_LINK}">Estoy listo</a>`
    ],
    az: [
        (s) => `🌙 <b>Axşam proqnozları!</b>\n\n🔥 <b>${s.activePlayers} oyunçu</b>\n\n👉 <a href="${REG_LINK}">Proqnozlar</a>`,
        (s) => `🎰 <b>Böyük qazanc!</b>\n\n⚡ <a href="${REG_LINK}">VIP giriş</a>`,
        (s) => `⏰ <b>Son şans!</b>\n\n🎯 <a href="${REG_LINK}">Siqnallar</a>`,
        (s) => `🔥 <b>VIP axşam!</b>\n\n👉 <a href="${REG_LINK}">Girişi açın</a>`,
        (s) => `🚨 <b>Təcili — axşam siqnalları!</b>\n\n⚡ <a href="${REG_LINK}">Hazıram</a>`
    ],
    tr: [
        (s) => `🌙 <b>Akşam tahminleri!</b>\n\n🔥 <b>${s.activePlayers} oyuncu</b>\n\n👉 <a href="${REG_LINK}">Tahminler</a>`,
        (s) => `🎰 <b>Büyük kazanma!</b>\n\n⚡ <a href="${REG_LINK}">VIP erişim</a>`,
        (s) => `⏰ <b>Son şans!</b>\n\n🎯 <a href="${REG_LINK}">Sinyaller</a>`,
        (s) => `🔥 <b>VIP akşam!</b>\n\n👉 <a href="${REG_LINK}">Erişimi aç</a>`,
        (s) => `🚨 <b>Acil — akşam sinyalleri!</b>\n\n⚡ <a href="${REG_LINK}">Hazırım</a>`
    ],
    ar: [
        (s) => `🌙 <b>توقعات المساء!</b>\n\n🔥 <b>${s.activePlayers} لاعب</b>\n\n👉 <a href="${REG_LINK}">التوقعات</a>`,
        (s) => `🎰 <b>الليلة للفوز!</b>\n\n⚡ <a href="${REG_LINK}">وصول VIP</a>`,
        (s) => `⏰ <b>فرصة أخيرة!</b>\n\n🎯 <a href="${REG_LINK}">الإشارات</a>`,
        (s) => `🔥 <b>تنبيه VIP!</b>\n\n👉 <a href="${REG_LINK}">فتح الوصول</a>`,
        (s) => `🚨 <b>عاجل — إشارات المساء!</b>\n\n⚡ <a href="${REG_LINK}">أنا جاهز</a>`
    ],
    ru: [
        (s) => `🌙 <b>Вечерние прогнозы!</b>\n\n🔥 <b>${s.activePlayers} игроков</b>\n\n👉 <a href="${REG_LINK}">Прогнозы</a>`,
        (s) => `🎰 <b>Крупный выигрыш!</b>\n\n⚡ <a href="${REG_LINK}">VIP-доступ</a>`,
        (s) => `⏰ <b>Последний шанс!</b>\n\n🎯 <a href="${REG_LINK}">Сигналы</a>`,
        (s) => `🔥 <b>VIP вечер!</b>\n\n👉 <a href="${REG_LINK}">Разблокировать</a>`,
        (s) => `🚨 <b>Срочно — вечерние сигналы!</b>\n\n⚡ <a href="${REG_LINK}">Я готов</a>`
    ],
    pt: [
        (s) => `🌙 <b>Previsões noturnas!</b>\n\n🔥 <b>${s.activePlayers} jogadores</b>\n\n👉 <a href="${REG_LINK}">Ver previsões</a>`,
        (s) => `🎰 <b>Hora de ganhar!</b>\n\n⚡ <a href="${REG_LINK}">Acesso VIP</a>`,
        (s) => `⏰ <b>Última chance!</b>\n\n🎯 <a href="${REG_LINK}">Quero sinais</a>`,
        (s) => `🔥 <b>Alerta VIP!</b>\n\n👉 <a href="${REG_LINK}">Desbloquear</a>`,
        (s) => `🚨 <b>Urgente — sinais!</b>\n\n⚡ <a href="${REG_LINK}">Estou pronto</a>`
    ]
};

// ═══════════════════════════════════════════════════════
// GAME STATS BROADCAST MESSAGES (5 templates × 10 langs)
// Target: NON-DEPOSITORS — motivates them to deposit and play
// Uses fake game statistics (total players, bets, winnings)
// ═══════════════════════════════════════════════════════
const GAME_STATS_MSG = {
    fr: [
        (s) => `📊 <b>Les joueurs gagnent gros sur DVYS !</b>\n\n👥 <b>${s.totalPlayers} joueurs</b> actifs\n💰 Mises totales: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Gains: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Commencer à gagner</a>`,
        (s) => `🎰 <b>Résultats incroyables !</b>\n\n<b>${s.totalPlayers} joueurs</b> ont misé <b>$${s.totalBets.toLocaleString()}</b> aujourd'hui.\n💰 Gains totaux: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Rejoindre les gagnants</a>`,
        (s) => `🚀 <b>Ça gagne sur DVYS !</b>\n\n📊 <b>${s.totalPlayers} joueurs</b> actifs\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> de gains distribués\n\nDéposez <b>${depStr('fr')}</b> et jouez !\n\n⚡ <a href="${REG_LINK}">Déposer maintenant</a>`,
        (s) => `🔥 <b>Alerte gains !</b>\n\n<b>${s.totalPlayers} joueurs</b> en profitent.\nMises: <b>$${s.totalBets.toLocaleString()}</b> | Gains: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Je veux gagner aussi</a>`,
        (s) => `💰 <b>Opportunité du jour !</b>\n\n<b>${s.totalPlayers} joueurs</b> misent et gagnent.\n🏆 Gains aujourd'hui: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Accéder aux prédictions</a>`
    ],
    en: [
        (s) => `📊 <b>Players are winning big on DVYS!</b>\n\n👥 <b>${s.totalPlayers} players</b> active\n💰 Total bets: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Winnings: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Start winning</a>`,
        (s) => `🎰 <b>Incredible results!</b>\n\n<b>${s.totalPlayers} players</b> wagered <b>$${s.totalBets.toLocaleString()}</b> today.\n💰 Total winnings: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Join the winners</a>`,
        (s) => `🚀 <b>Winning on DVYS!</b>\n\n📊 <b>${s.totalPlayers} players</b> active\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> in winnings distributed\n\nDeposit <b>${depStr('en')}</b> and play!\n\n⚡ <a href="${REG_LINK}">Deposit now</a>`,
        (s) => `🔥 <b>Winning alert!</b>\n\n<b>${s.totalPlayers} players</b> are profiting.\nBets: <b>$${s.totalBets.toLocaleString()}</b> | Winnings: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">I want to win too</a>`,
        (s) => `💰 <b>Today's opportunity!</b>\n\n<b>${s.totalPlayers} players</b> are betting and winning.\n🏆 Today's winnings: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Access predictions</a>`
    ],
    hi: [
        (s) => `📊 <b>DVYS पर खिलाड़ी कमा रहे!</b>\n\n👥 <b>${s.totalPlayers} खिलाड़ी</b> एक्टिव\n💰 कुल मिसाई: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 जीत: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">जीतना शुरू करें</a>`,
        (s) => `🎰 <b>शानदार परिणाम!</b>\n\n<b>${s.totalPlayers} खिलाड़ी</b> ने आज <b>$${s.totalBets.toLocaleString()}</b> लगाए\n💰 कुल जीत: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">जीतने वालों से जुड़ें</a>`,
        (s) => `🚀 <b>DVYS पर जीत!</b>\n\n📊 <b>${s.totalPlayers} खिलाड़ी</b> एक्टिव\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> जीत वितरित\n\n⚡ <a href="${REG_LINK}">अभी जमा करें</a>`,
        (s) => `🔥 <b>जीत अलर्ट!</b>\n\n<b>${s.totalPlayers} खिलाड़ी</b> कमा रहे\nमिसाई: <b>$${s.totalBets.toLocaleString()}</b> | जीत: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">मैं भी जीतना चाहता हूँ</a>`,
        (s) => `💰 <b>आज का मौका!</b>\n\n<b>${s.totalPlayers} खिलाड़ी</b> कमा रहे\n🏆 आज की जीत: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">भविष्यवाणियाँ</a>`
    ],
    uz: [
        (s) => `📊 <b>DVYS da yutyapti!</b>\n\n👥 <b>${s.totalPlayers} o'yinchi</b> faol\n💰 Umumiy stavkalar: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Yutuqlar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Yutishni boshlang</a>`,
        (s) => `🎰 <b>Ajoyib natijalar!</b>\n\n<b>${s.totalPlayers} o'yinchi</b> bugun <b>$${s.totalBets.toLocaleString()}</b> qo'ydi\n💰 Umumiy yutuq: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Qo'shiling</a>`,
        (s) => `🚀 <b>DVYS da yutish!</b>\n\n📊 <b>${s.totalPlayers} o'yinchi</b> faol\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> yutuq\n\n⚡ <a href="${REG_LINK}">Hozir to'ldiring</a>`,
        (s) => `🔥 <b>Yutuq ogohlantirishi!</b>\n\n<b>${s.totalPlayers} o'yinchi</b> yutyapti\nStavkalar: <b>$${s.totalBets.toLocaleString()}</b> | Yutuqlar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Men ham yutmoqchiman</a>`,
        (s) => `💰 <b>Bugungi imkoniyat!</b>\n\n<b>${s.totalPlayers} o'yinchi</b> yutyapti\n🏆 Bugungi yutuq: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Taxminlar</a>`
    ],
    es: [
        (s) => `📊 <b>¡Los jugadores ganan en DVYS!</b>\n\n👥 <b>${s.totalPlayers} jugadores</b> activos\n💰 Apuestas: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Ganancias: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Empezar a ganar</a>`,
        (s) => `🎰 <b>¡Resultados increíbles!</b>\n\n<b>${s.totalPlayers} jugadores</b> apostaron <b>$${s.totalBets.toLocaleString()}</b> hoy\n💰 Ganancias: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Unirse</a>`,
        (s) => `🚀 <b>¡Se gana en DVYS!</b>\n\n📊 <b>${s.totalPlayers} jugadores</b> activos\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> en ganancias\n\n⚡ <a href="${REG_LINK}">Depositar ahora</a>`,
        (s) => `🔥 <b>¡Alerta de ganancias!</b>\n\n<b>${s.totalPlayers} jugadores</b> ganan\nApuestas: <b>$${s.totalBets.toLocaleString()}</b> | Ganancias: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Quiero ganar</a>`,
        (s) => `💰 <b>¡Oportunidad de hoy!</b>\n\n<b>${s.totalPlayers} jugadores</b> ganan\n🏆 Ganancias hoy: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Predicciones</a>`
    ],
    az: [
        (s) => `📊 <b>DVYS da qazanırlar!</b>\n\n👥 <b>${s.totalPlayers} oyunçu</b> aktiv\n💰 Ümumi mərclər: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Qazanclar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Qazanmağa başlayın</a>`,
        (s) => `🎰 <b>İnanılmaz nəticələr!</b>\n\n<b>${s.totalPlayers} oyunçu</b> bugün <b>$${s.totalBets.toLocaleString()}</b> qoydu\n💰 Qazanc: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Qoşulun</a>`,
        (s) => `🚀 <b>DVYS da qazanma!</b>\n\n📊 <b>${s.totalPlayers} oyunçu</b> aktiv\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> qazanc\n\n⚡ <a href="${REG_LINK}">İndi daxil edin</a>`,
        (s) => `🔥 <b>Qazanc xəbərdarlığı!</b>\n\n<b>${s.totalPlayers} oyunçu</b> qazanır\nMərclər: <b>$${s.totalBets.toLocaleString()}</b> | Qazanclar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Mən də istəyirəm</a>`,
        (s) => `💰 <b>Bugünkü fürsət!</b>\n\n<b>${s.totalPlayers} oyunçu</b> qazanır\n🏆 Bugünkü qazanc: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Proqnozlar</a>`
    ],
    tr: [
        (s) => `📊 <b>DVYS'de kazananlar!</b>\n\n👥 <b>${s.totalPlayers} oyuncu</b> aktif\n💰 Toplam bahis: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Kazançlar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Kazanmaya başla</a>`,
        (s) => `🎰 <b>İnanılmaz sonuçlar!</b>\n\n<b>${s.totalPlayers} oyuncu</b> bugün <b>$${s.totalBets.toLocaleString()}</b> yatırdı\n💰 Kazanç: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Katıl</a>`,
        (s) => `🚀 <b>DVYS'de kazan!</b>\n\n📊 <b>${s.totalPlayers} oyuncu</b> aktif\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> kazanç\n\n⚡ <a href="${REG_LINK}">Şimdi yatır</a>`,
        (s) => `🔥 <b>Kazanç uyarısı!</b>\n\n<b>${s.totalPlayers} oyuncu</b> kazanıyor\nBahisler: <b>$${s.totalBets.toLocaleString()}</b> | Kazançlar: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Ben de kazanmak istiyorum</a>`,
        (s) => `💰 <b>Bugünün fırsatı!</b>\n\n<b>${s.totalPlayers} oyuncu</b> kazanıyor\n🏆 Bugünkü kazanç: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Tahminler</a>`
    ],
    ar: [
        (s) => `📊 <b>اللاعبون يربحون على DVYS!</b>\n\n👥 <b>${s.totalPlayers} لاعب</b> نشط\n💰 إجمالي الرهانات: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 الأرباح: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">ابدأ بالفوز</a>`,
        (s) => `🎰 <b>نتائج مذهلة!</b>\n\n<b>${s.totalPlayers} لاعب</b> راهنوا بـ <b>$${s.totalBets.toLocaleString()}</b> اليوم\n💰 الأرباح: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">انضم</a>`,
        (s) => `🚀 <b>اربح على DVYS!</b>\n\n📊 <b>${s.totalPlayers} لاعب</b> نشط\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> أرباح\n\n⚡ <a href="${REG_LINK}">أودع الآن</a>`,
        (s) => `🔥 <b>تنبيه أرباح!</b>\n\n<b>${s.totalPlayers} لاعب</b> يربحون\nالرهانات: <b>$${s.totalBets.toLocaleString()}</b> | الأرباح: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">أريد الفوز أيضاً</a>`,
        (s) => `💰 <b>فرصة اليوم!</b>\n\n<b>${s.totalPlayers} لاعب</b> يربحون\n🏆 أرباح اليوم: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">التوقعات</a>`
    ],
    ru: [
        (s) => `📊 <b>Игроки выигрывают на DVYS!</b>\n\n👥 <b>${s.totalPlayers} игроков</b> активны\n💰 Ставки: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Выигрыши: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Начать выигрывать</a>`,
        (s) => `🎰 <b>Невероятные результаты!</b>\n\n<b>${s.totalPlayers} игроков</b> поставили <b>$${s.totalBets.toLocaleString()}</b> сегодня\n💰 Выигрыши: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Присоединиться</a>`,
        (s) => `🚀 <b>Выигрывай на DVYS!</b>\n\n📊 <b>${s.totalPlayers} игроков</b> активны\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> выигрышей\n\n⚡ <a href="${REG_LINK}">Внести депозит</a>`,
        (s) => `🔥 <b>Алерт выигрышей!</b>\n\n<b>${s.totalPlayers} игроков</b> зарабатывают\nСтавки: <b>$${s.totalBets.toLocaleString()}</b> | Выигрыши: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Хочу тоже выиграть</a>`,
        (s) => `💰 <b>Возможность дня!</b>\n\n<b>${s.totalPlayers} игроков</b> выигрывают\n🏆 Сегодня: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Прогнозы</a>`
    ],
    pt: [
        (s) => `📊 <b>Jogadores ganham no DVYS!</b>\n\n👥 <b>${s.totalPlayers} jogadores</b> ativos\n💰 Apostas: <b>$${s.totalBets.toLocaleString()}</b>\n🏆 Ganhos: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🔥 <a href="${REG_LINK}">Começar a ganhar</a>`,
        (s) => `🎰 <b>Resultados incríveis!</b>\n\n<b>${s.totalPlayers} jogadores</b> apostaram <b>$${s.totalBets.toLocaleString()}</b> hoje\n💰 Ganhos: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Junte-se</a>`,
        (s) => `🚀 <b>Ganhe no DVYS!</b>\n\n📊 <b>${s.totalPlayers} jogadores</b> ativos\n💵 <b>$${s.totalWinnings.toLocaleString()}</b> em ganhos\n\n⚡ <a href="${REG_LINK}">Depositar agora</a>`,
        (s) => `🔥 <b>Alerta de ganhos!</b>\n\n<b>${s.totalPlayers} jogadores</b> lucrando\nApostas: <b>$${s.totalBets.toLocaleString()}</b> | Ganhos: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n🎯 <a href="${REG_LINK}">Eu quero ganhar</a>`,
        (s) => `💰 <b>Oportunidade do dia!</b>\n\n<b>${s.totalPlayers} jogadores</b> ganhando\n🏆 Ganhos hoje: <b>$${s.totalWinnings.toLocaleString()}</b>\n\n👉 <a href="${REG_LINK}">Previsões</a>`
    ]
};

// ═══════════════════════════════════════════════════════
// CRON HANDLERS
// ═══════════════════════════════════════════════════════

async function handleRelance() {
    const todayDeps = await query("SELECT COUNT(*) as c FROM users WHERE deposited_at >= CURRENT_DATE");
    const socialCount = Math.max(parseInt(todayDeps[0].c), 3);

    const users = await query(
        `SELECT telegram_id, first_name, language, relance_count, last_relance_at
         FROM users
         WHERE is_registered = TRUE AND is_deposited = FALSE AND is_active = TRUE
           AND (blocked_bot = FALSE OR blocked_bot IS NULL)
           AND (relance_count IS NULL OR relance_count < $1)
           AND (last_relance_at IS NULL OR last_relance_at < NOW() - INTERVAL '24 hours')
         ORDER BY created_at ASC LIMIT 200`,
        [MAX_RELANCE]
    );

    let sent = 0, failed = 0;
    for (const user of users) {
        const lang = user.language || 'fr';
        const name = user.first_name || 'Ami';
        const link = regLinkTid(user.telegram_id);
        const idx = (user.relance_count || 0) % 5;
        const templates = RELANCE_MSG[lang] || RELANCE_MSG.fr;
        const message = templates[idx](name, link, socialCount);

        const ok = await sendMessageAndTrack(user.telegram_id, message, user.telegram_id, 'relance', lang);
        if (ok) {
            sent++;
            await query('UPDATE users SET relance_count = COALESCE(relance_count, 0) + 1, last_relance_at = NOW(), updated_at = NOW() WHERE telegram_id = $1', [user.telegram_id]);
        } else { failed++; }
        await sleep(MSG_DELAY_MS);
    }

    await query('INSERT INTO cron_logs (cron_type, target_count, sent_count, failed_count, details) VALUES ($1, $2, $3, $4, $5)',
        ['relance', users.length, sent, failed, JSON.stringify({ socialCount })]);
    return { sent, failed, total: users.length, socialCount };
}

async function handleReferral() {
    let sent = 0, failed = 0;
    let initialCount = 0, reminderCount = 0, notifCount = 0;

    // Part 1: Send referral link to new deposited users (parrainage réservé aux VIP)
    const newActives = await query(
        `SELECT u.telegram_id, u.first_name, u.language FROM users u
         WHERE u.is_deposited = TRUE AND u.deposit_amount >= $1 AND u.is_active = TRUE AND (u.blocked_bot = FALSE OR u.blocked_bot IS NULL)
           AND NOT EXISTS (SELECT 1 FROM message_log ml WHERE ml.telegram_id = u.telegram_id AND ml.message_type = 'referral_initial')
         LIMIT 200`,
        [MIN_DEPOSIT]
    );
    initialCount = newActives.length;

    for (const user of newActives) {
        const lang = user.language || 'fr';
        const name = user.first_name || 'Ami';
        const link = referralLink(user.telegram_id);
        const templates = REF_MSG[lang] || REF_MSG.fr;
        const message = templates.initial(name, link);
        const ok = await sendMessageAndTrack(user.telegram_id, message, user.telegram_id, 'referral_initial', lang);
        if (ok) sent++; else failed++;
        await sleep(MSG_DELAY_MS);
    }

    // Part 2: Referral reminders every 7 days (parrainage réservé aux VIP)
    const reminderUsers = await query(
        `SELECT u.telegram_id, u.first_name, u.language,
                (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.telegram_id) as ref_count
         FROM users u
         WHERE u.is_deposited = TRUE AND u.deposit_amount >= $1 AND u.is_active = TRUE AND (u.blocked_bot = FALSE OR u.blocked_bot IS NULL)
           AND EXISTS (SELECT 1 FROM message_log ml WHERE ml.telegram_id = u.telegram_id AND ml.message_type = 'referral_initial')
           AND (u.last_referral_reminder_at IS NULL OR u.last_referral_reminder_at < NOW() - INTERVAL '7 days')
         LIMIT 100`,
        [MIN_DEPOSIT]
    );
    reminderCount = reminderUsers.length;

    for (const user of reminderUsers) {
        const lang = user.language || 'fr';
        const name = user.first_name || 'Ami';
        const link = referralLink(user.telegram_id);
        const refCount = parseInt(user.ref_count) || 0;
        const templates = REF_MSG[lang] || REF_MSG.fr;
        const message = templates.reminder(name, link, refCount);
        const ok = await sendMessageAndTrack(user.telegram_id, message, user.telegram_id, 'referral_reminder', lang);
        if (ok) {
            sent++;
            await query('UPDATE users SET last_referral_reminder_at = NOW() WHERE telegram_id = $1', [user.telegram_id]);
        } else { failed++; }
        await sleep(MSG_DELAY_MS);
    }

    // Part 3: Notify referrers of new referrals (ONLY deposited referrers — parrainage réservé aux VIP)
    const newRefs = await query(
        `SELECT r.referrer_id, r.referred_id, r.referred_username,
                u_ref.first_name as referrer_name, u_ref.language as referrer_lang,
                u_dep.first_name as referred_name, u_dep.is_deposited as ref_deposited
         FROM referrals r
         JOIN users u_ref ON u_ref.telegram_id = r.referrer_id
         JOIN users u_dep ON u_dep.telegram_id = r.referred_id
         WHERE NOT EXISTS (SELECT 1 FROM message_log ml WHERE ml.telegram_id = r.referrer_id AND ml.message_type LIKE 'ref_notify_%' AND ml.sent_at > r.created_at)
           AND u_ref.is_deposited = TRUE
           AND u_ref.deposit_amount >= $1
           AND u_ref.is_active = TRUE AND (u_ref.blocked_bot = FALSE OR u_ref.blocked_bot IS NULL)
         LIMIT 50`,
        [MIN_DEPOSIT]
    );
    notifCount = newRefs.length;

    for (const ref of newRefs) {
        const lang = ref.referrer_lang || 'fr';
        const name = ref.referrer_name || 'Ami';
        const rn = ref.referred_name || ref.referred_username || 'Un ami';
        const templates = REF_MSG[lang] || REF_MSG.fr;
        const msgType = ref.ref_deposited ? 'ref_notify_dep_' + ref.referred_id : 'ref_notify_reg_' + ref.referred_id;
        const message = ref.ref_deposited ? templates.ref_dep(name, rn) : templates.new_ref(name, rn);
        const ok = await sendMessageAndTrack(ref.referrer_id, message, ref.referrer_id, msgType, lang);
        if (ok) sent++; else failed++;
        await sleep(MSG_DELAY_MS);
    }

    await query('INSERT INTO cron_logs (cron_type, target_count, sent_count, failed_count, details) VALUES ($1, $2, $3, $4, $5)',
        ['referral', initialCount + reminderCount + notifCount, sent, failed,
         JSON.stringify({ initial: initialCount, reminders: reminderCount, notifications: notifCount })]);
    return { sent, failed, initial: initialCount, reminders: reminderCount, notifications: notifCount };
}

async function handleBroadcast(slot) {
    // ═══ PRIORITY: Use admin-managed stats from broadcast_stats table ═══
    // These are the stats manually updated from the admin panel
    let stats;
    try {
        const adminStats = await query('SELECT stat_key, stat_value FROM broadcast_stats');
        if (adminStats.length > 0) {
            const statsMap = {};
            for (const s of adminStats) { statsMap[s.stat_key] = s.stat_value; }
            stats = {
                depositedYesterday: Math.max(parseInt(statsMap.deposited_yesterday) || 3, 3),
                activePlayers: Math.max(parseInt(statsMap.active_players) || 5, 5),
                totalRevenue: parseFloat(statsMap.total_revenue || 0).toFixed(0)
            };
            console.log(`[BROADCAST] Using admin broadcast stats: ${JSON.stringify(stats)}`);
        } else {
            // Fallback to DB-computed stats if no admin stats exist
            const depositedYesterday = await query("SELECT COUNT(*) as c FROM users WHERE deposited_at >= CURRENT_DATE - INTERVAL '1 day' AND deposited_at < CURRENT_DATE");
            const activePlayers = await query("SELECT COUNT(*) as c FROM users WHERE updated_at >= CURRENT_DATE - INTERVAL '2 days'");
            const totalRevenue = await query("SELECT COALESCE(SUM(deposit_amount), 0) as t FROM users WHERE is_deposited = TRUE");
            stats = {
                depositedYesterday: Math.max(parseInt(depositedYesterday[0].c), 3),
                activePlayers: Math.max(parseInt(activePlayers[0].c), 5),
                totalRevenue: parseFloat(totalRevenue[0].t).toFixed(0)
            };
            console.log(`[BROADCAST] No admin stats, using DB fallback: ${JSON.stringify(stats)}`);
        }
    } catch (e) {
        // Fallback if broadcast_stats table doesn't exist yet
        const depositedYesterday = await query("SELECT COUNT(*) as c FROM users WHERE deposited_at >= CURRENT_DATE - INTERVAL '1 day' AND deposited_at < CURRENT_DATE");
        const activePlayers = await query("SELECT COUNT(*) as c FROM users WHERE updated_at >= CURRENT_DATE - INTERVAL '2 days'");
        const totalRevenue = await query("SELECT COALESCE(SUM(deposit_amount), 0) as t FROM users WHERE is_deposited = TRUE");
        stats = {
            depositedYesterday: Math.max(parseInt(depositedYesterday[0].c), 3),
            activePlayers: Math.max(parseInt(activePlayers[0].c), 5),
            totalRevenue: parseFloat(totalRevenue[0].t).toFixed(0)
        };
        console.log(`[BROADCAST] broadcast_stats table error, using DB fallback: ${JSON.stringify(stats)}`);
    }

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const templateIndex = dayOfYear % 5;

    const users = await query(
        `SELECT telegram_id, first_name, language FROM users
         WHERE is_deposited = TRUE AND is_active = TRUE AND (blocked_bot = FALSE OR blocked_bot IS NULL)
           AND (last_broadcast_at IS NULL OR last_broadcast_at < NOW() - INTERVAL '24 hours')
         LIMIT 500`
    );

    let sent = 0, failed = 0;
    const MSG_T = slot === 'morning' ? MORNING_MSG : EVENING_MSG;

    for (const user of users) {
        const lang = user.language || 'fr';
        const templates = MSG_T[lang] || MSG_T.fr;
        const message = templates[templateIndex](stats);
        const ok = await sendMessageAndTrack(user.telegram_id, message, user.telegram_id, `broadcast_${slot}`, lang);
        if (ok) {
            sent++;
            await query('UPDATE users SET last_broadcast_at = NOW() WHERE telegram_id = $1', [user.telegram_id]);
        } else { failed++; }
        await sleep(MSG_DELAY_MS);
    }

    await query('INSERT INTO cron_logs (cron_type, target_count, sent_count, failed_count, details) VALUES ($1, $2, $3, $4, $5)',
        [`broadcast_${slot}`, users.length, sent, failed, JSON.stringify({ slot, templateIndex, stats })]);
    return { sent, failed, total: users.length, slot, templateIndex, stats };
}

// ═══════════════════════════════════════════════════════
// GAME STATS BROADCAST — Targets NON-DEPOSITORS
// Uses daily_stats (fake game stats) instead of broadcast_stats (admin revenue)
// Sends motivational messages about game winnings to encourage deposits
// ═══════════════════════════════════════════════════════
async function handleGameStatsBroadcast() {
    // ═══ Get latest daily_stats (fake game statistics) ═══
    let stats;
    try {
        const latestStats = await query('SELECT * FROM daily_stats ORDER BY created_at DESC LIMIT 1');
        if (latestStats.length === 0) {
            console.log('[GAME_STATS_BROADCAST] No daily_stats found, skipping');
            return { sent: 0, failed: 0, total: 0, error: 'Aucune statistique disponible' };
        }
        const latest = latestStats[0];
        
        // ═══ 60-minute freshness check ═══
        const minutesSinceCreation = (Date.now() - new Date(latest.created_at).getTime()) / 60000;
        if (minutesSinceCreation > 1440) { // older than 24h
            console.log(`[GAME_STATS_BROADCAST] Stats too old (${Math.floor(minutesSinceCreation)} min), skipping`);
            return { sent: 0, failed: 0, total: 0, error: 'Stats trop anciennes (>24h)' };
        }
        
        stats = {
            totalPlayers: parseInt(latest.total_players) || 0,
            totalBets: parseFloat(latest.total_bets) || 0,
            totalWinnings: parseFloat(latest.total_winnings) || 0,
            statDate: latest.stat_date,
            statAge: Math.floor(minutesSinceCreation)
        };
        console.log(`[GAME_STATS_BROADCAST] Using daily_stats: ${JSON.stringify(stats)}`);
    } catch (e) {
        console.error('[GAME_STATS_BROADCAST] Error fetching daily_stats:', e.message);
        return { sent: 0, failed: 0, total: 0, error: e.message };
    }

    // ═══ Ensure minimums for credibility ═══
    stats.totalPlayers = Math.max(stats.totalPlayers, 5);
    stats.totalBets = Math.max(stats.totalBets, 500);
    stats.totalWinnings = Math.max(stats.totalWinnings, 1000);

    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const templateIndex = dayOfYear % 5;

    // ═══ Target NON-DEPOSITORS ═══
    const users = await query(
        `SELECT telegram_id, first_name, language FROM users
         WHERE (is_deposited = FALSE OR is_deposited IS NULL) AND is_active = TRUE AND (blocked_bot = FALSE OR blocked_bot IS NULL)
           AND (last_game_stats_at IS NULL OR last_game_stats_at < NOW() - INTERVAL '24 hours')
         LIMIT 500`
    );

    let sent = 0, failed = 0;

    for (const user of users) {
        const lang = user.language || 'fr';
        const templates = GAME_STATS_MSG[lang] || GAME_STATS_MSG.fr;
        const message = templates[templateIndex](stats);
        const ok = await sendMessageAndTrack(user.telegram_id, message, user.telegram_id, 'game_stats_broadcast', lang);
        if (ok) {
            sent++;
            await query('UPDATE users SET last_game_stats_at = NOW() WHERE telegram_id = $1', [user.telegram_id]);
        } else { failed++; }
        await sleep(MSG_DELAY_MS);
    }

    await query('INSERT INTO cron_logs (cron_type, target_count, sent_count, failed_count, details) VALUES ($1, $2, $3, $4, $5)',
        ['game_stats_broadcast', users.length, sent, failed, JSON.stringify({ templateIndex, stats })]);
    return { sent, failed, total: users.length, templateIndex, stats };
}

// ═══════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════
export default async function handler(req, res) {
    const authToken = (req.headers['authorization'] || '').replace('Bearer ', '') || req.query.secret || '';
    if (authToken !== CRON_SECRET) {
        return res.status(401).json({ error: 'Non autorise' });
    }

    try {
        const action = req.query.action || 'relance';

        switch (action) {
            case 'relance': {
                const result = await handleRelance();
                console.log(`[CRON RELANCE] Done: ${result.sent} sent, ${result.failed} failed`);
                return res.status(200).json({ success: true, action: 'relance', ...result });
            }
            case 'referral': {
                const result = await handleReferral();
                console.log(`[CRON REFERRAL] Done: ${result.sent} sent, ${result.failed} failed`);
                return res.status(200).json({ success: true, action: 'referral', ...result });
            }
            case 'broadcast-morning': {
                const result = await handleBroadcast('morning');
                console.log(`[CRON BROADCAST MORNING] Done: ${result.sent} sent, ${result.failed} failed`);
                return res.status(200).json({ success: true, action: 'broadcast-morning', ...result });
            }
            case 'broadcast-evening': {
                const result = await handleBroadcast('evening');
                console.log(`[CRON BROADCAST EVENING] Done: ${result.sent} sent, ${result.failed} failed`);
                return res.status(200).json({ success: true, action: 'broadcast-evening', ...result });
            }
            case 'broadcast-game-stats': {
                const result3 = await handleGameStatsBroadcast();
                console.log(`[CRON BROADCAST GAME STATS] Done: ${result3.sent} sent, ${result3.failed} failed`);
                return res.status(200).json({ success: true, action: 'broadcast-game-stats', ...result3 });
            }
            default:
                return res.status(400).json({ error: 'Action inconnue. Utilisez: relance, referral, broadcast-morning, broadcast-evening, broadcast-game-stats' });
        }
    } catch (error) {
        console.error('[CRON ERROR]', error);
        return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
};
