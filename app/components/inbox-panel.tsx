"use client";

import { Inbox, MessageCircle, Reply, Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialogs";
import type { MarketplaceConversation, MarketplaceUser } from "@/types";

interface InboxPanelProps {
  messages: MarketplaceConversation[];
  user: MarketplaceUser;
  loading: boolean;
  error: string | null;
  onSend: (recipientId: string, listingId: string | null, content: string) => Promise<void>;
}

export function InboxPanel({ messages, user, loading, error, onSend }: InboxPanelProps) {
  const [replyTo, setReplyTo] = useState<MarketplaceConversation | null>(null);
  const conversations = useMemo(() => messages, [messages]);

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow">Conversations</p>
          <h1>Your messages.</h1>
          <p>Questions and arrangements stay connected to the marketplace.</p>
        </div>
        <span className="role-chip"><Inbox size={13} /> {messages.length} message{messages.length === 1 ? "" : "s"}</span>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {loading ? (
        <div className="loading-state"><div className="spinner" role="status" aria-label="Loading messages" /></div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><MessageCircle size={23} /></span>
          <h3>No messages yet</h3>
          <p>Start a conversation from a listing to ask about condition, availability, or fulfillment.</p>
        </div>
      ) : (
        <div className="message-list">
          {conversations.map((message) => {
            const sentByMe = message.senderId === user.id;
            const otherName = sentByMe ? message.recipientName : message.senderName;
            return (
              <article className="message-card" key={message.id}>
                <div className="message-details">
                  <strong>{sentByMe ? `To ${otherName}` : `From ${otherName}`}</strong>
                  <span>{message.content}</span>
                  <span>{new Date(message.sentAt).toLocaleString()} {message.listingId ? "· Listing conversation" : ""}</span>
                </div>
                <div className="message-actions">
                  <button type="button" className="button button-secondary button-small" onClick={() => setReplyTo(message)}><Reply size={13} /> Reply</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {replyTo && (
        <ReplyDialog
          recipientName={replyTo.senderId === user.id ? replyTo.recipientName : replyTo.senderName}
          onClose={() => setReplyTo(null)}
          onSend={async (content) => {
            await onSend(replyTo.senderId === user.id ? replyTo.recipientId : replyTo.senderId, replyTo.listingId, content);
            setReplyTo(null);
          }}
        />
      )}
    </>
  );
}

function ReplyDialog({
  recipientName,
  onClose,
  onSend,
}: {
  recipientName: string;
  onClose: () => void;
  onSend: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSend(content.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Reply to ${recipientName}`} narrow onClose={onClose}>
      {error && <p className="alert" role="alert">{error}</p>}
      <form className="form-grid" onSubmit={submit}>
        <div className="form-field form-field-full">
          <label htmlFor="inbox-reply">Message</label>
          <textarea id="inbox-reply" className="field-textarea" value={content} onChange={(event) => setContent(event.target.value)} required minLength={5} maxLength={1000} autoFocus />
        </div>
        <button className="button form-field-full" type="submit" disabled={busy || content.trim().length < 5}><Send size={14} />{busy ? "Sending…" : "Send reply"}</button>
      </form>
    </Dialog>
  );
}
