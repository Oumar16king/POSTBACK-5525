import type { Hono } from 'hono';
import admin from './legacy/api/admin.js';
import adminActions from './legacy/api/admin-actions.js';
import games from './legacy/api/games.js';
import claim from './legacy/api/claim.js';
import gamePage from './legacy/api/game-page.js';
import verify1win from './legacy/api/verify-1win.js';
import postbackDeposit from './legacy/api/postback-deposit.js';
import postbackRegister from './legacy/api/postback-register.js';
import postbackGaming from './legacy/api/postback-gaming.js';
import webhook from './legacy/api/webhook.js';
import cron from './legacy/api/cron.js';
import checkTables from './legacy/api/check-tables.js';
import * as runtime from './legacy/lib/runtime.js';

// Compatibility bridge for the user's existing Vercel project. The original
// handlers and HTTP contract are retained so the HTML pages remain unchanged.
// Static imports are essential: deployment bundles do not ship this source tree.

type LegacyRequest = {
  method: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
};

class LegacyResponse {
  code = 200;
  headers = new Headers();
  payload: BodyInit | null = null;

  status(code: number) { this.code = code; return this; }
  setHeader(name: string, value: string) { this.headers.set(name, value); return this; }
  json(value: unknown) {
    this.headers.set('Content-Type', 'application/json; charset=utf-8');
    this.payload = JSON.stringify(value);
    return this;
  }
  send(value: string) {
    if (!this.headers.has('Content-Type')) this.headers.set('Content-Type', 'text/plain; charset=utf-8');
    this.payload = value;
    return this;
  }
  end() { this.payload = null; return this; }
  toResponse() { return new Response(this.payload, { status: this.code, headers: this.headers }); }
}

const handlers = {
  admin,
  'admin-actions': adminActions,
  games,
  claim,
  'game-page': gamePage,
  'verify-1win': verify1win,
  'postback-deposit': postbackDeposit,
  'postback-register': postbackRegister,
  'postback-gaming': postbackGaming,
  webhook,
  cron,
  'check-tables': checkTables,
};

function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost && /^[a-zA-Z0-9.:-]+$/.test(forwardedHost)) {
    return `${forwardedProto === 'http' ? 'http' : 'https'}://${forwardedHost}`;
  }
  return url.origin;
}

export function mountLegacyRoutes(app: Hono) {
  for (const [endpoint, handler] of Object.entries(handlers)) {
    app.all(`/api/${endpoint}`, async (c) => {
      const request = c.req.raw;
      let body: unknown;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const text = await request.text();
        if (text) {
          if (request.headers.get('content-type')?.includes('application/json')) {
            try { body = JSON.parse(text); }
            catch { return c.json({ error: 'Invalid JSON' }, 400); }
          } else { body = text; }
        }
      }
      const legacyRequest: LegacyRequest = {
        method: request.method,
        query: Object.fromEntries(new URL(request.url).searchParams.entries()),
        headers: Object.fromEntries(request.headers.entries()),
        body,
      };
      const response = new LegacyResponse();
      try {
        await runtime.withRequestOrigin(requestOrigin(request), () => handler(legacyRequest, response));
        return response.toResponse();
      } catch (error) {
        console.error(`[DVYS ${endpoint}]`, error instanceof Error ? error.name : 'Handler error');
        return c.json({ error: 'Erreur serveur' }, 500);
      }
    });
  }
}