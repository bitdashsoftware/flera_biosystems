// Browser cart, persisted in localStorage. Lines are keyed by Square catalog
// variation ID, which is the only thing (plus quantity) sent to the checkout
// Worker. `price` is the build-time fallback; live prices come from prices.ts.

export interface CartItem {
  variationId: string;
  title: string;
  variant?: string;
  thumb?: string;
  href?: string;
  price: number; // dollars, fallback only
  qty: number;
}

const KEY = 'flera_cart';
const EVENT = 'cart:change';
export const MAX_QTY = 20;

function clamp(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.floor(qty)));
}

export function getCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((i) => i && typeof i.variationId === 'string' && i.variationId && i.qty > 0);
  } catch {
    return [];
  }
}

function save(items: CartItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable (private mode etc.): cart just won't persist
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1): void {
  const items = getCart();
  const existing = items.find((i) => i.variationId === item.variationId);
  if (existing) {
    existing.qty = clamp(existing.qty + qty);
  } else {
    items.push({ ...item, qty: clamp(qty) });
  }
  save(items);
}

export function setQty(variationId: string, qty: number): void {
  save(getCart().map((i) => (i.variationId === variationId ? { ...i, qty: clamp(qty) } : i)));
}

export function removeFromCart(variationId: string): void {
  save(getCart().filter((i) => i.variationId !== variationId));
}

export function clearCart(): void {
  save([]);
}

export function cartCount(): number {
  return getCart().reduce((n, i) => n + i.qty, 0);
}

// The order a buyer was last sent to Square to pay for. The confirmation page
// uses it to check with Square that payment actually went through.
const PENDING_KEY = 'flera_pending_order';
const PENDING_MS = 24 * 60 * 60 * 1000;

export function setPendingOrder(orderId: string): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ orderId, at: Date.now() }));
  } catch {
    // ignore
  }
}

export function getPendingOrder(): string | null {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null');
    if (p && typeof p.orderId === 'string' && Date.now() - p.at < PENDING_MS) return p.orderId;
  } catch {
    // ignore
  }
  return null;
}

export function clearPendingOrder(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

/** Subscribe to cart changes (this tab and other tabs). Returns an unsubscribe. */
export function onCartChange(fn: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) fn();
  };
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', onStorage);
  };
}
