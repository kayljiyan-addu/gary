"use client";

import { AlertCircle, ArrowDownWideNarrow, Filter, Megaphone, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Announcement, ListingFilters, MarketplaceListing } from "@/types";

interface CatalogViewProps {
  listings: MarketplaceListing[];
  filters: ListingFilters;
  savedIds: string[];
  savedOnly: boolean;
  compareIds: string[];
  loading: boolean;
  error: string | null;
  announcement?: Announcement;
  onFilterChange: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
  onClearFilters: () => void;
  onToggleSavedOnly: () => void;
  onOpenListing: (listing: MarketplaceListing) => void;
  onFavorite: (listingId: string) => void;
  onCompare: (listingId: string) => void;
  onAddToCart: (listing: MarketplaceListing) => void;
  onBecomeSeller: () => void;
  onOpenCompare: () => void;
}

export function CatalogView({
  listings,
  filters,
  savedIds,
  savedOnly,
  compareIds,
  loading,
  error,
  announcement,
  onFilterChange,
  onClearFilters,
  onToggleSavedOnly,
  onOpenListing,
  onFavorite,
  onCompare,
  onAddToCart,
  onBecomeSeller,
  onOpenCompare,
}: CatalogViewProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const games = useMemo(() => [...new Set(listings.map((listing) => listing.product.game))].sort(), [listings]);
  const sets = useMemo(() => [...new Set(listings.filter((listing) => !filters.game || listing.product.game === filters.game).map((listing) => listing.product.setName))].sort(), [filters.game, listings]);
  const filteredListings = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const filtered = listings.filter((listing) => {
      if (listing.status !== "active" || listing.quantity <= 0) return false;
      if (savedOnly && !savedIds.includes(listing.id)) return false;
      if (filters.game && listing.product.game !== filters.game) return false;
      if (filters.setName && listing.product.setName !== filters.setName) return false;
      if (filters.condition && listing.condition !== filters.condition) return false;
      if (filters.rarity && listing.product.rarity !== filters.rarity) return false;
      if (filters.minPrice && listing.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && listing.price > Number(filters.maxPrice)) return false;
      if (query) {
        const searchable = [
          listing.product.name,
          listing.product.game,
          listing.product.setName,
          listing.product.cardNumber,
          listing.product.rarity,
          listing.product.productType,
          listing.seller.username,
        ].join(" ").toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });

    return filtered.sort((left, right) => {
      if (filters.sort === "price-low") return left.price - right.price;
      if (filters.sort === "price-high") return right.price - left.price;
      return new Date(right.listedAt).getTime() - new Date(left.listedAt).getTime();
    });
  }, [filters, listings, savedIds, savedOnly]);

  const filterCount = [filters.game, filters.setName, filters.condition, filters.rarity, filters.minPrice, filters.maxPrice].filter(Boolean).length;

  return (
    <>
      <section className="hero-panel" aria-labelledby="marketplace-title">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={13} /> The collector&apos;s crossing</p>
          <h1 className="hero-title" id="marketplace-title">Every card has a story. Find its next chapter.</h1>
          <p className="hero-description">Discover carefully listed trading cards, compare condition and price, then arrange a thoughtful handoff with the collector behind it.</p>
          <div className="hero-actions">
            <button type="button" className="button" onClick={() => document.getElementById("market-listings")?.scrollIntoView({ behavior: "smooth" })}>Explore the market</button>
            <button type="button" className="button button-secondary" onClick={onBecomeSeller}>Sell your cards</button>
          </div>
        </div>
        <div className="hero-aside" aria-hidden="true">
          <Sparkles className="hero-star hero-star-one" size={17} />
          <div className="hero-medallion"><Sparkles size={34} strokeWidth={1.2} /></div>
          <Sparkles className="hero-star hero-star-two" size={13} />
        </div>
      </section>

      {announcement?.isPublished && (
        <aside className="community-note">
          <Megaphone size={15} aria-hidden="true" />
          <strong>{announcement.title}</strong>
          <span>{announcement.body}</span>
        </aside>
      )}

      <div className="catalog-layout" id="market-listings">
        <aside className={`filter-panel${mobileFiltersOpen ? " is-open" : ""}`} aria-label="Filter products">
          <div className="filter-heading">
            <h2><SlidersHorizontal size={15} /> Refine</h2>
            <button type="button" className="text-button" onClick={onClearFilters}>Clear</button>
          </div>
          <FilterSelect label="Trading card game" value={filters.game} onChange={(value) => { onFilterChange("game", value); onFilterChange("setName", ""); }} options={games} placeholder="All games" />
          <FilterSelect label="Set / collection" value={filters.setName} onChange={(value) => onFilterChange("setName", value)} options={sets} placeholder="All sets" />
          <FilterSelect label="Condition" value={filters.condition} onChange={(value) => onFilterChange("condition", value)} options={["Near Mint", "Lightly Played", "Moderately Played", "Heavily Played"]} placeholder="Any condition" />
          <FilterSelect label="Rarity" value={filters.rarity} onChange={(value) => onFilterChange("rarity", value)} options={["Common", "Uncommon", "Rare", "Mythic"]} placeholder="Any rarity" />
          <div className="filter-group">
            <p className="filter-group-title">Price range · PHP</p>
            <div className="price-range">
              <input className="field-input" type="number" min="0" aria-label="Minimum price" placeholder="Min" value={filters.minPrice} onChange={(event) => onFilterChange("minPrice", event.target.value)} />
              <span>to</span>
              <input className="field-input" type="number" min="0" aria-label="Maximum price" placeholder="Max" value={filters.maxPrice} onChange={(event) => onFilterChange("maxPrice", event.target.value)} />
            </div>
          </div>
        </aside>

        <section className="catalog-main" aria-labelledby="catalog-heading">
          <div className="catalog-toolbar">
            <div>
              <p className="eyebrow">{savedOnly ? "Saved collection" : "Find your next favorite"}</p>
              <h2 className="section-title" id="catalog-heading">{savedOnly ? "Your saved cards" : "Browse the market"}</h2>
              <p className="results-count" aria-live="polite">
                {loading ? "Gathering the latest listings…" : `${filteredListings.length} listing${filteredListings.length === 1 ? "" : "s"}${filterCount ? ` · ${filterCount} filter${filterCount === 1 ? "" : "s"} applied` : ""}`}
                {savedOnly ? ` · ${savedIds.length} saved` : ""}
              </p>
            </div>
            <div className="toolbar-controls">
              <button type="button" className="button button-secondary mobile-filter-button" onClick={() => setMobileFiltersOpen((open) => !open)} aria-expanded={mobileFiltersOpen}>
                <Filter size={13} /> Filters{filterCount > 0 ? ` (${filterCount})` : ""}
              </button>
              {compareIds.length > 0 && (
                <button type="button" className="compare-counter" onClick={onOpenCompare} disabled={compareIds.length < 2} aria-label={`Compare ${compareIds.length} selected listings`}>
                  <ArrowDownWideNarrow size={13} /> Compare {compareIds.length}
                </button>
              )}
              <label className="sort-label" htmlFor="sort-listings">
                <span>Sort</span>
                <select id="sort-listings" value={filters.sort} onChange={(event) => onFilterChange("sort", event.target.value as ListingFilters["sort"])}>
                  <option value="recent">Recently listed</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
              {savedOnly && <button type="button" className="button button-quiet button-small" onClick={onToggleSavedOnly}><RotateCcw size={12} /> All listings</button>}
            </div>
          </div>

          {error && <p className="alert" role="alert"><AlertCircle size={15} />{error}</p>}
          {loading ? (
            <div className="loading-state"><div className="spinner" role="status" aria-label="Loading listings" /></div>
          ) : filteredListings.length === 0 ? (
            <div className="empty-state" role="status">
              <span className="empty-state-icon"><Sparkles size={24} /></span>
              <h3>{savedOnly && savedIds.length === 0 ? "Your saved shelf is empty" : "No cards found"}</h3>
              <p>{savedOnly ? "Tap the heart on a listing to keep it close for later." : "Try a different search, broaden your filters, or check back when new cards arrive."}</p>
              <button type="button" className="button button-secondary button-small" onClick={onClearFilters}>Clear filters</button>
            </div>
          ) : (
            <div className="product-grid">
              {filteredListings.map((listing) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  isFavorite={savedIds.includes(listing.id)}
                  isCompared={compareIds.includes(listing.id)}
                  onOpen={onOpenListing}
                  onFavorite={onFavorite}
                  onCompare={onCompare}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  const id = `filter-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="filter-group">
      <label className="filter-group-title" htmlFor={id}>{label}</label>
      <select id={id} className="filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
