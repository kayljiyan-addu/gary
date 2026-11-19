# GARY — Merchant of Asphodel

A frontend-only prototype for a local trading card marketplace. The visual direction uses an original dark, antique-inspired palette with a custom head emblem and vector hero illustration. The attached card artwork is not reused.

## Run locally

```powershell
cd prototype
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Prototype flows

- Discover, search, filter, sort, and inspect local card listings.
- Add listings to a cart and submit a purchase request with meetup or delivery preference.
- Track and cancel eligible purchase requests.
- Create and edit listings, remove listings while preserving order history, mark them sold, message sellers, and report a listing.
- Confirm reports, listing removal or sale, request cancellations, and purchase requests in accessible modal dialogs.

All actions update in-memory frontend state only. Refreshing resets the demo data. There is no real authentication, messaging service, payment processing, or delivery integration.

## Domain-shaped mock data

`src/data/mock-data.ts` keeps the diagram's entities in separate collections: `User`, `Profile`, `TCG`, `Set`, `Product`, `Listing`, `ListingImage`, `Rating`, `Message`, `Report`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Transaction`, and `Fulfillment`. Relationship IDs link the records rather than flattening them into UI-specific product objects.

Seed listings use externally hosted images of real card prints from Scryfall, Pokémon TCG API, YGOPRODeck, and Limitless TCG. These images require an internet connection; user-created listings keep the built-in artwork fallback.

The demo `User.password` values are intentionally blank and are not used by the frontend. Never place real credentials in client-side data.
