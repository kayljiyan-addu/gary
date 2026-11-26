"use client";

import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Check,
  CircleDollarSign,
  FileWarning,
  Megaphone,
  Pencil,
  Plus,
  Shield,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialogs";
import { formatPrice } from "@/components/product-card";
import type {
  Announcement,
  MarketplaceDispute,
  MarketplaceListing,
  MarketplaceMember,
  MarketplaceReport,
  MarketplaceTransaction,
  UserRole,
} from "@/types";

type AdminSection = "reports" | "transactions" | "disputes" | "members" | "announcements";

interface AdminPanelProps {
  role: UserRole;
  reports: MarketplaceReport[];
  transactions: MarketplaceTransaction[];
  disputes: MarketplaceDispute[];
  members: MarketplaceMember[];
  announcements: Announcement[];
  listings: MarketplaceListing[];
  loading: boolean;
  error: string | null;
  onReportStatus: (reportId: string, status: MarketplaceReport["status"]) => Promise<void>;
  onRemoveListing: (listingId: string) => Promise<void>;
  onDisputeUpdate: (disputeId: string, status: MarketplaceDispute["status"], outcome: string) => Promise<void>;
  onMemberStatus: (memberId: string, status: "active" | "suspended", reason: string) => Promise<void>;
  onMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  onAnnouncementSave: (announcement: { id?: string; title: string; body: string; isPublished: boolean }) => Promise<void>;
}

export function AdminPanel(props: AdminPanelProps) {
  const [section, setSection] = useState<AdminSection>("reports");
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const isAdmin = props.role === "admin";
  const sections: { id: AdminSection; label: string; icon: typeof FileWarning; adminOnly?: boolean }[] = [
    { id: "reports", label: "Reports", icon: FileWarning },
    { id: "transactions", label: "Transactions", icon: CircleDollarSign, adminOnly: true },
    { id: "disputes", label: "Disputes", icon: Shield, adminOnly: true },
    { id: "members", label: "Members", icon: Users, adminOnly: true },
    { id: "announcements", label: "Announcements", icon: Megaphone, adminOnly: true },
  ];

  const activeListings = props.listings.filter((listing) => listing.status === "active").length;
  const openReports = props.reports.filter((report) => report.status === "pending" || report.status === "reviewing").length;
  const grossRequests = props.transactions.reduce((total, transaction) => total + transaction.totalAmount, 0);

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow">{isAdmin ? "Marketplace administration" : "Trust and safety"}</p>
          <h1>Keep the marketplace sound.</h1>
          <p>Review reports, support safe exchanges, and act within your assigned permissions.</p>
        </div>
        <span className="role-chip"><Shield size={13} /> {props.role}</span>
      </div>
      {props.error && <p className="alert" role="alert"><AlertTriangle size={15} />{props.error}</p>}
      {props.loading ? (
        <div className="loading-state"><div className="spinner" role="status" aria-label="Loading staff workspace" /></div>
      ) : (
        <>
          {isAdmin && (
            <div className="dashboard-grid">
              <Stat icon={Users} label="Members" value={props.members.length.toLocaleString()} />
              <Stat icon={BarChart3} label="Active listings" value={activeListings.toLocaleString()} />
              <Stat icon={FileWarning} label="Open reports" value={openReports.toLocaleString()} />
              <Stat icon={CircleDollarSign} label="Request value" value={formatPrice(grossRequests)} />
            </div>
          )}
          <div className="staff-tabs" role="tablist" aria-label="Staff tools">
            {sections.filter((item) => !item.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={`staff-tab${section === id ? " is-active" : ""}`} role="tab" aria-selected={section === id} onClick={() => setSection(id)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <section className="content-panel">
            {section === "reports" && <ReportsSection {...props} isAdmin={isAdmin} />}
            {section === "transactions" && isAdmin && <TransactionsSection transactions={props.transactions} />}
            {section === "disputes" && isAdmin && <DisputesSection disputes={props.disputes} onDisputeUpdate={props.onDisputeUpdate} />}
            {section === "members" && isAdmin && <MembersSection members={props.members} onMemberStatus={props.onMemberStatus} onMemberRole={props.onMemberRole} />}
            {section === "announcements" && isAdmin && (
              <AnnouncementsSection
                announcements={props.announcements}
                onAnnouncementSave={props.onAnnouncementSave}
                creating={creatingAnnouncement}
                onCreate={() => setCreatingAnnouncement(true)}
                onCloseCreate={() => setCreatingAnnouncement(false)}
              />
            )}
          </section>
        </>
      )}
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <div className="stat-card"><span className="stat-label"><Icon size={15} />{label}</span><strong className="stat-value">{value}</strong></div>;
}

function ReportsSection({
  reports,
  listings,
  isAdmin,
  onReportStatus,
  onRemoveListing,
}: Pick<AdminPanelProps, "reports" | "listings" | "onReportStatus" | "onRemoveListing"> & { isAdmin: boolean }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function update(reportId: string, status: MarketplaceReport["status"]) {
    setBusyId(reportId);
    try { await onReportStatus(reportId, status); } finally { setBusyId(null); }
  }

  return (
    <>
      <div className="panel-heading"><div><h2>Reported content and members</h2><p className="results-count">Findings are recorded with each report status.</p></div><span className="status-pill">{reports.length} reports</span></div>
      {reports.length === 0 ? <EmptyAdmin icon={FileWarning} title="No reports to review" /> : (
        <div className="admin-list">
          {reports.map((report) => {
            const listing = report.listingId ? listings.find((item) => item.id === report.listingId) : undefined;
            return (
              <article className="admin-item" key={report.id}>
                <div className="admin-details">
                  <strong>{report.reason.replaceAll("_", " ")} · {listing ? listing.product.name : report.targetUserId ? "Member report" : "Marketplace report"}</strong>
                  <span>{report.description}</span>
                  <span>Submitted {new Date(report.createdAt).toLocaleString()} · Status: {report.status}</span>
                </div>
                <div className="admin-actions">
                  {report.status === "pending" && <button className="button button-secondary button-small" type="button" disabled={busyId === report.id} onClick={() => void update(report.id, "reviewing")}>Review</button>}
                  {report.status !== "resolved" && <button className="button button-small" type="button" disabled={busyId === report.id} onClick={() => void update(report.id, "resolved")}><Check size={12} /> Resolve</button>}
                  {report.status !== "dismissed" && <button className="button button-quiet button-small" type="button" disabled={busyId === report.id} onClick={() => void update(report.id, "dismissed")}><X size={12} /> Dismiss</button>}
                  {isAdmin && listing?.status === "active" && <button className="button button-danger button-small" type="button" onClick={() => void onRemoveListing(listing.id)}>Remove listing</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function TransactionsSection({ transactions }: { transactions: MarketplaceTransaction[] }) {
  return (
    <>
      <div className="panel-heading"><div><h2>Transaction monitor</h2><p className="results-count">Operational view; payment is arranged directly between members.</p></div></div>
      {transactions.length === 0 ? <EmptyAdmin icon={CircleDollarSign} title="No transaction records" /> : (
        <div className="admin-list">
          {transactions.map((transaction) => (
            <article className="admin-item" key={transaction.id}>
              <div className="admin-details">
                <strong>{transaction.itemSummary || "Purchase request"} · {formatPrice(transaction.totalAmount)}</strong>
                <span>Buyer {transaction.buyerId.slice(0, 8)} · Seller {transaction.sellerId.slice(0, 8)}</span>
                <span>{transaction.status} · payment {transaction.paymentStatus} · {transaction.fulfillmentMethod}</span>
              </div>
              <span className="subtle-note">{new Date(transaction.createdAt).toLocaleDateString()}</span>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function DisputesSection({ disputes, onDisputeUpdate }: Pick<AdminPanelProps, "disputes" | "onDisputeUpdate">) {
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function update(disputeId: string, status: MarketplaceDispute["status"]) {
    setBusyId(disputeId);
    try { await onDisputeUpdate(disputeId, status, outcomes[disputeId] ?? ""); } finally { setBusyId(null); }
  }

  return (
    <>
      <div className="panel-heading"><div><h2>Dispute desk</h2><p className="results-count">Record the decision and what happens next.</p></div></div>
      {disputes.length === 0 ? <EmptyAdmin icon={Shield} title="No disputes to review" /> : (
        <div className="admin-list">
          {disputes.map((dispute) => (
            <article className="admin-item" key={dispute.id}>
              <div className="admin-details">
                <strong>{dispute.reason.replaceAll("_", " ")} · Transaction {dispute.transactionId.slice(0, 8)}</strong>
                <span>{dispute.description}</span>
                <span>Status: {dispute.status}{dispute.outcome ? ` · Outcome: ${dispute.outcome}` : ""}</span>
                <label className="sr-only" htmlFor={`outcome-${dispute.id}`}>Decision or next action</label>
                <input id={`outcome-${dispute.id}`} className="field-input" value={outcomes[dispute.id] ?? dispute.outcome} onChange={(event) => setOutcomes((current) => ({ ...current, [dispute.id]: event.target.value }))} placeholder="Record decision or next action" />
              </div>
              <div className="admin-actions">
                <button className="button button-secondary button-small" type="button" disabled={busyId === dispute.id} onClick={() => void update(dispute.id, "reviewing")}>Need more info</button>
                <button className="button button-small" type="button" disabled={busyId === dispute.id || !(outcomes[dispute.id] ?? dispute.outcome).trim()} onClick={() => void update(dispute.id, "resolved")}>Resolve</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function MembersSection({ members, onMemberStatus, onMemberRole }: Pick<AdminPanelProps, "members" | "onMemberStatus" | "onMemberRole">) {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const filtered = useMemo(() => members.filter((member) => `${member.username} ${member.firstName} ${member.lastName} ${member.location}`.toLowerCase().includes(search.toLowerCase())), [members, search]);

  return (
    <>
      <div className="panel-heading"><div><h2>Member accounts</h2><p className="results-count">Search members and manage account access.</p></div><span className="status-pill">{members.length} members</span></div>
      <div className="form-field member-search">
        <label htmlFor="member-search">Search members</label>
        <input id="member-search" className="field-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username, name, or location" />
      </div>
      {filtered.length === 0 ? <EmptyAdmin icon={UserRound} title="No matching members" /> : (
        <div className="admin-list">
          {filtered.map((member) => (
            <article className="admin-item" key={member.id}>
              <div className="admin-details">
                <strong>{member.username} · {member.role}</strong>
                <span>{[member.firstName, member.lastName].filter(Boolean).join(" ") || "Name not provided"} · {member.location || "No location"}</span>
                <span>Joined {new Date(member.createdAt).toLocaleDateString()} · {member.accountStatus}</span>
              </div>
              <div className="admin-actions">
                <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {member.username}</label>
                <select id={`role-${member.id}`} className="field-select role-select" value={member.role} onChange={async (event) => {
                  setBusyId(member.id);
                  try { await onMemberRole(member.id, event.target.value as UserRole); } finally { setBusyId(null); }
                }} disabled={busyId === member.id}>
                  <option value="buyer">Buyer</option><option value="seller">Seller</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
                </select>
                <button className={`button button-small${member.accountStatus === "suspended" ? " button-secondary" : " button-danger"}`} type="button" disabled={busyId === member.id} onClick={async () => {
                  const reason = window.prompt(member.accountStatus === "suspended" ? "Reason for reinstating this account:" : "Reason for suspension:");
                  if (reason === null) return;
                  if (reason.trim().length < 5) {
                    window.alert("Please enter a reason of at least 5 characters.");
                    return;
                  }
                  setBusyId(member.id);
                  try { await onMemberStatus(member.id, member.accountStatus === "suspended" ? "active" : "suspended", reason); } finally { setBusyId(null); }
                }}>{member.accountStatus === "suspended" ? "Reinstate" : "Suspend"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AnnouncementsSection({
  announcements,
  onAnnouncementSave,
  creating,
  onCreate,
  onCloseCreate,
}: Pick<AdminPanelProps, "announcements" | "onAnnouncementSave"> & {
  creating: boolean;
  onCreate: () => void;
  onCloseCreate: () => void;
}) {
  const [editing, setEditing] = useState<Announcement | null>(null);

  return (
    <>
      <div className="panel-heading">
        <div><h2>Community announcements</h2><p className="results-count">Publish, update, or unpublish marketplace notices.</p></div>
        <button type="button" className="button button-small" onClick={onCreate}><Plus size={14} /> New announcement</button>
      </div>
      {announcements.length === 0 ? <EmptyAdmin icon={BellRing} title="No announcements yet" /> : (
        <div className="admin-list">
          {announcements.map((announcement) => (
            <article className="admin-item" key={announcement.id}>
              <div className="admin-details">
                <strong>{announcement.title}</strong><span>{announcement.body}</span>
                <span>{announcement.isPublished ? "Published" : "Draft"}{announcement.publishedAt ? ` · ${new Date(announcement.publishedAt).toLocaleDateString()}` : ""}</span>
              </div>
              <button className="button button-secondary button-small" type="button" onClick={() => setEditing(announcement)}><Pencil size={13} /> Edit</button>
            </article>
          ))}
        </div>
      )}
      {(creating || editing) && (
        <AnnouncementDialog
          announcement={editing}
          onClose={() => { setEditing(null); onCloseCreate(); }}
          onSave={async (item) => {
            await onAnnouncementSave(item);
            setEditing(null);
            onCloseCreate();
          }}
        />
      )}
    </>
  );
}

function AnnouncementDialog({
  announcement,
  onClose,
  onSave,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onSave: (value: { id?: string; title: string; body: string; isPublished: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [isPublished, setIsPublished] = useState(announcement?.isPublished ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({ id: announcement?.id, title, body, isPublished });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The announcement could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={announcement ? "Edit announcement" : "New announcement"} narrow onClose={onClose}>
      {error && <p className="alert" role="alert">{error}</p>}
      <form className="form-grid" onSubmit={submit}>
        <div className="form-field form-field-full"><label htmlFor="announcement-title">Title</label><input id="announcement-title" className="field-input" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={100} /></div>
        <div className="form-field form-field-full"><label htmlFor="announcement-body">Message</label><textarea id="announcement-body" className="field-textarea" value={body} onChange={(event) => setBody(event.target.value)} required minLength={5} maxLength={1000} /></div>
        <label className="filter-check form-field-full"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> Publish now</label>
        <button className="button form-field-full" type="submit" disabled={busy}>{busy ? "Saving…" : "Save announcement"}<Megaphone size={14} /></button>
      </form>
    </Dialog>
  );
}

function EmptyAdmin({ icon: Icon, title }: { icon: typeof FileWarning; title: string }) {
  return <div className="empty-admin"><Icon size={21} /><strong>{title}</strong></div>;
}
