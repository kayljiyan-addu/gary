"use client";

import { AlertTriangle, Check, CircleDollarSign, Clock3, MessageCircle, PackageCheck, Send, ShieldAlert, Star, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialogs";
import { formatPrice } from "@/components/product-card";
import type { MarketplaceTransaction, MarketplaceUser } from "@/types";

export type TransactionAction = "accept" | "ship" | "complete" | "cancel";

interface TransactionsPanelProps {
  transactions: MarketplaceTransaction[];
  user: MarketplaceUser;
  loading: boolean;
  error: string | null;
  onAction: (transaction: MarketplaceTransaction, action: TransactionAction) => Promise<void>;
  onMessage: (transaction: MarketplaceTransaction) => void;
  onReview: (transaction: MarketplaceTransaction, stars: number, review: string) => Promise<void>;
  onDispute: (transaction: MarketplaceTransaction, reason: string, description: string) => Promise<void>;
}

export function TransactionsPanel({
  transactions,
  user,
  loading,
  error,
  onAction,
  onMessage,
  onReview,
  onDispute,
}: TransactionsPanelProps) {
  const [reviewing, setReviewing] = useState<MarketplaceTransaction | null>(null);
  const [disputing, setDisputing] = useState<MarketplaceTransaction | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function runAction(transaction: MarketplaceTransaction, action: TransactionAction) {
    setBusyAction(transaction.id);
    try {
      await onAction(transaction, action);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow">Orders and requests</p>
          <h1>Every trade, accounted for.</h1>
          <p>Track buyer and seller requests, fulfillment, and the next step.</p>
        </div>
        <span className="role-chip"><CircleDollarSign size={13} /> Payment arranged directly</span>
      </div>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      {loading ? (
        <div className="loading-state"><div className="spinner" role="status" aria-label="Loading transactions" /></div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><PackageCheck size={23} /></span>
          <h3>No transactions yet</h3>
          <p>Purchase requests and sales will appear here with their latest status.</p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((transaction) => {
            const isSeller = transaction.sellerId === user.id;
            const actionBusy = busyAction === transaction.id;
            return (
              <article className="transaction-card" key={transaction.id}>
                <div className="transaction-details">
                  <strong>{transaction.itemSummary || "Purchase request"}</strong>
                  <span>{isSeller ? "Buyer" : "Seller"}: {transaction.otherPartyName ?? "Marketplace member"} · {formatPrice(transaction.totalAmount)}</span>
                  <span>Ref. {transaction.id.slice(0, 8).toUpperCase()} · {new Date(transaction.createdAt).toLocaleDateString()}</span>
                  <span>{transaction.fulfillmentMethod === "shipping" ? "Shipping" : "Local meetup"} · Fulfillment {transaction.fulfillmentStatus ?? "requested"} · Payment {transaction.paymentStatus}</span>
                </div>
                <div className="transaction-actions">
                  <span className={`status-pill status-${transaction.status}`}><Clock3 size={11} /> {transaction.status}</span>
                  {transaction.status === "requested" && isSeller && (
                    <button type="button" className="button button-small" disabled={actionBusy} onClick={() => void runAction(transaction, "accept")}><Check size={13} /> Accept</button>
                  )}
                  {transaction.status === "accepted" && isSeller && transaction.fulfillmentMethod === "shipping" && (
                    <button type="button" className="button button-small" disabled={actionBusy} onClick={() => void runAction(transaction, "ship")}><Truck size={13} /> Mark shipped</button>
                  )}
                  {transaction.status === "accepted" && isSeller && transaction.fulfillmentMethod === "meetup" && (
                    <button type="button" className="button button-small" disabled={actionBusy} onClick={() => void runAction(transaction, "complete")}><Check size={13} /> Mark complete</button>
                  )}
                  {transaction.status === "shipped" && !isSeller && (
                    <button type="button" className="button button-small" disabled={actionBusy} onClick={() => void runAction(transaction, "complete")}><PackageCheck size={13} /> Confirm received</button>
                  )}
                  {transaction.status === "requested" && !isSeller && (
                    <button type="button" className="button button-secondary button-small" disabled={actionBusy} onClick={() => void runAction(transaction, "cancel")}>Cancel request</button>
                  )}
                  {transaction.status === "completed" && !isSeller && !transaction.reviewed && (
                    <button type="button" className="button button-secondary button-small" onClick={() => setReviewing(transaction)}><Star size={13} /> Leave a review</button>
                  )}
                  {!["cancelled", "completed"].includes(transaction.status) && (
                    <button type="button" className="button button-quiet button-small" onClick={() => setDisputing(transaction)}><ShieldAlert size={13} /> Open dispute</button>
                  )}
                  <button type="button" className="button button-quiet button-small" onClick={() => onMessage(transaction)}><MessageCircle size={13} /> Message</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {reviewing && (
        <ReviewDialog
          onClose={() => setReviewing(null)}
          onSubmit={async (stars, review) => {
            await onReview(reviewing, stars, review);
            setReviewing(null);
          }}
        />
      )}
      {disputing && (
        <DisputeDialog
          onClose={() => setDisputing(null)}
          onSubmit={async (reason, description) => {
            await onDispute(disputing, reason, description);
            setDisputing(null);
          }}
        />
      )}
    </>
  );
}

function ReviewDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (stars: number, review: string) => Promise<void> }) {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(stars, review);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Rate this seller" description="Reviews are available after a completed transaction." narrow onClose={onClose}>
      {error && <p className="alert" role="alert">{error}</p>}
      <form className="form-grid" onSubmit={submit}>
        <fieldset className="form-field form-field-full star-rating">
          <legend>Your rating</legend>
          <div className="star-options">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" className="star-button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={stars === value} onClick={() => setStars(value)}>
                <Star size={25} fill={value <= stars ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="form-field form-field-full">
          <label htmlFor="seller-review">Written review <span className="subtle-note">(optional)</span></label>
          <textarea id="seller-review" className="field-textarea" value={review} onChange={(event) => setReview(event.target.value)} maxLength={1000} placeholder="Share what went well for future collectors." />
        </div>
        <button className="button form-field-full" type="submit" disabled={busy}>{busy ? "Saving…" : "Submit review"}<Send size={14} /></button>
      </form>
    </Dialog>
  );
}

function DisputeDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, description: string) => Promise<void> }) {
  const [reason, setReason] = useState("item_not_received");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(reason, description);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The dispute could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Open a dispute" description="Share the issue with marketplace staff. Keep messages and any relevant details on-platform." narrow onClose={onClose}>
      {error && <p className="alert" role="alert">{error}</p>}
      <form className="form-grid" onSubmit={submit}>
        <div className="form-field form-field-full">
          <label htmlFor="dispute-reason">What happened?</label>
          <select id="dispute-reason" className="field-select" value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="item_not_received">Item not received</option>
            <option value="not_as_described">Item differs from description</option>
            <option value="payment_issue">Payment or refund issue</option>
            <option value="fulfillment_issue">Fulfillment arrangement issue</option>
            <option value="other">Other concern</option>
          </select>
        </div>
        <div className="form-field form-field-full">
          <label htmlFor="dispute-details">Details</label>
          <textarea id="dispute-details" className="field-textarea" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={1000} />
        </div>
        <button className="button form-field-full" type="submit" disabled={busy || description.trim().length < 10}>{busy ? "Submitting…" : "Submit dispute"}<AlertTriangle size={14} /></button>
      </form>
    </Dialog>
  );
}
