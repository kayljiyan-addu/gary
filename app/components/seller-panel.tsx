"use client";

import { AlertTriangle, Check, CircleDollarSign, CirclePlus, ImageUp, Package, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialogs";
import type { ListingCondition, ListingDraft, MarketplaceListing } from "@/types";
import { formatPrice } from "@/components/product-card";

const conditions: ListingCondition[] = ["Near Mint", "Lightly Played", "Moderately Played", "Heavily Played"];
const games = ["Mythic Realms", "Chronicle Duels", "Verdant Skies"];

const emptyDraft: ListingDraft = {
  name: "",
  game: games[0],
  setName: "",
  cardNumber: "",
  rarity: "Common",
  productType: "Card",
  description: "",
  condition: "Near Mint",
  quantity: 1,
  price: 0,
  fulfillmentMethods: ["shipping"],
};

interface SellerPanelProps {
  listings: MarketplaceListing[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  onCreate: (draft: ListingDraft) => Promise<void>;
  onEdit: (listing: MarketplaceListing, changes: ListingDraft) => Promise<void>;
  onRemove: (listing: MarketplaceListing) => void;
  onMarkSold: (listing: MarketplaceListing) => void;
}

export function SellerPanel({ listings, busy, error, preview, onCreate, onEdit, onRemove, onMarkSold }: SellerPanelProps) {
  const [editing, setEditing] = useState<MarketplaceListing | null>(null);
  const [creating, setCreating] = useState(false);
  const activeCount = listings.filter((listing) => listing.status === "active").length;
  const totalCopies = listings.filter((listing) => listing.status === "active").reduce((sum, listing) => sum + listing.quantity, 0);

  async function saveDraft(draft: ListingDraft) {
    if (editing) {
      await onEdit(editing, draft);
    } else {
      await onCreate(draft);
    }
    setEditing(null);
    setCreating(false);
  }

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow">Seller studio</p>
          <h1>Your table, your terms.</h1>
          <p>Keep listings accurate and fulfillment clear for every collector.</p>
        </div>
        <button type="button" className="button" onClick={() => setCreating(true)}>
          <CirclePlus size={16} /> Create a listing
        </button>
      </div>
      <div className="dashboard-grid">
        <div className="stat-card"><span className="stat-label"><Package size={15} /> Active listings</span><strong className="stat-value">{activeCount}</strong></div>
        <div className="stat-card"><span className="stat-label"><ShieldCheck size={15} /> Copies available</span><strong className="stat-value">{totalCopies}</strong></div>
        <div className="stat-card"><span className="stat-label"><CircleDollarSign size={15} /> Payment model</span><strong className="stat-value">By request</strong></div>
      </div>
      <section className="content-panel">
        <div className="panel-heading">
          <div><h2>Your listings</h2><p className="results-count">Edit details or update availability.</p></div>
        </div>
        {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
        {listings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon"><Package size={23} /></span>
            <h3>No listings yet</h3>
            <p>Add your first card to make it discoverable to the community.</p>
            <button type="button" className="button button-small" onClick={() => setCreating(true)}>Create a listing</button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="listing-table">
              <thead><tr><th>Card</th><th>Condition</th><th>Price</th><th>Quantity</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td><div className="table-product"><strong>{listing.product.name}</strong><span>{listing.product.game} · {listing.product.setName}</span></div></td>
                    <td>{listing.condition}</td>
                    <td>{formatPrice(listing.price)}</td>
                    <td>{listing.quantity}</td>
                    <td><span className={`status-pill status-${listing.status}`}>{listing.status}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="table-action" onClick={() => setEditing(listing)} aria-label={`Edit ${listing.product.name}`}><Pencil size={14} /></button>
                        {listing.status === "active" && <button type="button" className="table-action" onClick={() => onMarkSold(listing)} aria-label={`Mark ${listing.product.name} as sold`}><Check size={15} /></button>}
                        {listing.status === "active" && <button type="button" className="table-action table-action-danger" onClick={() => onRemove(listing)} aria-label={`Remove ${listing.product.name}`}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {(creating || editing) && (
        <ListingEditorDialog
          listing={editing}
          busy={busy}
          preview={preview}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={saveDraft}
        />
      )}
    </>
  );
}

interface ListingEditorDialogProps {
  listing: MarketplaceListing | null;
  busy: boolean;
  preview: boolean;
  onClose: () => void;
  onSave: (draft: ListingDraft) => Promise<void>;
}

function ListingEditorDialog({ listing, busy, preview, onClose, onSave }: ListingEditorDialogProps) {
  const [draft, setDraft] = useState<ListingDraft>(() => listing ? {
    name: listing.product.name,
    game: listing.product.game,
    setName: listing.product.setName,
    cardNumber: listing.product.cardNumber,
    rarity: listing.product.rarity,
    productType: listing.product.productType,
    description: listing.product.description,
    condition: listing.condition,
    quantity: listing.quantity,
    price: listing.price,
    fulfillmentMethods: listing.fulfillmentMethods,
  } : emptyDraft);

  useEffect(() => {
    setDraft(listing ? {
      name: listing.product.name,
      game: listing.product.game,
      setName: listing.product.setName,
      cardNumber: listing.product.cardNumber,
      rarity: listing.product.rarity,
      productType: listing.product.productType,
      description: listing.product.description,
      condition: listing.condition,
      quantity: listing.quantity,
      price: listing.price,
      fulfillmentMethods: listing.fulfillmentMethods,
    } : emptyDraft);
  }, [listing]);

  function setField<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleMethod(method: "shipping" | "meetup") {
    setDraft((current) => {
      const next = current.fulfillmentMethods.includes(method)
        ? current.fulfillmentMethods.filter((item) => item !== method)
        : [...current.fulfillmentMethods, method];
      return { ...current, fulfillmentMethods: next.length ? next : current.fulfillmentMethods };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(draft);
  }

  const editing = Boolean(listing);

  return (
    <Dialog
      title={editing ? "Edit listing" : "Create a listing"}
      description={editing ? "Update condition, quantity, price, or fulfillment." : "Describe the card clearly so buyers know exactly what they are requesting."}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-layout">
          <div className="form-grid">
            <div className="form-field form-field-full">
              <label htmlFor="listing-name">Card name <span className="required-mark">*</span></label>
              <input id="listing-name" className="field-input" value={draft.name} onChange={(event) => setField("name", event.target.value)} required minLength={2} maxLength={100} disabled={editing} />
            </div>
            <div className="form-field">
              <label htmlFor="listing-game">Trading card game <span className="required-mark">*</span></label>
              <select id="listing-game" className="field-select" value={draft.game} onChange={(event) => setField("game", event.target.value)} disabled={editing}>
                {games.map((game) => <option key={game}>{game}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="listing-set">Set or collection <span className="required-mark">*</span></label>
              <input id="listing-set" className="field-input" value={draft.setName} onChange={(event) => setField("setName", event.target.value)} required maxLength={80} disabled={editing} />
            </div>
            <div className="form-field">
              <label htmlFor="listing-number">Card number</label>
              <input id="listing-number" className="field-input" value={draft.cardNumber} onChange={(event) => setField("cardNumber", event.target.value)} maxLength={30} disabled={editing} />
            </div>
            <div className="form-field">
              <label htmlFor="listing-rarity">Rarity</label>
              <input id="listing-rarity" className="field-input" value={draft.rarity} onChange={(event) => setField("rarity", event.target.value)} maxLength={40} disabled={editing} />
            </div>
            <div className="form-field">
              <label htmlFor="listing-type">Card type</label>
              <input id="listing-type" className="field-input" value={draft.productType} onChange={(event) => setField("productType", event.target.value)} maxLength={60} disabled={editing} />
            </div>
            <div className="form-field">
              <label htmlFor="listing-condition">Condition <span className="required-mark">*</span></label>
              <select id="listing-condition" className="field-select" value={draft.condition} onChange={(event) => setField("condition", event.target.value as ListingCondition)}>
                {conditions.map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="listing-price">Price (PHP) <span className="required-mark">*</span></label>
              <input id="listing-price" className="field-input" type="number" min="0.01" max="1000000" step="0.01" value={draft.price || ""} onChange={(event) => setField("price", Number(event.target.value))} required />
            </div>
            <div className="form-field">
              <label htmlFor="listing-quantity">Quantity <span className="required-mark">*</span></label>
              <input id="listing-quantity" className="field-input" type="number" min="1" max="999" step="1" value={draft.quantity} onChange={(event) => setField("quantity", Number(event.target.value))} required />
            </div>
            <div className="form-field form-field-full">
              <label htmlFor="listing-description">Description</label>
              <textarea id="listing-description" className="field-textarea" value={draft.description} onChange={(event) => setField("description", event.target.value)} maxLength={1000} disabled={editing} placeholder="Share notes about the card, its language, or how you pack orders." />
            </div>
            {!editing && (
              <div className="form-field form-field-full">
                <label htmlFor="listing-image"><ImageUp size={14} /> Listing photo <span className="subtle-note">(optional)</span></label>
                <input
                  id="listing-image"
                  className="field-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={preview}
                  onChange={(event) => setField("imageFile", event.target.files?.[0] ?? null)}
                />
                <span className="field-help">
                  {preview ? "Photo uploads are available when Supabase is connected." : "JPEG, PNG, or WebP; maximum 5 MB."}
                </span>
              </div>
            )}
            <div className="form-field form-field-full">
              <span className="form-field-label">Fulfillment available</span>
              <div className="check-options">
                <label className="filter-check"><input type="checkbox" checked={draft.fulfillmentMethods.includes("shipping")} onChange={() => toggleMethod("shipping")} /> Shipping</label>
                <label className="filter-check"><input type="checkbox" checked={draft.fulfillmentMethods.includes("meetup")} onChange={() => toggleMethod("meetup")} /> Local meetup</label>
              </div>
            </div>
          </div>
          <aside className="seller-tip">
            <h3><ShieldCheck size={15} /> Clear listings build trust</h3>
            <p>Use an honest condition, show the set and card number, and agree on payment directly with the buyer after their request.</p>
          </aside>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button" disabled={busy || draft.fulfillmentMethods.length === 0}>
            {busy ? "Saving…" : editing ? "Save changes" : "Publish listing"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
