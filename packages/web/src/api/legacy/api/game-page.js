/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// ═══════════════════════════════════════════════════════
// DVYS - Game Page Server (serves HTML from DB)
// Injects a smart back-button fixer to preserve Telegram session
// ═══════════════════════════════════════════════════════
import { query } from '../lib/db.js';

// This script is injected into every dynamically-served game page.
// It intercepts all "back/return" buttons and replaces their action
// with window.history.back() to preserve the Telegram WebApp session.
const BACK_BUTTON_FIXER_SCRIPT = `
<script>
(function(){
  /* ===== DVYS BACK-BUTTON FIXER ===== */
  /* Intercepts all back/return buttons so they use history.back()
     instead of a direct URL navigation that breaks the Telegram session. */

  function fixBackButtons() {
    /* Strategy 1: Fix onclick attributes that navigate to /jeux/ or external URLs */
    var all = document.querySelectorAll('[onclick]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var oc = el.getAttribute('onclick') || '';
      var txt = (el.textContent || el.innerText || '').toLowerCase();

      /* Only target elements that look like a back/return button */
      var isBackBtn = /retour|back|return|←|arrow/.test(txt) ||
                      /btn-back|back-btn|go-back|goBack/.test(el.className);

      if (isBackBtn && oc) {
        /* Replace any window.location or href navigation with history.back() */
        if (/window\\.location|location\\.href|location\\.assign|location\\.replace/.test(oc)) {
          el.setAttribute('onclick', 'window.history.back()');
        }
      }
    }

    /* Strategy 2: Fix <a> tags that link to /jeux/ and look like back buttons */
    var links = document.querySelectorAll('a[href]');
    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      var href = (a.getAttribute('href') || '').toLowerCase();
      var aTxt = (a.textContent || a.innerText || '').toLowerCase();

      var isBackLink = /retour|back|return|←|arrow/.test(aTxt) ||
                       /btn-back|back-btn|go-back|goBack/.test(a.className);

      /* Target links pointing to /jeux/, the full domain, or index.html */
      if (isBackLink && (/\\/jeux\\//.test(href) || /index\\.html/.test(href) || /^https?:/.test(href))) {
        a.setAttribute('href', 'javascript:window.history.back()');
        a.addEventListener('click', function(e) {
          e.preventDefault();
          window.history.back();
        });
      }
    }

    /* Strategy 3: Fix elements added later via JS (covers dynamically rendered buttons) */
    /* Also handle buttons with id="backBtn" or similar */
    var backById = document.getElementById('backBtn') || document.getElementById('goBack');
    if (backById) {
      backById.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.history.back();
      };
    }
  }

  /* Run immediately */
  fixBackButtons();

  /* Run again after DOM is fully loaded (catches late-rendered buttons) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixBackButtons);
  } else {
    fixBackButtons();
  }

  /* Run again after a short delay (catches buttons rendered by setTimeout/requestAnimationFrame) */
  setTimeout(fixBackButtons, 500);
  setTimeout(fixBackButtons, 1500);

  /* Watch for dynamically added buttons via MutationObserver */
  var observer = new MutationObserver(function(mutations) {
    var found = false;
    for (var m = 0; m < mutations.length; m++) {
      var added = mutations[m].addedNodes;
      for (var n = 0; n < added.length; n++) {
        if (added[n].nodeType === 1) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) fixBackButtons();
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
})();
</script>
`;

export default async function handler(req, res) {
    // Only serve pages for existing active games
    const slug = (req.query.slug || '').replace(/[^a-zA-Z0-9\-_]/g, '');

    if (!slug) {
        return res.status(404).send('Game not found');
    }

    try {
        const games = await query(
            'SELECT game_html, name, is_active FROM games WHERE slug = $1',
            [slug]
        );

        if (games.length === 0) {
            return res.status(404).send('Game not found');
        }

        const game = games[0];

        if (!game.game_html) {
            return res.status(404).send('Game HTML not available');
        }

        let html = game.game_html;

        // Inject the back-button fixer script into the HTML
        // Insert right before </body> if it exists, otherwise append at end
        if (html.includes('</body>')) {
            html = html.replace('</body>', BACK_BUTTON_FIXER_SCRIPT + '\n</body>');
        } else if (html.includes('</html>')) {
            html = html.replace('</html>', BACK_BUTTON_FIXER_SCRIPT + '\n</html>');
        } else {
            html += BACK_BUTTON_FIXER_SCRIPT;
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).send(html);
    } catch (error) {
        console.error('[GAME PAGE ERROR]', error);
        res.status(500).send('Error loading game');
    }
};
