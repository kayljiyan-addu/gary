"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShoppingBasket,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ProductArt, formatPrice } from "@/components/product-card";
import type { FulfillmentMethod, MarketplaceListing } from "@/types";

interface DialogProps {
  title: string;
  description?: string;
  narrow?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, description, narrow, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`dialog-panel${narrow ? " dialog-panel-narrow" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
      >
        <header className="dialog-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {description && <p id="dialog-description">{description}</p>}
          </div>
          <button ref={closeRef} type="button" className="dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={17} />
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  );
}

interface ListingDetailDialogProps {
  listing: MarketplaceListing;
  onClose: () => void;
  onAddToCart: (listing: MarketplaceListing) => void;
  onMessage: (listing: MarketplaceListing) => void;
  onReport: (listing: MarketplaceListing) => void;
  onReportSeller: (listing: MarketplaceListing) => void;
  onFavorite: (listingId: string) => void;
  isFavorite: boolean;
}

export function ListingDetailDialog({
  listing,
  onClose,
  onAddToCart,
  onMessage,
  onReport,
  onReportSeller,
  onFavorite,
  isFavorite,
}: ListingDetailDialogProps) {
  return (
    <Dialog
      title={listing.product.name}
      description={`${listing.product.game} · ${listing.product.setName}`}
      onClose={onClose}
    >
      <div className="detail-layout">
        <div className="detail-art">
          <ProductArt art={listing.product.art} label={listing.product.name} imageUrl={listing.imageUrl} />
        </div>
        <div className="detail-meta">
          <div>
            <p className="eyebrow">{listing.product.productType} · {listing.product.rarity}</p>
            <h3 className="detail-name">{listing.product.name}</h3>
            <p className="detail-subtitle">Card #{listing.product.cardNumber} · {listing.product.setName}</p>
          </div>
          <div className="detail-price">{formatPrice(listing.price)}</div>
          <p className="detail-description">{listing.product.description}</p>
          <div className="detail-facts">
            <div className="detail-fact"><span>Condition</span><strong>{listing.condition}</strong></div>
            <div className="detail-fact"><span>Available</span><strong>{listing.quantity} copy{listing.quantity === 1 ? "" : "ies"}</strong></div>
            <div className="detail-fact"><span>Game</span><strong>{listing.product.game}</strong></div>
            <div className="detail-fact"><span>Fulfillment</span><strong>{listing.fulfillmentMethods.map((method) => method === "meetup" ? "Meetup" : "Shipping").join(" · ")}</strong></div>
          </div>
          <div className="detail-seller">
            <div className="seller-avatar" aria-hidden="true">{listing.seller.username.slice(0, 1).toUpperCase()}</div>
            <div className="detail-seller-copy">
              <strong>{listing.seller.username}</strong>
              <span><MapPin size={11} aria-hidden="true" /> {listing.seller.location || "Marketplace seller"}{listing.rating ? ` · ${listing.rating.toFixed(1)} (${listing.reviewCount ?? 0} reviews)` : ""}</span>
            </div>
          </div>
          <div className="detail-actions">
            <button type="button" className="button" onClick={() => onAddToCart(listing)} disabled={!listing.quantity || listing.status !== "active"}>
              <ShoppingBasket size={15} aria-hidden="true" /> Add to cart
            </button>
            <button type="button" className="button button-secondary" onClick={() => onMessage(listing)}>
              <MessageCircle size={15} aria-hidden="true" /> Message seller
            </button>
            <button type="button" className="button button-quiet button-small" onClick={() => onFavorite(listing.id)} aria-pressed={isFavorite}>
              <Heart size={14} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
              {isFavorite ? "Saved" : "Save"}
            </button>
          </div>
          <button type="button" className="text-button" onClick={() => onReport(listing)}>
            <AlertTriangle size={12} aria-hidden="true" /> Report this listing
          </button>
          <button type="button" className="text-button" onClick={() => onReportSeller(listing)}>
            <AlertTriangle size={12} aria-hidden="true" /> Report this seller
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export interface CartDisplayLine {
  listing: MarketplaceListing;
  quantity: number;
}

interface CartDialogProps {
  lines: CartDisplayLine[];
  onClose: () => void;
  onChangeQuantity: (listingId: string, quantity: number) => void;
  onRemove: (listingId: string) => void;
  onCheckout: (method: FulfillmentMethod, details: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}

export function CartDialog({
  lines,
  onClose,
  onChangeQuantity,
  onRemove,
  onCheckout,
  busy,
  error,
}: CartDialogProps) {
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("shipping");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fulfillmentChoices = (["shipping", "meetup"] as const).filter((method) =>
    lines.some((line) => line.listing.fulfillmentMethods.includes(method)),
  );
  const selectedFulfillment = fulfillmentChoices.includes(fulfillment) ? fulfillment : fulfillmentChoices[0] ?? fulfillment;
  const eligibleLines = lines.filter((line) => line.listing.fulfillmentMethods.includes(selectedFulfillment));
  const total = eligibleLines.reduce((sum, line) => sum + line.listing.price * line.quantity, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    await onCheckout(selectedFulfillment, details);
  }

  return (
    <Dialog title="Your cart" description="Review your picks before sending purchase requests." narrow onClose={onClose}>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      {lines.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><ShoppingBasket size={24} /></span>
          <h3>Your cart is waiting</h3>
          <p>Save a little room for the card you have been looking for.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="cart-lines">
            {lines.map(({ listing, quantity }) => (
              <div className="cart-line" key={listing.id}>
                <div className="cart-art" aria-hidden="true"><PackageCheck size={20} /></div>
                <div className="cart-line-copy">
                  <strong>{listing.product.name}</strong>
                  <span>{formatPrice(listing.price)} · {listing.condition}</span>
                  <span>{listing.seller.username}</span>
                  {!listing.fulfillmentMethods.includes(selectedFulfillment) && (
                    <span className="subtle-note">Not included in this request; it will stay in your cart.</span>
                  )}
                  <div className="quantity-controls" aria-label={`Quantity for ${listing.product.name}`}>
                    <button type="button" onClick={() => onChangeQuantity(listing.id, Math.max(0, quantity - 1))} aria-label="Decrease quantity">−</button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => onChangeQuantity(listing.id, Math.min(listing.quantity, quantity + 1))} aria-label="Increase quantity" disabled={quantity >= listing.quantity}>+</button>
                    <button type="button" className="button button-quiet button-small" onClick={() => onRemove(listing.id)}>Remove</button>
                  </div>
                </div>
                <strong>{formatPrice(listing.price * quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="summary-row"><span>Request subtotal</span><span>{formatPrice(total)}</span></div>
            <div className="summary-row"><span>Payment</span><span>Arranged with seller</span></div>
            <div className="summary-row summary-row-total"><span>Purchase request</span><span>{formatPrice(total)}</span></div>
            <div className="form-grid">
              <div className="form-field form-field-full">
                <label htmlFor="fulfillment-method">How would you like to receive these?</label>
                <select
                  id="fulfillment-method"
                  className="field-select"
                  value={selectedFulfillment}
                  onChange={(event) => setFulfillment(event.target.value as FulfillmentMethod)}
                >
                  <option value="shipping" disabled={!fulfillmentChoices.includes("shipping")}>Shipping — confirm details with seller</option>
                  <option value="meetup" disabled={!fulfillmentChoices.includes("meetup")}>Local meetup — arrange a public location</option>
                </select>
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="fulfillment-details">Fulfillment note <span className="subtle-note">(optional)</span></label>
                <textarea
                  id="fulfillment-details"
                  className="field-textarea"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={selectedFulfillment === "shipping" ? "Share a preferred courier or delivery note." : "Suggest a public meetup area and a time window."}
                  maxLength={500}
                />
              </div>
            </div>
            <p className="subtle-note">
              This submits a request, not a payment. {eligibleLines.length} item{eligibleLines.length === 1 ? "" : "s"} match this fulfillment method; other items stay in your cart.
            </p>
            <button type="submit" className="button button-full" disabled={busy || eligibleLines.length === 0}>
              {busy ? "Submitting request…" : submitted ? "Send another request" : "Submit purchase request"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

interface CompareDialogProps {
  listings: MarketplaceListing[];
  onClose: () => void;
  onOpen: (listing: MarketplaceListing) => void;
}

export function CompareDialog({ listings, onClose, onOpen }: CompareDialogProps) {
  return (
    <Dialog title="Compare listings" description="A side-by-side look at price, condition, availability, and seller." onClose={onClose}>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr><th>Details</th>{listings.map((listing) => <th key={listing.id}>{listing.product.name}</th>)}</tr>
          </thead>
          <tbody>
            <tr><th>Game / set</th>{listings.map((listing) => <td key={listing.id}>{listing.product.game}<br />{listing.product.setName}</td>)}</tr>
            <tr><th>Price</th>{listings.map((listing) => <td key={listing.id}><strong>{formatPrice(listing.price)}</strong></td>)}</tr>
            <tr><th>Condition</th>{listings.map((listing) => <td key={listing.id}>{listing.condition}</td>)}</tr>
            <tr><th>Available</th>{listings.map((listing) => <td key={listing.id}>{listing.quantity}</td>)}</tr>
            <tr><th>Seller</th>{listings.map((listing) => <td key={listing.id}>{listing.seller.username}<br /><span className="subtle-note">{listing.seller.location}</span></td>)}</tr>
            <tr><th>Fulfillment</th>{listings.map((listing) => <td key={listing.id}>{listing.fulfillmentMethods.includes("shipping") && <span><Truck size={12} /> Shipping </span>}{listing.fulfillmentMethods.includes("meetup") && <span><MapPin size={12} /> Meetup</span>}</td>)}</tr>
            <tr><th>Seller rating</th>{listings.map((listing) => <td key={listing.id}>{listing.rating ? `${listing.rating.toFixed(1)} / 5` : "New seller"}</td>)}</tr>
            <tr><th>Action</th>{listings.map((listing) => <td key={listing.id}><button type="button" className="button button-small" onClick={() => onOpen(listing)}>View listing</button></td>)}</tr>
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
