// Flera Biosystems checkout Worker.
//
//   GET  /catalog   -> { [variationId]: { item, variation, amount, currency } }
//   POST /checkout  -> { url, orderId }   body: { items: [{ variationId, quantity }] }
//   GET  /order-status?orderId=...  -> { paid }
//
// The Square access token never leaves this Worker. The browser only sends
// catalog variation IDs and quantities; prices always come from Square.

export interface Env {
  SQUARE_ACCESS_TOKEN: string; // secret: `wrangler secret put SQUARE_ACCESS_TOKEN`
  SQUARE_LOCATION_ID: string;
  SQUARE_ENV: string; // "sandbox" | "production"
  ALLOWED_ORIGINS: string; // comma-separated
  REDIRECT_URL: string;
}

const SQUARE_VERSION = '2026-11-18';
const CATALOG_TTL_SECONDS = 300;
const MAX_LINES = 20;
const MAX_QTY = 20;

interface CatalogEntry {
  item: string;
  variation: string;
  amount: number; // smallest currency unit (cents)
  currency: string;
  soldOut: boolean; // the item's "sold out" switch in Square; stock counts are not read
}
type Catalog = Record<string, CatalogEntry>;

function squareBase(env: Env): string {
  return env.SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

async function square(env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(squareBase(env) + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    },
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Square error', res.status, path, JSON.stringify(body?.errors ?? body));
    throw new Error(`Square ${res.status}`);
  }
  return body;
}

async function fetchCatalog(env: Env): Promise<Catalog> {
  const out: Catalog = {};
  const loc = env.SQUARE_LOCATION_ID;
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: 'ITEM' });
    if (cursor) qs.set('cursor', cursor);
    const page = await square(env, `/v2/catalog/list?${qs}`);
    for (const obj of page.objects ?? []) {
      if (obj.type !== 'ITEM' || obj.is_deleted || obj.item_data?.is_archived) continue;
      if (!availableAt(obj, loc)) continue;
      for (const v of obj.item_data?.variations ?? []) {
        const money = v.item_variation_data?.price_money;
        if (v.is_deleted || !money || typeof money.amount !== 'number') continue;
        if (!availableAt(v, loc)) continue;
        const override = (v.item_variation_data?.location_overrides ?? []).find(
          (o: any) => o.location_id === loc,
        );
        out[v.id] = {
          item: obj.item_data?.name ?? '',
          variation: v.item_variation_data?.name ?? '',
          amount: money.amount,
          currency: money.currency ?? 'USD',
          soldOut: override?.sold_out === true,
        };
      }
    }
    cursor = page.cursor;
  } while (cursor);

  return out;
}

/** Whether a catalog object is sold at the given location. */
function availableAt(obj: any, loc: string): boolean {
  if ((obj.absent_at_location_ids ?? []).includes(loc)) return false;
  if (obj.present_at_all_locations === false) {
    return (obj.present_at_location_ids ?? []).includes(loc);
  }
  return true;
}

async function getCatalog(env: Env, ctx: ExecutionContext): Promise<Catalog> {
  const cache = caches.default;
  const key = new Request(`https://catalog.internal/${env.SQUARE_ENV}/v3`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const catalog = await fetchCatalog(env);
  ctx.waitUntil(
    cache.put(
      key,
      new Response(JSON.stringify(catalog), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CATALOG_TTL_SECONDS}`,
        },
      }),
    ),
  );
  return catalog;
}

function allowedOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin');
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function json(data: unknown, status: number, origin: string | null, extra: Record<string, string> = {}): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Vary: 'Origin', ...extra };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

async function handleCheckout(req: Request, env: Env, ctx: ExecutionContext, origin: string | null): Promise<Response> {
  if (!origin) return json({ error: 'Origin not allowed' }, 403, null);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin);
  }
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return json({ error: 'Cart is empty or too large' }, 400, origin);
  }

  const catalog = await getCatalog(env, ctx);
  const quantities = new Map<string, number>();
  for (const it of items) {
    const id = it?.variationId;
    const qty = it?.quantity;
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(catalog, id)) {
      return json({ error: 'Unknown item in cart', variationId: id ?? null }, 400, origin);
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return json({ error: 'Invalid quantity', variationId: id }, 400, origin);
    }
    const total = (quantities.get(id) ?? 0) + qty;
    if (total > MAX_QTY) return json({ error: 'Invalid quantity', variationId: id }, 400, origin);
    quantities.set(id, total);
  }
  for (const id of quantities.keys()) {
    const entry = catalog[id];
    if (entry.soldOut) return json({ error: 'Sold out', variationId: id }, 409, origin);
  }

  const result = await square(env, '/v2/online-checkout/payment-links', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items: [...quantities].map(([id, qty]) => ({
          catalog_object_id: id,
          quantity: String(qty),
        })),
        pricing_options: { auto_apply_taxes: true },
      },
      checkout_options: {
        redirect_url: env.REDIRECT_URL,
        ask_for_shipping_address: true,
      },
    }),
  });

  const url = result?.payment_link?.long_url ?? result?.payment_link?.url;
  if (!url) {
    console.error('No URL in Square response', JSON.stringify(result));
    return json({ error: 'Checkout unavailable' }, 502, origin);
  }
  return json({ url, orderId: result?.payment_link?.order_id ?? null }, 200, origin);
}

// Square creates the order as DRAFT and moves it to OPEN once the buyer pays.
async function handleOrderStatus(url: URL, env: Env, origin: string | null): Promise<Response> {
  const orderId = url.searchParams.get('orderId') ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) return json({ error: 'Invalid order' }, 400, origin);
  let state: string | undefined;
  try {
    const result = await square(env, `/v2/orders/${orderId}`);
    state = result?.order?.state;
  } catch {
    return json({ paid: false }, 200, origin, { 'Cache-Control': 'no-store' });
  }
  return json({ paid: state === 'OPEN' || state === 'COMPLETED' }, 200, origin, { 'Cache-Control': 'no-store' });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = allowedOrigin(req, env);

    if (req.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    try {
      if (req.method === 'GET' && url.pathname === '/catalog') {
        const catalog = await getCatalog(env, ctx);
        return json(catalog, 200, origin, { 'Cache-Control': 'public, max-age=60' });
      }
      if (req.method === 'GET' && url.pathname === '/order-status') {
        return await handleOrderStatus(url, env, origin);
      }
      if (req.method === 'POST' && url.pathname === '/checkout') {
        return await handleCheckout(req, env, ctx, origin);
      }
      return json({ error: 'Not found' }, 404, origin);
    } catch (err) {
      console.error(err);
      return json({ error: 'Upstream error' }, 502, origin);
    }
  },
};
