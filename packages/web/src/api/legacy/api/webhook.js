/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════════════════
// DVYS V2 - Webhook Telegram Bot (Multilingue 10 langues)
// Route : POST /api/webhook
// Un seul message a la fois - editMessageText
// ═══════════════════════════════════════════════════════════════════
import crypto from 'crypto';
import { query } from '../lib/db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const REG_LINK = process.env.REG_LINK || 'https://one-vv343.com/casino?p=ufjv';
import { getBaseUrl } from '../lib/runtime.js';
const MIN_DEPOSIT = parseFloat(process.env.MIN_DEPOSIT) || 15;
const PROMO = process.env.PROMO_CODE || 'DVYS';
const CHANNEL = process.env.CHANNEL || '@dvyswin';
const LINK_SECRET = process.env.ADMIN_PASSWORD || 'dyvsadmin2024';

// ─── LANGUES ───
const LANGS = {
    fr: { flag: '\uD83C\uDDEB\uD83C\uDDF7', rate: 666.67, symbol: 'FCFA', native: 'Francais' },
    en: { flag: '\uD83C\uDDEC\uD83C\uDDE7', rate: 1, symbol: '$', native: 'English' },
    hi: { flag: '\uD83C\uDDEE\uD83C\uDDF3', rate: 83.5, symbol: '\u20B9', native: 'Hindi' },
    uz: { flag: '\uD83C\uDDFA\uD83C\uDDFF', rate: 12650, symbol: "so'm", native: "O'zbek" },
    es: { flag: '\uD83C\uDDEA\uD83C\uDDF8', rate: 0.92, symbol: '\u20AC', native: 'Espanol' },
    az: { flag: '\uD83C\uDDE6\uD83C\uDDFF', rate: 1.7, symbol: '\u20BC', native: 'Az\u0259rbaycan' },
    tr: { flag: '\uD83C\uDDF9\uD83C\uDDF7', rate: 34, symbol: '\u20BA', native: 'Turkce' },
    ar: { flag: '\uD83C\uDDF8\uD83C\uDDE6', rate: 3.75, symbol: '\u0631.\u0633', native: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
    ru: { flag: '\uD83C\uDDF7\uD83C\uDDFA', rate: 91.5, symbol: '\u20BD', native: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
    pt: { flag: '\uD83C\uDDF5\uD83C\uDDF9', rate: 5.5, symbol: 'R$', native: 'Portugues' }
};

function depositStr(lang) {
    const l = LANGS[lang] || LANGS.fr;
    const local = Math.round(MIN_DEPOSIT * l.rate);
    if (lang === 'en') return `<b>$${MIN_DEPOSIT}</b>`;
    return `<b>${MIN_DEPOSIT}$ (${local} ${l.symbol})</b>`;
}

function depositStrPlain(lang) {
    const l = LANGS[lang] || LANGS.fr;
    const local = Math.round(MIN_DEPOSIT * l.rate);
    if (lang === 'en') return `$${MIN_DEPOSIT}`;
    return `${MIN_DEPOSIT}$ (${local} ${l.symbol})`;
}

// ─── TEXTES i18n ───
const T = {};
function t(key, lang) { return (T[lang] && T[lang][key]) || (T.fr && T.fr[key]) || key; }

T.fr = {
    select_language: `\uD83C\uDF10 Veuillez choisir votre langue\nPlease select your language`,
    channel_required: `Veuillez rejoindre notre canal pour continuer.`,
    welcome: `<b>\uD83C\uDFB0 Bienvenue sur DVYS</b>\n\nLe meilleur bot de predictions casino.\n\n<b>\u2776.</b> Inscrivez-vous avec le code promo <b>${PROMO}</b>\n<b>\u2777.</b> Rechargez minimum ${depositStr('fr')}\n<b>\u2778.</b> Accedez aux predictions VIP`,
    instructions: `<b>\u2753 Comment ca marche ?</b>\n\n<b>\u2776.</b> <b>Inscrivez-vous</b> sur 1Win avec le code promo <b>${PROMO}</b>\n<b>\u2777.</b> <b>Rechargez</b> minimum ${depositStr('fr')}\n<b>\u2778.</b> <b>Accedez</b> aux predictions en direct`,
    register: `<b>\uD83D\uDCDD Inscription</b>\n\nVeuillez d'abord vous inscrire en cliquant sur le lien ci-dessous.\n\nCode promo : <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Rechargement requis</b>\n\nVotre inscription est confirmee.\n\nEffectuez un depot minimum de ${depositStr('fr')} puis cliquez sur <b>Predictions</b>.`,
    deposit_small: `<b>Depot insuffisant</b>\n\nDepot detecte : <b>{amount}$</b>\nMinimum requis : ${depositStr('fr')}\n\nVeuillez completer votre depot.`,
    not_registered: `<b>Inscription non detectee</b>\n\nAssurez-vous d'utiliser le code promo <b>${PROMO}</b>.\n\nPatientez quelques minutes puis reessayez.`,
    access_granted: `<b>\u2B50 VIP Accorde !</b>\n\nCliquez ci-dessous pour acceder aux predictions :`,
    already_registered: `<b>\uD83D\uDC10 Verification ID</b>\n\nEnvoyez votre ID 1Win pour verification.\n\nAssurez-vous d'etre inscrit avec le code promo <b>${PROMO}</b>.`,
    already_registered_success: `<b>\u2705 Compte lie !</b>\n\nVotre ID 1Win est associe a votre Telegram.`,
    already_registered_already: `Cet ID est deja lie a un autre compte.`,
    already_registered_notfound: `<b>ID non trouve</b>\n\nInscrivez-vous d'abord avec le code promo <b>${PROMO}</b>.`,
    language_changed: `\u2705 Langue changee`,
    register_first: `Inscrivez-vous d'abord.`,
    btn_register: `S'inscrire`,
    btn_instructions: `Comment ca marche ?`,
    btn_already: `Deja inscrit`,
    btn_predictions: `\u26A1 Predictions`,
    btn_back: `\u2190 Retour`,
    btn_register_now: `S'inscrire maintenant`,
    btn_deposit: `Recharger`,
    btn_join: `Rejoindre le canal`,
    btn_language: `Langue`,
    btn_channel: `Verifier`,
    btn_change_language: `\uD83C\uDF10 Changer la langue`,
    deposit_insufficient_no: `<b>Depot requis</b>\n\nEffectuez un depot minimum de ${depositStr('fr')} pour acceder aux predictions.`,
    missing: `<b>Il vous manque <b>{remaining}$</b> ({local})</b>\n\nCompletez votre depot.`,
    channel_required_alert: `Rejoignez le canal d'abord.`
};

T.en = {
    select_language: `\uD83C\uDF10 Please select your language\nVeuillez choisir votre langue`,
    channel_required: `Please join our channel to continue.`,
    welcome: `<b>\uD83C\uDFB0 Welcome to DVYS</b>\n\nThe best casino prediction bot.\n\n<b>\u2776.</b> Register with promo code <b>${PROMO}</b>\n<b>\u2777.</b> Deposit minimum ${depositStr('en')}\n<b>\u2778.</b> Access VIP predictions`,
    instructions: `<b>\u2753 How does it work?</b>\n\n<b>\u2776.</b> <b>Register</b> on 1Win with promo code <b>${PROMO}</b>\n<b>\u2777.</b> <b>Deposit</b> minimum ${depositStr('en')}\n<b>\u2778.</b> <b>Access</b> live predictions`,
    register: `<b>\uD83D\uDCDD Registration</b>\n\nPlease register first by clicking the link below.\n\nPromo code: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Deposit required</b>\n\nYour registration is confirmed.\n\nMake a minimum deposit of ${depositStr('en')} then click <b>Predictions</b>.`,
    deposit_small: `<b>Insufficient deposit</b>\n\nDetected: <b>{amount}$</b>\nMinimum required: ${depositStr('en')}\n\nPlease complete your deposit.`,
    not_registered: `<b>Registration not detected</b>\n\nMake sure to use promo code <b>${PROMO}</b>.\n\nWait a few minutes then try again.`,
    access_granted: `<b>\u2B50 VIP Granted!</b>\n\nClick below to access predictions:`,
    already_registered: `<b>\uD83D\uDC10 ID Verification</b>\n\nSend your 1Win ID for verification.\n\nMake sure you registered with promo code <b>${PROMO}</b>.`,
    already_registered_success: `<b>\u2705 Account linked!</b>\n\nYour 1Win ID is now associated with your Telegram.`,
    already_registered_already: `This ID is already linked to another account.`,
    already_registered_notfound: `<b>ID not found</b>\n\nPlease register first with promo code <b>${PROMO}</b>.`,
    language_changed: `\u2705 Language changed`,
    register_first: `Register first.`,
    btn_register: `Register`,
    btn_instructions: `How does it work?`,
    btn_already: `Already registered`,
    btn_predictions: `\u26A1 Predictions`,
    btn_back: `\u2190 Back`,
    btn_register_now: `Register now`,
    btn_deposit: `Deposit`,
    btn_join: `Join channel`,
    btn_language: `Language`,
    btn_channel: `Verify`,
    btn_change_language: `\uD83C\uDF10 Change language`,
    deposit_insufficient_no: `<b>Deposit required</b>\n\nMake a minimum deposit of ${depositStr('en')} to access predictions.`,
    missing: `<b>You need <b>{remaining}$</b> more ({local})</b>\n\nComplete your deposit.`,
    channel_required_alert: `Join the channel first.`
};

T.hi = {
    select_language: `\uD83C\uDF10 \u0905\u092A\u0928\u0940 \u092D\u093E\u0937\u093E \u091A\u0941\u0928\u0947\u0902\nPlease select your language`,
    channel_required: `\u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0939\u092E\u093E\u0930\u0947 \u091A\u0948\u0928\u0932 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902\u0964`,
    welcome: `<b>\uD83C\uDFB0 DVYS \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948</b>\n\n\u0938\u092C\u0938\u0947 \u0905\u091A\u094D\u091B\u093E \u0915\u0948\u0938\u0940\u0928\u094B \u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928 \u092C\u0949\u091F\u0964\n\n<b>\u2776.</b> \u092A\u094D\u0930\u094B\u092E\u094B \u0915\u094B\u0921 <b>${PROMO}</b> \u0938\u0947 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902\n<b>\u2777.</b> \u0928\u094D\u092F\u0942\u0928\u0924\u092E ${depositStr('hi')} \u091C\u092E\u093E \u0915\u0930\u0947\u0902\n<b>\u2778.</b> VIP \u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928\u094D\u0938 \u090F\u0915\u094D\u0938\u0947\u0938 \u0915\u0930\u0947\u0902`,
    instructions: `<b>\u2753 \u092F\u0939 \u0915\u0948\u0938\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u093E \u0939\u0948?</b>\n\n<b>\u2776.</b> \u092A\u094D\u0930\u094B\u092E\u094B \u0915\u094B\u0921 <b>${PROMO}</b> \u0938\u0947 1Win \u092A\u0930 <b>\u0930\u091C\u093F\u0938\u094D\u091F\u0930</b> \u0915\u0930\u0947\u0902\n<b>\u2777.</b> \u0928\u094D\u092F\u0942\u0928\u0924\u092E ${depositStr('hi')} <b>\u091C\u092E\u093E</b> \u0915\u0930\u0947\u0902\n<b>\u2778.</b> \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928\u094D\u0938 <b>\u090F\u0915\u094D\u0938\u0947\u0938</b> \u0915\u0930\u0947\u0902`,
    register: `<b>\uD83D\uDCDD \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928</b>\n\n\u0928\u0940\u091A\u0947 \u0926\u093F\u090F \u0917\u090F \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0915\u0947 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902\u0964\n\n\u092A\u094D\u0930\u094B\u092E\u094B \u0915\u094B\u0921: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 \u091C\u092E\u093E \u0906\u0935\u0936\u094D\u092F\u0915</b>\n\n\u0906\u092A\u0915\u093E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092A\u0941\u0937\u094D\u091F\u093F \u0939\u094B \u0917\u0908\u0964\n\n${depositStr('hi')} \u0928\u094D\u092F\u0942\u0928\u0924\u092E \u091C\u092E\u093E \u0915\u0930\u0947\u0902 \u0924\u092C <b>\u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928\u094D\u0938</b> \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902\u0964`,
    deposit_small: `<b>\u0905\u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u091C\u092E\u093E</b>\n\n\u092A\u093E\u092F\u093E \u0917\u092F\u093E: <b>{amount}$</b>\n\u0906\u0935\u0936\u094D\u092F\u0915: ${depositStr('hi')}\n\n\u0915\u0943\u092A\u092F\u093E \u091C\u092E\u093E \u092A\u0942\u0930\u093E \u0915\u0930\u0947\u0902\u0964`,
    not_registered: `<b>\u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E</b>\n\n\u092A\u094D\u0930\u094B\u092E\u094B \u0915\u094B\u0921 <b>${PROMO}</b> \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964`,
    access_granted: `<b>\u2B50 VIP \u090F\u0915\u094D\u0938\u0947\u0938!</b>\n\n\u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928\u094D\u0938 \u090F\u0915\u094D\u0938\u0947\u0938 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0928\u0940\u091A\u0947 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902:`,
    already_registered: `<b>\uD83D\uDC10 ID \u0935\u0947\u0930\u093F\u092B\u093F\u0915\u0947\u0936\u0928</b>\n\n\u0935\u0947\u0930\u093F\u092B\u093F\u0915\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E 1Win ID \u092D\u0947\u091C\u0947\u0902\u0964`,
    already_registered_success: `<b>\u2705 \u0916\u093E\u0924\u093E \u091C\u094B\u0921\u093C\u093E \u0917\u092F\u093E!</b>`,
    already_registered_already: `\u092F\u0939 ID \u092A\u0939\u0932\u0947 \u0938\u0947 \u0932\u093F\u0902\u0915 \u0939\u0948\u0964`,
    already_registered_notfound: `<b>ID \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E</b>\n\n\u092A\u094D\u0930\u094B\u092E\u094B \u0915\u094B\u0921 <b>${PROMO}</b> \u0938\u0947 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902\u0964`,
    language_changed: `\u2705 \u092D\u093E\u0937\u093E \u092C\u0926\u0932\u0940 \u0917\u0908`,
    register_first: `\u092A\u0939\u0932\u0947 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902\u0964`,
    btn_register: `\u0930\u091C\u093F\u0938\u094D\u091F\u0930`,
    btn_instructions: `\u0915\u0948\u0938\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u093E \u0939\u0948?`,
    btn_already: `\u092A\u0939\u0932\u0947 \u0938\u0947 \u0930\u091C\u093F\u0938\u094D\u091F\u0930`,
    btn_predictions: `\u26A1 \u092A\u094D\u0930\u0947\u0921\u093F\u0915\u094D\u0936\u0928\u094D\u0938`,
    btn_back: `\u2190 \u0935\u093E\u092A\u0938`,
    btn_register_now: `\u0905\u092D\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902`,
    btn_deposit: `\u091C\u092E\u093E \u0915\u0930\u0947\u0902`,
    btn_join: `\u091A\u0948\u0928\u0932 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902`,
    btn_language: `\u092D\u093E\u0937\u093E`,
    btn_channel: `\u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930\u0947\u0902`,
    btn_change_language: `\uD83C\uDF10 \u092D\u093E\u0937\u093E \u092C\u0926\u0932\u0947\u0902`,
    deposit_insufficient_no: `<b>\u091C\u092E\u093E \u0906\u0935\u0936\u094D\u092F\u0915</b>\n\n${depositStr('hi')} \u0928\u094D\u092F\u0942\u0928\u0924\u092E \u091C\u092E\u093E \u0915\u0930\u0947\u0902\u0964`,
    missing: `<b>\u0906\u092A\u0915\u094B <b>{remaining}$</b> ({local}) \u0914\u0930 \u091A\u093E\u0939\u093F\u090F</b>`,
    channel_required_alert: `\u092A\u0939\u0932\u0947 \u091A\u0948\u0928\u0932 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902\u0964`
};

T.uz = {
    select_language: `\uD83C\uDF10 Tilni tanlang\nPlease select your language`,
    channel_required: `Davom etish uchun kanalimizga qo'shiling.`,
    welcome: `<b>\uD83C\uDFB0 DVYS ga xush kelibsiz</b>\n\nEng yaxshi casino taxmin boti.\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> bilan ro'yxatdan o'ting\n<b>\u2777.</b> Kamida ${depositStr('uz')} to'ldiring\n<b>\u2778.</b> VIP taxminlarga kiring`,
    instructions: `<b>\u2753 Qanday ishlaydi?</b>\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> bilan 1Win da <b>ro'yxatdan o'ting</b>\n<b>\u2777.</b> Kamida ${depositStr('uz')} <b>to'ldiring</b>\n<b>\u2778.</b> Jonli taxminlarga <b>kiring</b>`,
    register: `<b>\uD83D\uDCDD Ro'yxatdan o'tish</b>\n\nPastdagi havola orqali ro'yxatdan o'ting.\n\nPromo kod: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 To'ldirish kerak</b>\n\nRo'yxatingiz tasdiqlandi.\n\nKamida ${depositStr('uz')} to'ldiring, keyin <b>Taxminlar</b> tugmasini bosing.`,
    deposit_small: `<b>Yetarli emas</b>\n\n aniqlandi: <b>{amount}$</b>\nKerak: ${depositStr('uz')}`,
    not_registered: `<b>Ro'yxat topilmadi</b>\n\nPromo kod <b>${PROMO}</b> bilan ro'yxatdan o'ting.`,
    access_granted: `<b>\u2B50 VIP ruxsat!</b>\n\nTaxminlarga kirish uchun pastga bosing:`,
    already_registered: `<b>\uD83D\uDC10 ID tekshirish</b>\n\n1Win ID ingizni yuboring.\n\nPromo kod <b>${PROMO}</b> bilan ro'yxatdan o'tganingizga ishonch hosil qiling.`,
    already_registered_success: `<b>\u2705 Hisob bog'landi!</b>`,
    already_registered_already: `Bu ID boshqa hisobga bog'langan.`,
    already_registered_notfound: `<b>Topilmadi</b>\n\nPromo kod <b>${PROMO}</b> bilan ro'yxatdan o'ting.`,
    language_changed: `\u2705 Til o'zgartirildi`,
    register_first: `Avval ro'yxatdan o'ting.`,
    btn_register: `Ro'yxatdan o'tish`,
    btn_instructions: `Qanday ishlaydi?`,
    btn_already: `Avval ro'yxatdan`,
    btn_predictions: `\u26A1 Taxminlar`,
    btn_back: `\u2190 Orqaga`,
    btn_register_now: `Hozir ro'yxatdan o'ting`,
    btn_deposit: `To'ldiring`,
    btn_join: `Kanalga qo'shiling`,
    btn_language: `Til`,
    btn_channel: `Tekshirish`,
    btn_change_language: `\uD83C\uDF10 Tilni o'zgartirish`,
    deposit_insufficient_no: `<b>To'ldirish kerak</b>\n\n${depositStr('uz')} kamida to'ldiring.`,
    missing: `<b>Sizga yana <b>{remaining}$</b> ({local}) kerak</b>`,
    channel_required_alert: `Avval kanalga qo'shiling.`
};

T.es = {
    select_language: `\uD83C\uDF10 Seleccione su idioma\nPlease select your language`,
    channel_required: `Unase a nuestro canal para continuar.`,
    welcome: `<b>\uD83C\uDFB0 Bienvenido a DVYS</b>\n\nEl mejor bot de predicciones casino.\n\n<b>\u2776.</b> Registrese con el codigo <b>${PROMO}</b>\n<b>\u2777.</b> Deposite minimo ${depositStr('es')}\n<b>\u2778.</b> Acceda a predicciones VIP`,
    instructions: `<b>\u2753 Como funciona?</b>\n\n<b>\u2776.</b> <b>Registrese</b> en 1Win con codigo <b>${PROMO}</b>\n<b>\u2777.</b> <b>Deposite</b> minimo ${depositStr('es')}\n<b>\u2778.</b> <b>Acceda</b> a predicciones en vivo`,
    register: `<b>\uD83D\uDCDD Registro</b>\n\nRegistrese primero haciendo clic en el enlace.\n\nCodigo: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Deposito requerido</b>\n\nSu registro esta confirmado.\n\nDeposite minimo ${depositStr('es')} luego clic en <b>Predicciones</b>.`,
    deposit_small: `<b>Deposito insuficiente</b>\n\nDetectado: <b>{amount}$</b>\nRequerido: ${depositStr('es')}`,
    not_registered: `<b>Registro no detectado</b>\n\nUse codigo <b>${PROMO}</b>.`,
    access_granted: `<b>\u2B50 VIP Concedido!</b>\n\nClic abajo para predicciones:`,
    already_registered: `<b>\uD83D\uDC10 Verificacion ID</b>\n\nEnvie su ID 1Win para verificacion.`,
    already_registered_success: `<b>\u2705 Cuenta vinculada!</b>`,
    already_registered_already: `Este ID ya esta vinculado.`,
    already_registered_notfound: `<b>ID no encontrado</b>\n\nRegistrese con codigo <b>${PROMO}</b>.`,
    language_changed: `\u2705 Idioma cambiado`,
    register_first: `Registrese primero.`,
    btn_register: `Registrarse`,
    btn_instructions: `Como funciona?`,
    btn_already: `Ya registrado`,
    btn_predictions: `\u26A1 Predicciones`,
    btn_back: `\u2190 Volver`,
    btn_register_now: `Registrarse ahora`,
    btn_deposit: `Depositar`,
    btn_join: `Unirse al canal`,
    btn_language: `Idioma`,
    btn_channel: `Verificar`,
    btn_change_language: `\uD83C\uDF10 Cambiar idioma`,
    deposit_insufficient_no: `<b>Deposito requerido</b>\n\nDeposite minimo ${depositStr('es')}.`,
    missing: `<b>Le falta <b>{remaining}$</b> ({local})</b>`,
    channel_required_alert: `Unase al canal primero.`
};

T.az = {
    select_language: `\uD83C\uDF10 Dilinizi secin\nPlease select your language`,
    channel_required: `Davam etmak ucun kanalimiza qosulun.`,
    welcome: `<b>\uD83C\uDFB0 DVYS-a xos geldiniz</b>\n\n\u018Fn yaxsi casino proqnoz botu.\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> ila qeydiyyatdan kecin\n<b>\u2777.</b> Minimum ${depositStr('az')} daxil edin\n<b>\u2778.</b> VIP proqnozlara daxil olun`,
    instructions: `<b>\u2753 Nec\u0259 isleyir?</b>\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> ila 1Win-da <b>qeydiyyat</b>\n<b>\u2777.</b> Minimum ${depositStr('az')} <b>daxil edin</b>\n<b>\u2778.</b> Canli proqnozlara <b>daxil olun</b>`,
    register: `<b>\uD83D\uDCDD Qeydiyyat</b>\n\nLink vasit\u0259sil\u0259 qeydiyyatdan kecin.\n\nPromo kod: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Doldurma lazimdir</b>\n\nQeydiyyatiniz tesdiqlendi.\n\nMinimum ${depositStr('az')} daxil edin, sonra <b>Proqnozlar</b> basin.`,
    deposit_small: `<b>Kifayet qeder deyil</b>\n\nAşkar: <b>{amount}$</b>\nLazim: ${depositStr('az')}`,
    not_registered: `<b>Qeydiyyat tapilmadi</b>\n\nPromo kod <b>${PROMO}</b> istifade edin.`,
    access_granted: `<b>\u2B50 VIP Giris!</b>\n\nProqnozlara daxil olmaq ucun:`,
    already_registered: `<b>\uD83D\uDC10 ID yoxlama</b>\n\n1Win ID-nizi gonderin.`,
    already_registered_success: `<b>\u2705 Hesab baglandi!</b>`,
    already_registered_already: `Bu ID artiq baglanib.`,
    already_registered_notfound: `<b>Tapilmadi</b>\n\nPromo kod <b>${PROMO}</b> ila qeydiyyatdan kecin.`,
    language_changed: `\u2705 Dil deyisdirildi`,
    register_first: `Evvelce qeydiyyatdan kecin.`,
    btn_register: `Qeydiyyat`,
    btn_instructions: `Nec\u0259 isleyir?`,
    btn_already: `Artiq qeydiyyatda`,
    btn_predictions: `\u26A1 Proqnozlar`,
    btn_back: `\u2190 Geri`,
    btn_register_now: `Indi qeydiyyat`,
    btn_deposit: `Daxil edin`,
    btn_join: `Kanala qosulun`,
    btn_language: `Dil`,
    btn_channel: `Yoxlayin`,
    btn_change_language: `\uD83C\uDF10 Dili deyis`,
    deposit_insufficient_no: `<b>Doldurma lazimdir</b>\n\nMinimum ${depositStr('az')} daxil edin.`,
    missing: `<b>Siz\u0259 <b>{remaining}$</b> ({local}) lazimdir</b>`,
    channel_required_alert: `Evvelce kanala qosulun.`
};

T.tr = {
    select_language: `\uD83C\uDF10 Lutfen dilinizi secin\nPlease select your language`,
    channel_required: `Devam etmek icin kanalimiza katilin.`,
    welcome: `<b>\uD83C\uDFB0 DVYS'a hos geldiniz</b>\n\nEn iyi casino tahmin botu.\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> ile kayit olun\n<b>\u2777.</b> Minimum ${depositStr('tr')} yatirin\n<b>\u2778.</b> VIP tahminlere erisin`,
    instructions: `<b>\u2753 Nasil calisir?</b>\n\n<b>\u2776.</b> Promo kod <b>${PROMO}</b> ile 1Win'e <b>kayit olun</b>\n<b>\u2777.</b> Minimum ${depositStr('tr')} <b>yatirin</b>\n<b>\u2778.</b> Canli tahminlere <b>erisin</b>`,
    register: `<b>\uD83D\uDCDD Kayit</b>\n\nAsagidaki linkten kayit olun.\n\nPromo kod: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Yatirim gerekli</b>\n\nKayitiniz onaylandi.\n\nMinimum ${depositStr('tr')} yatirin, sonra <b>Tahminler</b> tiklayin.`,
    deposit_small: `<b>Yetersiz yatirim</b>\n\nTespit: <b>{amount}$</b>\nGerek: ${depositStr('tr')}`,
    not_registered: `<b>Kayit bulunamadi</b>\n\nPromo kod <b>${PROMO}</b> kullanin.`,
    access_granted: `<b>\u2B50 VIP Erisim!</b>\n\nTahminlere erismek icin:`,
    already_registered: `<b>\uD83D\uDC10 ID Dogrulama</b>\n\n1Win ID'nizi gonderin.`,
    already_registered_success: `<b>\u2705 Hesap baglandi!</b>`,
    already_registered_already: `Bu ID baska hesaba bagli.`,
    already_registered_notfound: `<b>ID bulunamadi</b>\n\nPromo kod <b>${PROMO}</b> ile kayit olun.`,
    language_changed: `\u2705 Dil degistirildi`,
    register_first: `Once kayit olun.`,
    btn_register: `Kayit ol`,
    btn_instructions: `Nasil calisir?`,
    btn_already: `Zaten kayitli`,
    btn_predictions: `\u26A1 Tahminler`,
    btn_back: `\u2190 Geri`,
    btn_register_now: `Simdi kayit ol`,
    btn_deposit: `Yatir`,
    btn_join: `Kanala katil`,
    btn_language: `Dil`,
    btn_channel: `Dogrula`,
    btn_change_language: `\uD83C\uDF10 Dili degistir`,
    deposit_insufficient_no: `<b>Yatirim gerekli</b>\n\nMinimum ${depositStr('tr')} yatirin.`,
    missing: `<b>Eksik: <b>{remaining}$</b> ({local})</b>`,
    channel_required_alert: `Once kanala katilin.`
};

T.ar = {
    select_language: `\uD83C\uDF10 \u0627\u062E\u062A\u0631 \u0644\u063A\u062A\u0643\nPlease select your language`,
    channel_required: `\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0642\u0646\u0627\u062A\u0646\u0627 \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629.`,
    welcome: `<b>\uD83C\uDFB0 \u0645\u0631\u062D\u0628\u0627 \u0628\u0643 \u0641\u064A DVYS</b>\n\n\u0623\u0641\u0636\u0644 \u0631\u0648\u0628\u0648\u062A \u062A\u0648\u0642\u0639\u0627\u062A \u0627\u0644\u0643\u0627\u0632\u064A\u0646\u0648.\n\n<b>\u2776.</b> \u0633\u062C\u0644 \u0628\u0631\u0645\u0632 <b>${PROMO}</b>\n<b>\u2777.</b> \u0623\u0648\u062F\u0639 ${depositStr('ar')} \u062D\u062F \u0623\u062F\u0646\u0649\n<b>\u2778.</b> \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u062A\u0648\u0642\u0639\u0627\u062A VIP`,
    instructions: `<b>\u2753 \u0643\u064A\u0641 \u064A\u0639\u0645\u0644\u061F</b>\n\n<b>\u2776.</b> <b>\u0633\u062C\u0644</b> \u0641\u064A 1Win \u0628\u0631\u0645\u0632 <b>${PROMO}</b>\n<b>\u2777.</b> <b>\u0623\u0648\u062F\u0639</b> ${depositStr('ar')} \u062D\u062F \u0623\u062F\u0646\u0649\n<b>\u2778.</b> <b>\u0627\u0644\u0648\u0635\u0648\u0644</b> \u0644\u0644\u062A\u0648\u0642\u0639\u0627\u062A`,
    register: `<b>\uD83D\uDCDD \u0627\u0644\u062A\u0633\u062C\u064A\u0644</b>\n\n\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u0628\u0637 \u0623\u062F\u0646\u0627\u0647.\n\n\u0627\u0644\u0631\u0645\u0632: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 \u0625\u064A\u062F\u0627\u0639 \u0645\u0637\u0644\u0648\u0628</b>\n\n\u062A\u0633\u062C\u064A\u0644\u0643 \u0645\u0624\u0643\u062F.\n\n\u0623\u0648\u062F\u0639 ${depositStr('ar')} \u062B\u0645 <u0627\u0636\u063A\u0637 <b>\u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A</b>.</u>`,
    deposit_small: `<b>\u0625\u064A\u062F\u0627\u0639 \u063A\u064A\u0631 \u0643\u0627\u0641</b>\n\n\u0645\u0643\u062A\u0634\u0641: <b>{amount}$</b>\n\u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${depositStr('ar')}`,
    not_registered: `<b>\u0644\u0645 \u064A\u062A\u0645 \u0627\u0643\u062A\u0634\u0627\u0641 \u0627\u0644\u062A\u0633\u062C\u064A\u0644</b>\n\n\u0627\u0633\u062A\u062E\u062F\u0645 \u0631\u0645\u0632 <b>${PROMO}</b>.`,
    access_granted: `<b>\u2B50 VIP \u0645\u0646\u062D!</b>\n\n\u0627\u0636\u063A\u0637 \u0623\u062F\u0646\u0627\u0647:`,
    already_registered: `<b>\uD83D\uDC10 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0639\u0631\u0641</b>\n\n\u0623\u0631\u0633\u0644 \u0645\u0639\u0631\u0641 1Win.`,
    already_registered_success: `<b>\u2705 \u062A\u0645 \u0627\u0644\u0631\u0628\u0637!</b>`,
    already_registered_already: `\u0647\u0630\u0627 \u0627\u0644\u0645\u0639\u0631\u0641 \u0645\u0631\u0628\u0648\u0637 \u0628\u0627\u0644\u0641\u0639\u0644.`,
    already_registered_notfound: `<b>\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F</b>\n\n\u0633\u062C\u0644 \u0628\u0631\u0645\u0632 <b>${PROMO}</b>.`,
    language_changed: `\u2705 \u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0644\u063A\u0629`,
    register_first: `\u0633\u062C\u0644 \u0623\u0648\u0644\u0627.`,
    btn_register: `\u062A\u0633\u062C\u064A\u0644`,
    btn_instructions: `\u0643\u064A\u0641 \u064A\u0639\u0645\u0644\u061F`,
    btn_already: `\u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627`,
    btn_predictions: `\u26A1 \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A`,
    btn_back: `\u2190 \u0631\u062C\u0648\u0639`,
    btn_register_now: `\u0633\u062C\u0644 \u0627\u0644\u0622\u0646`,
    btn_deposit: `\u0625\u064A\u062F\u0627\u0639`,
    btn_join: `\u0627\u0646\u0636\u0645 \u0644\u0644\u0642\u0646\u0627\u0629`,
    btn_language: `\u0627\u0644\u0644\u063A\u0629`,
    btn_channel: `\u062A\u062D\u0642\u0642`,
    btn_change_language: `\uD83C\uDF10 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0644\u063A\u0629`,
    deposit_insufficient_no: `<b>\u0625\u064A\u062F\u0627\u0639 \u0645\u0637\u0644\u0648\u0628</b>\n\n${depositStr('ar')} \u062D\u062F \u0623\u062F\u0646\u0649.`,
    missing: `<b>\u064A\u0646\u0642\u0635\u0643 <b>{remaining}$</b> ({local})</b>`,
    channel_required_alert: `\u0627\u0646\u0636\u0645 \u0644\u0644\u0642\u0646\u0627\u0629 \u0623\u0648\u0644\u0627.`
};

T.ru = {
    select_language: `\uD83C\uDF10 \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A\nPlease select your language`,
    channel_required: `\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u0435\u0441\u044C \u043A \u043D\u0430\u0448\u0435\u043C\u0443 \u043A\u0430\u043D\u0430\u043B\u0443.`,
    welcome: `<b>\uD83C\uDFB0 \u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 DVYS</b>\n\n\u041B\u0443\u0447\u0448\u0438\u0439 \u0431\u043E\u0442 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u043E\u0432 \u043A\u0430\u0437\u0438\u043D\u043E.\n\n<b>\u2776.</b> \u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0441 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u043E\u043C <b>${PROMO}</b>\n<b>\u2777.</b> \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043C\u0438\u043D\u0438\u043C\u0443\u043C ${depositStr('ru')}\n<b>\u2778.</b> \u0414\u043E\u0441\u0442\u0443\u043F \u043A VIP \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430\u043C`,
    instructions: `<b>\u2753 \u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442?</b>\n\n<b>\u2776.</b> <b>\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C</b> \u043D\u0430 1Win \u0441 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u043E\u043C <b>${PROMO}</b>\n<b>\u2777.</b> <b>\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435</b> \u043C\u0438\u043D\u0438\u043C\u0443\u043C ${depositStr('ru')}\n<b>\u2778.</b> <b>\u041F\u043E\u043B\u0443\u0447\u0438\u0442\u0435</b> \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430\u043C`,
    register: `<b>\uD83D\uDCDD \u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F</b>\n\n\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0438\u0436\u0435.\n\n\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 \u0414\u0435\u043F\u043E\u0437\u0438\u0442 \u043D\u0443\u0436\u0435\u043D</b>\n\n\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430.\n\n\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043C\u0438\u043D\u0438\u043C\u0443\u043C ${depositStr('ru')}, \u0437\u0430\u0442\u0435\u043C <b>\u041F\u0440\u043E\u0433\u043D\u043E\u0437\u044B</b>.`,
    deposit_small: `<b>\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E</b>\n\n\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u043E: <b>{amount}$</b>\n\u041C\u0438\u043D\u0438\u043C\u0443\u043C: ${depositStr('ru')}`,
    not_registered: `<b>\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430</b>\n\n\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434 <b>${PROMO}</b>.`,
    access_granted: `<b>\u2B50 VIP \u0414\u043E\u0441\u0442\u0443\u043F!</b>\n\n\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0438\u0436\u0435:`,
    already_registered: `<b>\uD83D\uDC10 \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 ID</b>\n\n\u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0432\u0430\u0448 1Win ID.`,
    already_registered_success: `<b>\u2705 \u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D!</b>`,
    already_registered_already: `\u042D\u0442\u043E\u0442 ID \u0443\u0436\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D.`,
    already_registered_notfound: `<b>ID \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D</b>\n\n\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C \u0441 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u043E\u043C <b>${PROMO}</b>.`,
    language_changed: `\u2705 \u042F\u0437\u044B\u043A \u0438\u0437\u043C\u0435\u043D\u0451\u043D`,
    register_first: `\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C.`,
    btn_register: `\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F`,
    btn_instructions: `\u041A\u0430\u043A \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442?`,
    btn_already: `\u0423\u0436\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D`,
    btn_predictions: `\u26A1 \u041F\u0440\u043E\u0433\u043D\u043E\u0437\u044B`,
    btn_back: `\u2190 \u041D\u0430\u0437\u0430\u0434`,
    btn_register_now: `\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F`,
    btn_deposit: `\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C`,
    btn_join: `\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F`,
    btn_language: `\u042F\u0437\u044B\u043A`,
    btn_channel: `\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C`,
    btn_change_language: `\uD83C\uDF10 \u0421\u043C\u0435\u043D\u0438\u0442\u044C \u044F\u0437\u044B\u043A`,
    deposit_insufficient_no: `<b>\u0414\u0435\u043F\u043E\u0437\u0438\u0442 \u043D\u0443\u0436\u0435\u043D</b>\n\n\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043C\u0438\u043D\u0438\u043C\u0443\u043C ${depositStr('ru')}.`,
    missing: `<b>\u0412\u0430\u043C \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 <b>{remaining}$</b> ({local})</b>`,
    channel_required_alert: `\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u0435\u0441\u044C \u043A \u043A\u0430\u043D\u0430\u043B\u0443.`
};

T.pt = {
    select_language: `\uD83C\uDF10 Selecione seu idioma\nPlease select your language`,
    channel_required: `Junte-se ao nosso canal para continuar.`,
    welcome: `<b>\uD83C\uDFB0 Bem-vindo ao DVYS</b>\n\nO melhor bot de previsoes casino.\n\n<b>\u2776.</b> Registre-se com o codigo <b>${PROMO}</b>\n<b>\u2777.</b> Deposite minimo ${depositStr('pt')}\n<b>\u2778.</b> Acesse previsoes VIP`,
    instructions: `<b>\u2753 Como funciona?</b>\n\n<b>\u2776.</b> <b>Registre-se</b> no 1Win com codigo <b>${PROMO}</b>\n<b>\u2777.</b> <b>Deposite</b> minimo ${depositStr('pt')}\n<b>\u2778.</b> <b>Acesse</b> previsoes ao vivo`,
    register: `<b>\uD83D\uDCDD Registro</b>\n\nClique no link abaixo para registrar.\n\nCodigo: <b>${PROMO}</b>`,
    deposit: `<b>\uD83D\uDCB0 Deposito necessario</b>\n\nRegistro confirmado.\n\nDeposite minimo ${depositStr('pt')} depois clique em <b>Previsoes</b>.`,
    deposit_small: `<b>Deposito insuficiente</b>\n\nDetectado: <b>{amount}$</b>\nRequerido: ${depositStr('pt')}`,
    not_registered: `<b>Registro nao detectado</b>\n\nUse codigo <b>${PROMO}</b>.`,
    access_granted: `<b>\u2B50 VIP Concedido!</b>\n\nClique abaixo:`,
    already_registered: `<b>\uD83D\uDC10 Verificacao ID</b>\n\nEnvie seu ID 1Win.`,
    already_registered_success: `<b>\u2705 Conta vinculada!</b>`,
    already_registered_already: `Este ID ja esta vinculado.`,
    already_registered_notfound: `<b>ID nao encontrado</b>\n\nRegistre com codigo <b>${PROMO}</b>.`,
    language_changed: `\u2705 Idioma alterado`,
    register_first: `Registre-se primeiro.`,
    btn_register: `Registrar`,
    btn_instructions: `Como funciona?`,
    btn_already: `Ja registrado`,
    btn_predictions: `\u26A1 Previsoes`,
    btn_back: `\u2190 Voltar`,
    btn_register_now: `Registrar agora`,
    btn_deposit: `Depositar`,
    btn_join: `Entrar no canal`,
    btn_language: `Idioma`,
    btn_channel: `Verificar`,
    btn_change_language: `\uD83C\uDF10 Mudar idioma`,
    deposit_insufficient_no: `<b>Deposito necessario</b>\n\nDeposite minimo ${depositStr('pt')}.`,
    missing: `<b>Faltam <b>{remaining}$</b> ({local})</b>`,
    channel_required_alert: `Entre no canal primeiro.`
};

// ═══════════════════════════════════════════════════════
// HELPERS - Un seul message a la fois
// ═══════════════════════════════════════════════════════

// ─── MEDIA MAPPING ───
function getMedia(mediaKey, lang) {
    const base = `${getBaseUrl()}/video`;
    if (!mediaKey) return null;
    if (mediaKey === 'vip') return { type: 'photo', url: `${base}/firstmsg.png` };
    if (mediaKey === 'instructions') return { type: 'photo', url: `${base}/comment_ca_marche.png` };
    if (mediaKey === 'register') return { type: 'video', url: lang === 'fr' ? `${base}/fr_inscription.mp4` : `${base}/other_inscription.mp4` };
    if (mediaKey === 'deposit') return { type: 'video', url: lang === 'fr' ? `${base}/fr_depot.mp4` : `${base}/other_depot.mp4` };
    if (mediaKey === 'default') return { type: 'photo', url: `${base}/defautmenu.png` };
    return null;
}

async function tgAPI(method, data) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        console.error('tgAPI error:', e);
        return { ok: false };
    }
}

async function deleteMsg(chatId, msgId) {
    if (!msgId) return;
    try { await tgAPI('deleteMessage', { chat_id: chatId, message_id: msgId }); } catch (e) {}
}

// Edit message in place (for callback queries) - UN SEUL MESSAGE
async function editMsg(chatId, msgId, text, btns) {
    try {
        const res = await tgAPI('editMessageText', {
            chat_id: chatId, message_id: msgId,
            text, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: btns }
        });
        if (res.ok) return res;
        console.log('[EDIT FAILED]', res.description);
    } catch (e) {
        console.log('[EDIT ERROR]', e.message);
    }
    // Fallback: delete and send new
    await deleteMsg(chatId, msgId);
    return await tgAPI('sendMessage', {
        chat_id: chatId, text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: btns }
    });
}

// Send new message (delete previous) - UN SEUL MESSAGE
// mediaKey: null | 'default' | 'vip' | 'instructions' | 'register' | 'deposit'
async function sendNew(chatId, userId, text, btns, mediaKey) {
    const user = userId ? await getUser(userId) : null;
    const lang = user ? (user.language || 'fr') : 'fr';
    if (user && user.last_message_id) {
        await deleteMsg(chatId, user.last_message_id);
    }
    const media = getMedia(mediaKey, lang);
    let res;
    if (media && media.type === 'photo') {
        res = await tgAPI('sendPhoto', {
            chat_id: chatId, photo: media.url,
            caption: text, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: btns }
        });
    } else if (media && media.type === 'video') {
        res = await tgAPI('sendVideo', {
            chat_id: chatId, video: media.url,
            caption: text, parse_mode: 'HTML',
            reply_markup: { inline_keyboard: btns }
        });
    } else {
        res = await tgAPI('sendMessage', {
            chat_id: chatId, text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: btns }
        });
    }
    if (res.ok && userId) {
        try {
            await query('UPDATE users SET last_message_id = $1, updated_at = NOW() WHERE telegram_id = $2',
                [res.result.message_id, userId]);
        } catch (e) {}
    }
    return res;
}

// ═══════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════

async function getUser(tid) {
    const r = await query('SELECT * FROM users WHERE telegram_id = $1', [tid]);
    return r[0] || null;
}

function hasValidDeposit(user) {
    return (parseFloat(user.deposit_amount) || 0) >= MIN_DEPOSIT;
}

async function createUser(tid, username, fn, ln, referredBy) {
    const r = await query(
        'INSERT INTO users (telegram_id, username, first_name, last_name, language, created_at, updated_at, referred_by) VALUES ($1, $2, $3, $4, \'fr\', NOW(), NOW(), $5) RETURNING *',
        [tid, username, fn, ln, referredBy || null]
    );
    return r[0] || null;
}

// Referral link: https://t.me/bot?start=ref123456789
function referralLink(tid) {
    return `https://t.me/${process.env.BOT_USERNAME || 'predvys_bot'}?start=ref${tid}`;
}

function generateToken(telegramId) {
    const exp = Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;
    const payload = `${telegramId}:${exp}`;
    const sig = crypto.createHmac('sha256', LINK_SECRET).update(payload).digest('hex').substring(0, 12);
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function regLink(tid) { return `${REG_LINK}&sub1=${tid}`; }
function depLink(tid) { return `${REG_LINK}&sub1=${tid}`; }

// ─── Sessions ───
async function ensureSessionsTable() {
    await query(`CREATE TABLE IF NOT EXISTS bot_sessions (
        bot_type TEXT NOT NULL,
        admin_id BIGINT NOT NULL,
        action TEXT,
        step INTEGER DEFAULT 0,
        temp_data TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (bot_type, admin_id)
    )`);
}
async function setTempState(tid, action) {
    await query(`INSERT INTO bot_sessions (bot_type, admin_id, action, step, temp_data, updated_at) VALUES ('main', $1, $2, 1, '{}', NOW()) ON CONFLICT (bot_type, admin_id) DO UPDATE SET action = $2, step = 1, temp_data = '{}', updated_at = NOW()`, [tid, action]);
}
async function getTempState(tid) {
    const r = await query("SELECT * FROM bot_sessions WHERE bot_type = 'main' AND admin_id = $1", [tid]);
    return r[0] || null;
}
async function clearTempState(tid) {
    await query("DELETE FROM bot_sessions WHERE bot_type = 'main' AND admin_id = $1", [tid]);
}

// ─── Channel verification ───
async function isChannelMember(userId) {
    try {
        const res = await tgAPI('getChatMember', { chat_id: CHANNEL, user_id: userId });
        if (res.ok && res.result) {
            return ['member', 'administrator', 'creator'].includes(res.result.status);
        }
        return false;
    } catch (e) {
        console.error('[CHANNEL CHECK ERROR]', e);
        return false;
    }
}

// ═══════════════════════════════════════════════════════
// BUTTON BUILDERS
// ═══════════════════════════════════════════════════════

function langButtons() {
    const keys = Object.keys(LANGS);
    const btns = [];
    for (let i = 0; i < keys.length; i += 2) {
        const row = [];
        row.push({ text: LANGS[keys[i]].flag + ' ' + LANGS[keys[i]].native, callback_data: 'lang_' + keys[i] });
        if (keys[i + 1]) {
            row.push({ text: LANGS[keys[i + 1]].flag + ' ' + LANGS[keys[i + 1]].native, callback_data: 'lang_' + keys[i + 1] });
        }
        btns.push(row);
    }
    return btns;
}

// Count referral only after channel verification - ONLY for depositor referrers (parrainage réservé aux VIP)
async function countReferralIfNeeded(userId) {
    try {
        const user = await getUser(userId);
        if (!user || !user.referred_by) return;
        const referrer = await getUser(user.referred_by);
        if (referrer && referrer.is_deposited && parseFloat(referrer.deposit_amount || 0) >= MIN_DEPOSIT) {
            const existingRef = await query('SELECT id FROM referrals WHERE referred_id = $1', [userId]);
            if (existingRef.length === 0) {
                await query('INSERT INTO referrals (referrer_id, referred_id, referred_username, created_at) VALUES ($1, $2, $3, NOW())',
                    [user.referred_by, userId, user.username || null]);
                console.log('[REFERRAL] User', userId, 'channel verified - referral from', user.referred_by, 'now counted (referrer is VIP)');
            }
        } else {
            console.log('[REFERRAL] User', userId, 'channel verified - referral from', user.referred_by, 'NOT counted (referrer is not VIP)');
        }
    } catch(e) { console.error('[REFERRAL COUNT ERROR]', e); }
}

function menuButtons(lang) {
    return [
        [{ text: t('btn_instructions', lang), callback_data: 'instructions' }],
        [{ text: t('btn_register', lang), callback_data: 'register' }, { text: t('btn_already', lang), callback_data: 'already_registered' }],
        [{ text: t('btn_change_language', lang), callback_data: 'change_language' }],
        [{ text: t('btn_predictions', lang), callback_data: 'predictions' }]
    ];
}

function backButton(lang) {
    return [{ text: t('btn_back', lang), callback_data: 'back' }];
}

function channelButtons(lang) {
    return [
        [{ text: t('btn_join', lang), url: `https://t.me/${CHANNEL.replace('@', '')}` }],
        [{ text: t('btn_channel', lang), callback_data: 'check_channel' }]
    ];
}

function vipButtons(userId, lang) {
    const token = generateToken(userId);
    const webAppUrl = `${getBaseUrl()}/api/claim?token=${token}`;
    return [
        [{ text: t('btn_predictions', lang), web_app: { url: webAppUrl } }],
        [{ text: t('btn_back', lang), callback_data: 'back' }]
    ];
}

// ═══════════════════════════════════════════════════════
// SHOW FUNCTIONS
// ═══════════════════════════════════════════════════════

async function showLanguageSelection(chatId, userId, msgId) {
    if (msgId) await deleteMsg(chatId, msgId);
    await sendNew(chatId, userId, t('select_language', 'fr'), langButtons());
}

async function showChannelRequired(chatId, userId, lang, msgId) {
    if (msgId) await deleteMsg(chatId, msgId);
    await sendNew(chatId, userId, t('channel_required', lang), channelButtons(lang));
}

async function showMainMenu(chatId, userId, lang, msgId) {
    if (msgId) await deleteMsg(chatId, msgId);
    await sendNew(chatId, userId, t('welcome', lang), menuButtons(lang), 'default');
}

async function sendVIPMessage(chatId, userId, lang, msgId) {
    if (msgId) await deleteMsg(chatId, msgId);
    await sendNew(chatId, userId, t('access_granted', lang), vipButtons(userId, lang), 'vip');
}

// ═══════════════════════════════════════════════════════
// HANDLE TEXT (1Win ID input)
// ═══════════════════════════════════════════════════════

async function handleText(chatId, from, text) {
    const session = await getTempState(from.id);
    if (session && session.action === 'already_registered') {
        const winId = text.trim();
        await clearTempState(from.id);
        const user = await getUser(from.id);
        const lang = user.language || 'fr';

        // Check if this 1Win ID exists in deposits/users
        const found = await query('SELECT * FROM users WHERE one_win_user_id = $1', [winId]);

        if (found.length === 0) {
            // ID not found in DB
            await sendNew(chatId, from.id, t('already_registered_notfound', lang),
                [[{ text: t('btn_register_now', lang), url: regLink(from.id) }], backButton(lang)], 'register');
            return;
        }

        const u = found[0];
        if (u.telegram_id && String(u.telegram_id) !== String(from.id)) {
            // Already linked to another Telegram
            await sendNew(chatId, from.id, t('already_registered_already', lang), [backButton(lang)], 'default');
            return;
        }

        // Merge: copy all data from the orphan row to the Telegram user's row
        const botUser = await getUser(from.id);
        await query(`UPDATE users SET one_win_user_id = $1, is_registered = TRUE, is_deposited = $2, deposit_amount = $3,
            registered_at = CASE WHEN registered_at IS NULL THEN $4 ELSE registered_at END,
            deposited_at = CASE WHEN $2 AND deposited_at IS NULL THEN $5 ELSE deposited_at END,
            referred_by = CASE WHEN referred_by IS NULL THEN $6 ELSE referred_by END,
            updated_at = NOW() WHERE telegram_id = $7`,
            [winId, !!u.is_deposited, u.deposit_amount || 0, u.registered_at, u.deposited_at,
             u.referred_by || (botUser ? botUser.referred_by : null), from.id]);

        // Delete the orphan row (the one with one_win_user_id but no telegram_id)
        if (!u.telegram_id) {
            await query('DELETE FROM users WHERE one_win_user_id = $1 AND telegram_id IS NULL', [winId]);
        }

        const updated = await getUser(from.id);

        if (updated.is_registered && hasValidDeposit(updated)) {
            // All good - VIP access
            await sendNew(chatId, from.id, t('already_registered_success', lang), vipButtons(from.id, lang), 'default');
        } else if (updated.is_registered) {
            // Registered but no deposit or insufficient
            const dep = parseFloat(updated.deposit_amount) || 0;
            if (dep > 0 && dep < MIN_DEPOSIT) {
                const remaining = (MIN_DEPOSIT - dep).toFixed(2);
                const l = LANGS[lang] || LANGS.fr;
                const local = Math.ceil(parseFloat(remaining) * l.rate);
                const msg = t('already_registered_success', lang) + '\n\n' +
                    t('deposit_small', lang).replace('{amount}', dep.toFixed(2)) + '\n\n' +
                    t('missing', lang).replace('{remaining}', remaining).replace('{local}', local + ' ' + l.symbol);
                await sendNew(chatId, from.id, msg,
                    [[{ text: t('btn_deposit', lang), url: depLink(from.id) }], backButton(lang)], 'deposit');
            } else {
                await sendNew(chatId, from.id, t('already_registered_success', lang) + '\n\n' + t('deposit', lang),
                    [[{ text: t('btn_deposit', lang), url: depLink(from.id) }], backButton(lang)], 'deposit');
            }
        } else {
            await sendNew(chatId, from.id, t('register', lang),
                [[{ text: t('btn_register_now', lang), url: regLink(from.id) }], backButton(lang)], 'register');
        }
    }
}

// ═══════════════════════════════════════════════════════
// MAIN UPDATE HANDLER
// ═══════════════════════════════════════════════════════

async function handleUpdate(update) {
    try {
        await ensureSessionsTable();

        // ─── /START ───
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const from = update.message.from;
            // Delete user's /start message to keep single message
            await deleteMsg(chatId, update.message.message_id);

            // Extract referral from /start ref123456789
            let referredBy = null;
            const startParts = update.message.text.split(' ');
            if (startParts[1] && startParts[1].startsWith('ref')) {
                const refId = parseInt(startParts[1].substring(3));
                if (refId && refId !== from.id) {
                    referredBy = refId;
                }
            }

            let user = await getUser(from.id);
            let isNewUser = false;
            if (!user) {
                user = await createUser(from.id, from.username, from.first_name, from.last_name, referredBy);
                isNewUser = true;
            }

            // Store referral info on user but DON'T count referral yet
            // referred_by is stored for ALL referrers, but the referral is only counted
            // (in referrals table) if the referrer is a depositor (VIP)
            if (isNewUser && referredBy) {
                const referrer = await getUser(referredBy);
                if (referrer) {
                    // Save referred_by on user record, will count after channel check (only if referrer is VIP)
                    await query('UPDATE users SET referred_by = $1 WHERE telegram_id = $2', [referredBy, from.id]);
                    console.log('[REFERRAL] User', from.id, 'started via referral from', referredBy, '- pending channel verification');
                }
            }

            // If user has a language set, check channel
            if (user.language) {
                const member = await isChannelMember(from.id);
                if (!member) {
                    await showChannelRequired(chatId, from.id, user.language, null);
                } else {
                    await countReferralIfNeeded(from.id);
                    if (user.is_registered && hasValidDeposit(user)) {
                        await sendNew(chatId, from.id, t('access_granted', user.language), vipButtons(from.id, user.language), 'vip');
                    } else {
                        await showMainMenu(chatId, from.id, user.language, null);
                    }
                }
            } else {
                // New user - show language selection FIRST
                await showLanguageSelection(chatId, from.id, null);
            }
            return;
        }

        // ─── TEXT INPUT (1Win ID) ───
        if (update.message && update.message.text && !update.message.text.startsWith('/start')) {
            // Delete user's text message to keep chat clean
            await deleteMsg(update.message.chat.id, update.message.message_id);
            return await handleText(update.message.chat.id, update.message.from, update.message.text);
        }

        // ─── CALLBACK QUERIES ───
        if (update.callback_query) {
            const q = update.callback_query;
            const chatId = q.message.chat.id;
            const userId = q.from.id;
            const data = q.data;
            const msgId = q.message.message_id;

            let user = await getUser(userId);
            if (!user) user = await createUser(userId, q.from.username, q.from.first_name, q.from.last_name);
            const lang = user.language || 'fr';

            // ─── LANGUAGE SELECTION ───
            if (data.startsWith('lang_')) {
                const newLang = data.replace('lang_', '');
                if (LANGS[newLang]) {
                    await query('UPDATE users SET language = $1, updated_at = NOW() WHERE telegram_id = $2', [newLang, userId]);
                    user.language = newLang;
                    await tgAPI('answerCallbackQuery', { callback_query_id: q.id, text: t('language_changed', newLang) });
                    const member = await isChannelMember(userId);
                    if (!member) {
                        await showChannelRequired(chatId, userId, newLang, msgId);
                    } else {
                        await countReferralIfNeeded(userId);
                        await showMainMenu(chatId, userId, newLang, msgId);
                    }
                }
                return;
            }

            // ─── CHECK CHANNEL ───
            if (data === 'check_channel') {
                const member = await isChannelMember(userId);
                if (member) {
                    await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                    await countReferralIfNeeded(userId);
                    if (user.is_registered && hasValidDeposit(user)) {
                        await sendVIPMessage(chatId, userId, lang, msgId);
                    } else {
                        await showMainMenu(chatId, userId, lang, msgId);
                    }
                } else {
                    await tgAPI('answerCallbackQuery', {
                        callback_query_id: q.id,
                        show_alert: true,
                        text: t('channel_required_alert', lang)
                    });
                }
                return;
            }

            // ─── CHANGE LANGUAGE ───
            if (data === 'change_language') {
                await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                await showLanguageSelection(chatId, userId, lang, msgId);
                return;
            }

            // ─── INSTRUCTIONS ───
            if (data === 'instructions') {
                await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                await deleteMsg(chatId, msgId);
                await sendNew(chatId, userId, t('instructions', lang), [backButton(lang)], 'instructions');
                return;
            }

            // ─── REGISTER ───
            if (data === 'register') {
                await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                await deleteMsg(chatId, msgId);
                await sendNew(chatId, userId, t('register', lang),
                    [[{ text: t('btn_register_now', lang), url: regLink(userId) }], [{ text: t('btn_back', lang), callback_data: 'back' }]], 'register');
                return;
            }

            // ─── ALREADY REGISTERED ───
            if (data === 'already_registered') {
                await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                await setTempState(userId, 'already_registered');
                await deleteMsg(chatId, msgId);
                await sendNew(chatId, userId, t('already_registered', lang), [backButton(lang)], 'default');
                return;
            }

            // ─── PREDICTIONS ───
            if (data === 'predictions') {
                if (!user.is_registered) {
                    await tgAPI('answerCallbackQuery', {
                        callback_query_id: q.id,
                        show_alert: true,
                        text: t('register_first', lang)
                    });
                } else if (!hasValidDeposit(user)) {
                    await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                    const dep = parseFloat(user.deposit_amount) || 0;
                    let msg;
                    if (dep > 0 && dep < MIN_DEPOSIT) {
                        const remaining = (MIN_DEPOSIT - dep).toFixed(2);
                        const l = LANGS[lang] || LANGS.fr;
                        const local = Math.round(parseFloat(remaining) * l.rate);
                        msg = t('deposit_small', lang).replace('{amount}', dep.toFixed(2)) + '\n\n'
                            + t('missing', lang).replace('{remaining}', remaining).replace('{local}', local + ' ' + l.symbol);
                    } else {
                        msg = t('deposit_insufficient_no', lang);
                    }
                    await deleteMsg(chatId, msgId);
                    await sendNew(chatId, userId, msg,
                        [[{ text: t('btn_deposit', lang), url: depLink(userId) }], backButton(lang)], 'deposit');
                } else {
                    await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                    await sendVIPMessage(chatId, userId, lang, msgId);
                }
                return;
            }

            // ─── BACK ───
            if (data === 'back') {
                await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
                await clearTempState(userId);
                // Refresh user data
                user = await getUser(userId);
                if (user.is_registered && hasValidDeposit(user)) {
                    await showMainMenu(chatId, userId, lang, msgId);
                } else {
                    await showMainMenu(chatId, userId, lang, msgId);
                }
                return;
            }

            await tgAPI('answerCallbackQuery', { callback_query_id: q.id });
        }
    } catch (error) {
        console.error('handleUpdate error:', error);
    }
}

// ═══════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════

export default async function handler(req, res) {
    if (req.method === 'GET') {
        // Auto-register webhook on GET request
        if (req.query.setup) {
            try {
                const webhookUrl = req.query.url ? `${req.query.url}/api/webhook` : `${getBaseUrl()}/api/webhook`;
                const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: webhookUrl })
                });
                const info = await r.json();
                return res.status(200).json({
                    status: 'Webhook registered',
                    url: webhookUrl,
                    token: BOT_TOKEN ? BOT_TOKEN.substring(0, 8) + '...' : 'MISSING',
                    telegram_response: info
                });
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }
        return res.status(200).send('DVYS V2 International est en ligne !');
    }
    if (req.method === 'POST') {
        try { await handleUpdate(req.body); return res.status(200).send('OK'); }
        catch (e) { console.error('Webhook error:', e); return res.status(500).send('Error'); }
    }
    res.status(405).send('Method not allowed');
};
