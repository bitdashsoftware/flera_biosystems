import { useEffect, useState } from 'react';
import { addToCart, MAX_QTY } from '../../lib/cart';
import { loadPrices, priceOf, isSoldOut, formatPrice, type PriceMap } from '../../lib/prices';

export interface Variant {
  label: string;
  square_variation_id: string;
}

interface Props {
  title: string;
  price: number; // build-time fallback, dollars
  thumb?: string;
  href?: string;
  square_variation_id?: string;
  variants?: Variant[];
}

/** Price + (optional) version selector + quantity + Add to Cart. */
export default function AddToCart({ title, price, thumb, href, square_variation_id, variants }: Props) {
  const options = (variants ?? []).filter((v) => v.square_variation_id);
  const hasVariants = options.length > 0;

  const [prices, setPrices] = useState<PriceMap>({});
  const [selected, setSelected] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);

  const variationId = hasVariants ? selected : square_variation_id ?? '';
  const variant = options.find((v) => v.square_variation_id === selected);

  // With variants and nothing chosen yet, show the lowest price as "From".
  let shownPrice = priceOf(prices, variationId, price);
  let from = false;
  if (hasVariants && !selected) {
    const all = options.map((v) => priceOf(prices, v.square_variation_id, price));
    shownPrice = Math.min(...all);
    from = new Set(all).size > 1;
  }

  const soldOut = isSoldOut(prices, variationId);

  const add = () => {
    if (!variationId) {
      setNeedsChoice(true);
      return;
    }
    if (soldOut) return;
    addToCart(
      {
        variationId,
        title,
        variant: variant?.label,
        thumb,
        href,
        price: priceOf(prices, variationId, price),
      },
      qty,
    );
    setAdded(true);
  };

  return (
    <>
      {shownPrice !== 0 && (
        <div className="d-flex mb-4">
          <h3 className="font-weight-normal">
            {from && <span className="text-body text-lg me-2">From</span>}
            {formatPrice(shownPrice)}
          </h3>
        </div>
      )}

      {hasVariants && (
        <div className="mb-3" style={{ maxWidth: '320px' }}>
          <label htmlFor="variant-select" className="form-label">Version</label>
          <select
            id="variant-select"
            className={'form-select' + (needsChoice && !selected ? ' is-invalid' : '')}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setNeedsChoice(false);
              setAdded(false);
            }}
          >
            <option value="">Choose a version…</option>
            {options.map((v) => (
              <option key={v.square_variation_id} value={v.square_variation_id}>
                {v.label}{isSoldOut(prices, v.square_variation_id) ? ' (sold out)' : ''}
              </option>
            ))}
          </select>
          {needsChoice && !selected && (
            <div className="invalid-feedback d-block">Please choose a version first.</div>
          )}
        </div>
      )}

      <div className="d-flex align-items-end flex-wrap gap-3 mt-4 mb-2">
        <div style={{ width: '90px' }}>
          <label htmlFor="qty-input" className="form-label">Quantity</label>
          <input
            id="qty-input"
            type="number"
            min={1}
            max={MAX_QTY}
            className="form-control"
            value={qty}
            disabled={soldOut}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setQty(Number.isNaN(n) ? 1 : Math.max(1, Math.min(MAX_QTY, n)));
              setAdded(false);
            }}
          />
        </div>
        <button type="button" className="btn btn-primary btn-lg mb-0" style={{ minWidth: '200px' }} onClick={add} disabled={soldOut}>
          {soldOut ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>

      <div className="mb-4" aria-live="polite" style={{ minHeight: '1.5rem' }}>
        {added && (
          <span className="text-sm">
            <i className="bi bi-check-circle text-success me-1"></i>
            Added to cart. <a href={`${import.meta.env.BASE_URL}shopping-cart/`} className="text-primary font-weight-bold">View cart</a>
          </span>
        )}
      </div>
    </>
  );
}
