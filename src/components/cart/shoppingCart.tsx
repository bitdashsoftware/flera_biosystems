import { useEffect, useState } from 'react';
import { getCart, setQty, removeFromCart, onCartChange, setPendingOrder, MAX_QTY, type CartItem } from '../../lib/cart';
import { API_BASE, loadPrices, priceOf, isSoldOut, formatPrice, type PriceMap } from '../../lib/prices';

export default function ShoppingCart() {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : import.meta.env.BASE_URL + '/';

  // `null` until the browser has read localStorage, so the server-rendered
  // HTML and the first client render match.
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [prices, setPrices] = useState<PriceMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(getCart());
    loadPrices().then(setPrices);
    return onCartChange(() => setItems(getCart()));
  }, []);

  // Coming back from Square with the browser's Back button restores this page
  // from cache with the button still disabled; re-enable it.
  useEffect(() => {
    const reset = () => setBusy(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const unit = (i: CartItem) => priceOf(prices, i.variationId, i.price);
  const subtotal = (items ?? []).reduce((sum, i) => sum + unit(i) * i.qty, 0);

  const checkout = async () => {
    if (!items || items.length === 0) return;
    setBusy(true);
    setError('');
    try {
      if (!API_BASE) throw new Error('not configured');
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ variationId: i.variationId, quantity: i.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.variationId) {
        const bad = items.find((i) => i.variationId === data.variationId);
        const name = bad ? bad.title + (bad.variant ? ` (${bad.variant})` : '') : 'An item';
        setError(`"${name}" has sold out. Please remove it from your cart and try again.`);
        try { sessionStorage.removeItem('flera_prices'); } catch { /* ignore */ }
        setBusy(false);
        return;
      }
      if (res.status === 400 && data.variationId) {
        const bad = items.find((i) => i.variationId === data.variationId);
        setError(
          `"${bad ? bad.title : 'An item'}" is no longer available in that form. Please remove it from your cart and try again.`,
        );
        setBusy(false);
        return;
      }
      if (!res.ok || !data.url) throw new Error('checkout failed');
      if (data.orderId) setPendingOrder(data.orderId);
      window.location.assign(data.url);
    } catch {
      setError('Sorry, we could not start checkout. Please try again in a moment.');
      setBusy(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-3 text-center">Shopping Cart</h2>

      {items === null && <p className="text-center my-5">Loading your cart…</p>}

      {items !== null && items.length === 0 && (
        <div className="text-center my-5">
          <p>Your cart is empty.</p>
          <a href={baseUrl} className="btn btn-dark btn-lg">Continue Shopping</a>
        </div>
      )}

      {items !== null && items.length > 0 && (
        <>
          <h5 className="text-center mb-5">Free shipping on every order.</h5>
          <div className="row">
            <div className="col-12 col-lg-7">
              {items.map((item, i) => (
                <div key={item.variationId}>
                  {i !== 0 && <hr className="horizontal dark my-4" />}
                  <div className="d-flex align-items-start">
                    {item.thumb && (
                      <a href={item.href ?? baseUrl} className="flex-shrink-0">
                        <img
                          className="rounded-3"
                          style={{ width: '96px', height: '96px', objectFit: 'contain' }}
                          src={item.thumb}
                          alt={item.title}
                        />
                      </a>
                    )}
                    <div className="flex-grow-1 ps-3">
                      <h6 className="text-lg mb-1">
                        <a href={item.href ?? baseUrl} className="text-dark">{item.title}</a>
                      </h6>
                      {item.variant && <p className="mb-1 text-sm">{item.variant}</p>}
                      <p className="mb-2 text-sm">{formatPrice(unit(item))} each</p>
                      {isSoldOut(prices, item.variationId) && (
                        <p className="mb-2 text-sm text-danger">Sold out. Please remove this item.</p>
                      )}
                      <div className="d-flex align-items-center">
                        <label htmlFor={`qty-${item.variationId}`} className="visually-hidden">
                          Quantity for {item.title}
                        </label>
                        <input
                          id={`qty-${item.variationId}`}
                          type="number"
                          min={1}
                          max={MAX_QTY}
                          className="form-control"
                          style={{ width: '80px' }}
                          value={item.qty}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            if (!Number.isNaN(n)) setQty(item.variationId, n);
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-link text-body mb-0 ms-2 px-2"
                          onClick={() => removeFromCart(item.variationId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <h5 className="ms-3 mb-0 text-nowrap">{formatPrice(unit(item) * item.qty)}</h5>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-12 col-lg-5 mt-5 mt-lg-0">
              <div className="card shadow-xs border bg-gray-100">
                <div className="card-body p-lg-5">
                  <h5 className="mb-4">Order Summary</h5>
                  <ul className="list-unstyled">
                    <li className="d-flex justify-content-between mt-2">
                      <p className="opacity-8">Subtotal</p>
                      <p className="fw-bold opacity-8">{formatPrice(subtotal)}</p>
                    </li>
                    <li className="d-flex justify-content-between mt-2">
                      <p className="opacity-8">Shipping</p>
                      <p className="fw-bold opacity-8">Free</p>
                    </li>
                    <li className="d-flex justify-content-between border-bottom mt-2">
                      <p className="opacity-8">Tax</p>
                      <p className="fw-bold opacity-8">Calculated at checkout</p>
                    </li>
                  </ul>
                  {error && <div className="alert alert-danger text-white text-sm" role="alert">{error}</div>}
                  <button type="button" className="btn btn-dark btn-lg w-100" onClick={checkout} disabled={busy}>
                    {busy ? 'Starting checkout…' : 'Checkout'}
                  </button>
                  <a href={baseUrl} className="btn btn-white btn-lg w-100">Continue Shopping</a>
                  <p className="text-center text-sm mb-0">
                    <i className="bi bi-lock me-1"></i>
                    Payment is completed securely on Square.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
