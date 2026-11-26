"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  LogIn,
  Moon,
  Search,
  Shield,
  ShoppingBasket,
  Sun,
  UserRound,
} from "lucide-react";
import type { FormEvent } from "react";
import type { MarketplaceUser } from "@/types";

export type WorkspaceView = "shop" | "seller" | "transactions" | "inbox" | "account" | "staff";

interface SiteHeaderProps {
  user: MarketplaceUser | null;
  view: WorkspaceView;
  query: string;
  savedCount: number;
  cartCount: number;
  theme: "light" | "dark";
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onNavigate: (view: WorkspaceView) => void;
  onShowSaved: () => void;
  onCart: () => void;
  onToggleTheme: () => void;
}

export function SiteHeader({
  user,
  view,
  query,
  savedCount,
  cartCount,
  theme,
  onQueryChange,
  onSearch,
  onNavigate,
  onShowSaved,
  onCart,
  onToggleTheme,
}: SiteHeaderProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  const isStaff = user?.role === "admin" || user?.role === "moderator";

  return (
    <>
      <div className="announcement-bar">
        <Shield size={13} aria-hidden="true" />
        <span><strong>Trade with care.</strong> Keep questions and arrangements on-platform.</span>
      </div>
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" href="/" onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onNavigate("shop");
          }} aria-label="Gary: Merchant of Asphodel home">
            <span className="brand-icon-wrap">
              <Image className="brand-icon" src="/brand-icon.png" alt="" width={52} height={52} priority />
            </span>
            <span className="brand-copy">
              <span className="brand-name">Gary: Merchant of Asphodel</span>
              <span className="brand-kicker">Trading cards, thoughtfully found</span>
            </span>
          </Link>
          <form className="search-form" role="search" onSubmit={submitSearch}>
            <input
              type="search"
              aria-label="Search trading cards"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search cards, sets, or games"
            />
            <button type="submit" className="search-submit" aria-label="Search listings"><Search size={18} /></button>
          </form>
          <div className="header-actions">
            <button type="button" className="header-action" onClick={onShowSaved} aria-label={`Saved items, ${savedCount} saved`}>
              <Heart size={18} />
              <span className="header-action-label">Saved</span>
              {savedCount > 0 && <span className="count-badge">{savedCount}</span>}
            </button>
            <button type="button" className="header-action" onClick={() => onNavigate(user ? "account" : "account")} aria-label={user ? `Account for ${user.username}` : "Sign in or create an account"}>
              {user ? <UserRound size={18} /> : <LogIn size={18} />}
              <span className="header-action-label">{user ? user.username : "Sign in"}</span>
            </button>
            <button type="button" className="header-action" onClick={onCart} aria-label={`Shopping cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
              <ShoppingBasket size={19} />
              <span className="header-action-label">Cart</span>
              {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
            </button>
            <button type="button" className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <div className="nav-inner">
            <div className="nav-links">
              <NavButton label="Discover" target="shop" current={view} onNavigate={onNavigate} />
              <NavButton label="Sell cards" target="seller" current={view} onNavigate={onNavigate} />
              <NavButton label="Transactions" target="transactions" current={view} onNavigate={onNavigate} />
              <NavButton label="Messages" target="inbox" current={view} onNavigate={onNavigate} />
              {isStaff && <NavButton label="Staff desk" target="staff" current={view} onNavigate={onNavigate} />}
            </div>
            <span className="nav-note">{user ? `A good day to trade, ${user.username}.` : "A marketplace for collectors and careful merchants."}</span>
          </div>
        </nav>
      </header>
    </>
  );
}

function NavButton({
  label,
  target,
  current,
  onNavigate,
}: {
  label: string;
  target: WorkspaceView;
  current: WorkspaceView;
  onNavigate: (view: WorkspaceView) => void;
}) {
  const active = current === target || (target === "seller" && current === "seller");
  return (
    <button type="button" className="nav-link" aria-current={active ? "page" : undefined} onClick={() => onNavigate(target)}>
      {label}
    </button>
  );
}

export function SiteFooter({ onNavigate }: { onNavigate: (view: WorkspaceView) => void }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>Gary: Merchant of Asphodel</strong>
          <span>A small, careful corner of the collecting world. Make good trades, ask kind questions, and leave the market better than you found it.</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <button type="button" onClick={() => onNavigate("shop")}>Browse the market</button>
          <button type="button" onClick={() => onNavigate("seller")}>Sell a card</button>
          <button type="button" onClick={() => onNavigate("transactions")}>Transaction history</button>
          <button type="button" onClick={() => onNavigate("inbox")}>Contact a member</button>
        </nav>
      </div>
      <p className="footer-copyright">© 2026 Gary: Merchant of Asphodel · Independent collector marketplace · Payment is arranged directly by members.</p>
    </footer>
  );
}
