"use client";

import { AlertTriangle, LogIn, MessageCircle, Send, UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialogs";
import type { MarketplaceListing, UserRole } from "@/types";

export interface AuthInput {
  mode: "sign-in" | "sign-up";
  email: string;
  password: string;
  username: string;
  role: UserRole;
}

interface AuthenticationDialogProps {
  preview: boolean;
  busy: boolean;
  error: string | null;
  initialRole: UserRole;
  onClose: () => void;
  onSubmit: (input: AuthInput) => Promise<void>;
}

export function AuthenticationDialog({ preview, busy, error, initialRole, onClose, onSubmit }: AuthenticationDialogProps) {
  const [mode, setMode] = useState<AuthInput["mode"]>("sign-up");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ mode, email, password, username, role });
  }

  return (
    <Dialog
      title={mode === "sign-up" ? "Join the marketplace" : "Welcome back"}
      description={preview ? "Preview mode uses a local session; connect Supabase for real accounts." : "Your account keeps messages, listings, and requests together."}
      narrow
      onClose={onClose}
    >
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        {mode === "sign-up" && (
          <div className="form-field form-field-full">
            <label htmlFor="auth-username">Display name <span className="required-mark">*</span></label>
            <input id="auth-username" className="field-input" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={30} autoComplete="nickname" placeholder="How collectors will know you" />
          </div>
        )}
        <div className="form-field form-field-full">
          <label htmlFor="auth-email">Email address <span className="required-mark">*</span></label>
          <input id="auth-email" className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="form-field form-field-full">
          <label htmlFor="auth-password">Password <span className="required-mark">*</span></label>
          <input id="auth-password" className="field-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} placeholder="At least 8 characters" />
        </div>
        {(mode === "sign-up" || preview) && (
          <div className="form-field form-field-full">
            <label htmlFor="auth-role">I am here as a</label>
            <select id="auth-role" className="field-select" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="buyer">Buyer / collector</option>
              <option value="seller">Seller</option>
              {preview && <option value="moderator">Moderator (preview)</option>}
              {preview && <option value="admin">Marketplace administrator (preview)</option>}
            </select>
            <span className="field-help">Buyer and seller roles can be changed by marketplace staff.</span>
          </div>
        )}
        {preview && <p className="subtle-note form-field-full">Preview accounts are temporary and do not use or save the password entered above.</p>}
        <button type="submit" className="button button-full form-field-full" disabled={busy}>
          {busy ? "One moment…" : mode === "sign-up" ? <><UserRoundPlus size={15} /> Create account</> : <><LogIn size={15} /> Sign in</>}
        </button>
      </form>
      {!preview && mode === "sign-up" && (
        <p className="subtle-note auth-terms">
          By creating an account, you agree to use the marketplace respectfully.
        </p>
      )}
      <div className="auth-switch">
        <span>{mode === "sign-up" ? "Already have an account?" : "New to the marketplace?"}</span>
        <button type="button" className="text-button" onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}>
          {mode === "sign-up" ? "Sign in" : "Create account"}
        </button>
      </div>
    </Dialog>
  );
}

export interface MessageInput {
  content: string;
}

interface MessageDialogProps {
  listing: MarketplaceListing;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: MessageInput) => Promise<void>;
}

export function MessageDialog({ listing, busy, error, onClose, onSubmit }: MessageDialogProps) {
  const [content, setContent] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ content });
  }

  return (
    <Dialog title={`Message ${listing.seller.username}`} description={`About ${listing.product.name}`} narrow onClose={onClose}>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field form-field-full">
          <label htmlFor="message-content">Your message <span className="required-mark">*</span></label>
          <textarea
            id="message-content"
            className="field-textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            minLength={5}
            maxLength={1000}
            placeholder="Ask about condition, availability, or how to arrange fulfillment."
            autoFocus
          />
        </div>
        <p className="subtle-note form-field-full">Keep messages and arrangements on-platform so both parties have a clear record.</p>
        <button type="submit" className="button button-full form-field-full" disabled={busy || content.trim().length < 5}>
          <MessageCircle size={15} /> {busy ? "Sending…" : "Send message"}
        </button>
      </form>
    </Dialog>
  );
}

interface ReportDialogProps {
  targetName: string;
  targetType: "listing" | "seller";
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => Promise<void>;
}

export function ReportDialog({ targetName, targetType, busy, error, onClose, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState("misleading");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(reason, description);
  }

  return (
    <Dialog title="Report for review" description={`Tell our moderation team what concerns you about the ${targetType} ${targetName}.`} narrow onClose={onClose}>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field form-field-full">
          <label htmlFor="report-reason">Reason <span className="required-mark">*</span></label>
          <select id="report-reason" className="field-select" value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="misleading">Misleading or inaccurate information</option>
            <option value="counterfeit">Suspected counterfeit item</option>
            <option value="harassment">Harassment or unsafe behavior</option>
            <option value="prohibited">Prohibited listing or item</option>
            <option value="other">Something else</option>
          </select>
        </div>
        <div className="form-field form-field-full">
          <label htmlFor="report-description">Details <span className="required-mark">*</span></label>
          <textarea id="report-description" className="field-textarea" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={10} maxLength={1000} placeholder="Share specific details that help us review this report." />
        </div>
        <button type="submit" className="button button-full form-field-full" disabled={busy || description.trim().length < 10}>
          <AlertTriangle size={14} /> {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </Dialog>
  );
}

export function MessageComposerDialog({
  recipientName,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  recipientName: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(content);
  }

  return (
    <Dialog title={`Message ${recipientName}`} description="Keep transaction details and arrangements in your marketplace inbox." narrow onClose={onClose}>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="form-field form-field-full">
          <label htmlFor="direct-message">Your message <span className="required-mark">*</span></label>
          <textarea id="direct-message" className="field-textarea" value={content} onChange={(event) => setContent(event.target.value)} required minLength={5} maxLength={1000} autoFocus />
        </div>
        <button type="submit" className="button form-field-full" disabled={busy || content.trim().length < 5}><Send size={14} />{busy ? "Sending…" : "Send message"}</button>
      </form>
    </Dialog>
  );
}
