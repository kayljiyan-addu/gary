"use client";

import Image from "next/image";
import {
  Bird,
  BookOpen,
  Compass,
  Feather,
  Flame,
  Gem,
  Heart,
  Leaf,
  PackagePlus,
  Shield,
  Sparkles,
  Star,
  Sun,
  TreePine,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { MarketplaceListing } from "@/types";

const artMarks: ComponentType<SVGProps<SVGSVGElement>>[] = [
  Sparkles,
  Gem,
  Leaf,
  Compass,
  Flame,
  BookOpen,
  TreePine,
  Sun,
  Feather,
  Bird,
  Shield,
];

export function ProductArt({ art, label, imageUrl }: { art: number; label: string; imageUrl?: string }) {
  const Mark = artMarks[(art - 1) % artMarks.length] ?? Sparkles;
  const artClass = `product-art art-${((art - 1) % 10) + 1}${imageUrl ? " product-art-photo" : ""}`;

  return (
    <div className={artClass} aria-label={imageUrl ? `Listing photo for ${label}` : `Illustrated placeholder for ${label}`} role="img">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="(max-width: 720px) 50vw, 25vw" />
      ) : (
        <>
          <div className="art-symbol" aria-hidden="true">
            <Mark width={34} height={34} strokeWidth={1.3} />
          </div>
          <span className="art-ribbon" aria-hidden="true">Merchant&apos;s collection</span>
        </>
      )}
    </div>
  );
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ProductCardProps {
  listing: MarketplaceListing;
  isFavorite: boolean;
  isCompared: boolean;
  onOpen: (listing: MarketplaceListing) => void;
  onFavorite: (listingId: string) => void;
  onCompare: (listingId: string) => void;
  onAddToCart: (listing: MarketplaceListing) => void;
}

export function ProductCard({
  listing,
  isFavorite,
  isCompared,
  onOpen,
  onFavorite,
  onCompare,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <button
        type="button"
        className="product-card-hit"
        onClick={() => onOpen(listing)}
        aria-label={`View ${listing.product.name}, ${formatPrice(listing.price)}, ${listing.condition}`}
      >
        <ProductArt art={listing.product.art} label={listing.product.name} imageUrl={listing.imageUrl} />
        <div className="product-card-body">
          <div className="product-card-heading">
            <h3 className="product-name">{listing.product.name}</h3>
          </div>
          <p className="product-subtitle">
            {listing.product.game} · {listing.product.setName}
          </p>
          <div className="product-meta">
            <span>{listing.product.rarity}</span>
            <span>#{listing.product.cardNumber}</span>
            <span>{listing.quantity} available</span>
          </div>
          <div className="price-row">
            <span className="price">{formatPrice(listing.price)}</span>
            <span className="condition-pill">{listing.condition}</span>
          </div>
          <div className="seller-line">
            <Star size={12} fill="currentColor" aria-hidden="true" />
            <span>{listing.seller.username}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.seller.location || "Marketplace seller"}</span>
          </div>
        </div>
      </button>
      <div className="card-actions">
        <label className="compare-check">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => onCompare(listing.id)}
            aria-label={`Compare ${listing.product.name}`}
          />
          Compare
        </label>
        <div className="card-actions-right">
          <button
            type="button"
            className="favorite-button"
            aria-label={isFavorite ? `Remove ${listing.product.name} from saved items` : `Save ${listing.product.name}`}
            aria-pressed={isFavorite}
            onClick={() => onFavorite(listing.id)}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            className="button button-small"
            onClick={() => onAddToCart(listing)}
            disabled={listing.status !== "active" || listing.quantity < 1}
          >
            <PackagePlus size={14} aria-hidden="true" />
            Add
          </button>
        </div>
      </div>
    </article>
  );
}
