"use client";

import { AlertTriangle, LogOut, MapPin, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { MarketplaceUser } from "@/types";

export interface ProfileChanges {
  firstName: string;
  lastName: string;
  location: string;
  description: string;
  contactInformation: string;
}

interface AccountPanelProps {
  user: MarketplaceUser;
  busy: boolean;
  error: string | null;
  onSave: (changes: ProfileChanges) => Promise<void>;
  onSignOut: () => void;
}

export function AccountPanel({ user, busy, error, onSave, onSignOut }: AccountPanelProps) {
  const [values, setValues] = useState<ProfileChanges>({
    firstName: user.firstName,
    lastName: user.lastName,
    location: user.location,
    description: user.description,
    contactInformation: user.contactInformation ?? "",
  });

  useEffect(() => {
    setValues({
      firstName: user.firstName,
      lastName: user.lastName,
      location: user.location,
      description: user.description,
      contactInformation: user.contactInformation ?? "",
    });
  }, [user]);

  function setField<K extends keyof ProfileChanges>(key: K, value: ProfileChanges[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(values);
  }

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>A little about you.</h1>
          <p>Keep your public profile helpful and your contact details private.</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onSignOut}><LogOut size={15} /> Sign out</button>
      </div>
      {error && <p className="alert" role="alert"><AlertTriangle size={15} />{error}</p>}
      <section className="content-panel">
        <div className="profile-grid">
          <aside className="profile-side">
            <div className="profile-avatar" aria-hidden="true">{user.firstName.slice(0, 1).toUpperCase() || user.username.slice(0, 1).toUpperCase()}</div>
            <strong>{user.username}</strong>
            <span className="role-chip"><UserRound size={12} /> {user.role}</span>
            <span className="subtle-note">{user.email}</span>
            <span className="subtle-note"><MapPin size={11} /> {user.location || "Location not set"}</span>
            {user.accountStatus === "suspended" && <span className="status-pill status-suspended">Account suspended</span>}
          </aside>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="profile-first-name">First name</label>
                <input id="profile-first-name" className="field-input" value={values.firstName} onChange={(event) => setField("firstName", event.target.value)} maxLength={60} />
              </div>
              <div className="form-field">
                <label htmlFor="profile-last-name">Last name</label>
                <input id="profile-last-name" className="field-input" value={values.lastName} onChange={(event) => setField("lastName", event.target.value)} maxLength={60} />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="profile-location">City or area</label>
                <input id="profile-location" className="field-input" value={values.location} onChange={(event) => setField("location", event.target.value)} maxLength={100} placeholder="Shown on your public seller profile" />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="profile-description">Profile introduction</label>
                <textarea id="profile-description" className="field-textarea" value={values.description} onChange={(event) => setField("description", event.target.value)} maxLength={500} placeholder="What do you collect or enjoy trading?" />
              </div>
              <div className="form-field form-field-full">
                <label htmlFor="profile-contact">Contact information <span className="subtle-note">(private; shared only with you and transaction counterparties)</span></label>
                <input id="profile-contact" className="field-input" value={values.contactInformation} onChange={(event) => setField("contactInformation", event.target.value)} maxLength={200} placeholder="Optional phone or preferred contact method" />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="button" disabled={busy}><Save size={15} />{busy ? "Saving…" : "Save profile"}</button>
              <span className="subtle-note"><ShieldCheck size={12} /> Contact details aren&apos;t public.</span>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
