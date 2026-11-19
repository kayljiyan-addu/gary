"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  CURRENT_PROFILE_ID,
  initialMarketplaceData,
  type CartItem,
  type Fulfillment,
  type Listing,
  type Message,
  type Order,
  type OrderItem,
  type Product,
  type Report,
  type Transaction,
} from "@/data/mock-data";

type Section = "discover" | "listings" | "messages" | "orders";
type Confirmation =
  | { action: "remove-listing"; listingID: string; subject: string }
  | { action: "mark-sold"; listingID: string; subject: string }
  | { action: "report-listing"; listingID: string; subject: string }
  | { action: "cancel-order"; orderID: string; subject: string }
  | { action: "submit-purchase" };
type IconName = "search" | "bag" | "message" | "grid" | "plus" | "arrow" | "star" | "close" | "pin" | "clock" | "spark" | "edit" | "trash";

const iconShapes: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  bag: (
    <>
      <path d="M4 8.5h16l-1.2 12H5.2L4 8.5Z" />
      <path d="M8 8.5V6a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  message: (
    <>
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.1-3.1A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  pin: (
    <>
      <path d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  spark: (
    <>
      <path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </>
  ),
  edit: (
    <>
      <path d="m14 5 5 5M4 20l4.8-1 10.1-10.1a2.1 2.1 0 0 0-3-3L5.8 16 4 20Z" />
      <path d="M13 20h7" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </>
  ),
};

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconShapes[name]}
    </svg>
  );
}

function CollectorMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M32 9C22.5 9 16.8 16.5 16.8 27.1v5.5c0 7.3 4.1 13.3 10.1 15.8v4.3l-8.6 4.4v2h27.4v-2l-8.6-4.4v-4.3c6-2.5 10.1-8.5 10.1-15.8v-5.5C47.2 16.5 41.5 9 32 9Z" fill="currentColor" fillOpacity="0.08" />
      <circle cx="25" cy="31.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="39" cy="31.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M27.5 40c2.6 1.8 6.4 1.8 9 0M13 60h38" />
    </svg>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(price);
}

function makeID(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getDisplayName(profile?: { firstName: string; lastName: string }) {
  return profile ? `${profile.firstName} ${profile.lastName}` : "Marketplace seller";
}

function CardArtwork({ tcgID, cardNumber, imageURL }: { tcgID: string; cardNumber: string; imageURL?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasCardImage = Boolean(
    imageURL && (imageURL.startsWith("https://") || imageURL.startsWith("data:image/")) && !imageFailed,
  );

  return (
    <div className={`card-art card-art--${tcgID.replace("tcg-", "")}${hasCardImage ? " card-art--photo" : ""}`} aria-hidden="true">
      {hasCardImage && imageURL ? (
        <Image
          className="card-art__image"
          src={imageURL}
          alt=""
          fill
          sizes="(max-width: 620px) 140px, (max-width: 1024px) 240px, 360px"
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <div className="card-art__grain" />
          <div className="card-art__topline">
            <span>GARY / FIELD NOTES</span>
            <span>{cardNumber}</span>
          </div>
          <svg className="card-art__sigil" viewBox="0 0 240 200" fill="none">
            <circle cx="120" cy="100" r="62" />
            <circle cx="120" cy="100" r="47" />
            <path d="M120 16 133 72l54-26-26 54 63 13-63 13 26 54-54-26-13 62-13-62-54 26 26-54-63-13 63-13-26-54 54 26 13-56Z" />
            <path d="M120 56 132 88l32 12-32 12-12 32-12-32-32-12 32-12 12-32Z" />
            <path d="M43 166h154M58 179h124" />
          </svg>
          <span className="card-art__seal">G</span>
          <span className="card-art__caption">A collector&apos;s find</span>
        </>
      )}
    </div>
  );
}

export default function MarketplacePrototype() {
  const [marketData, setMarketData] = useState(initialMarketplaceData);
  const [section, setSection] = useState<Section>("discover");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGame, setSelectedGame] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [selectedListingID, setSelectedListingID] = useState<string | null>(null);
  const [cartIsOpen, setCartIsOpen] = useState(false);
  const [dialog, setDialog] = useState<"listing" | "purchase" | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState("Meetup");
  const [formGameID, setFormGameID] = useState("tcg-mtg");
  const [editingListingID, setEditingListingID] = useState<string | null>(null);
  const [listingImagePreview, setListingImagePreview] = useState<string | null>(null);
  const [listingImageName, setListingImageName] = useState("");
  const [activeConversationID, setActiveConversationID] = useState("profile-vale");
  const [messageDraft, setMessageDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const currentProfile = marketData.profiles.find((profile) => profile.profileID === CURRENT_PROFILE_ID);
  const currentCart = marketData.carts.find((cart) => cart.profileID === CURRENT_PROFILE_ID);
  const cartItems = marketData.cartItems.filter((item) => item.cartID === currentCart?.cartID);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const getListingImageURL = (listingID: string) =>
    marketData.listingImages.find((image) => image.listingID === listingID)?.imageURL;
  const editingListing = editingListingID
    ? marketData.listings.find((listing) => listing.listingID === editingListingID)
    : undefined;
  const editingProduct = editingListing
    ? marketData.products.find((product) => product.productID === editingListing.productID)
    : undefined;

  const listingCards = useMemo(() => {
    const cards = marketData.listings.flatMap((listing) => {
      const product = marketData.products.find((item) => item.productID === listing.productID);
      const game = product && marketData.tcgs.find((item) => item.tcgID === product.tcgID);
      const set = product && marketData.sets.find((item) => item.setID === product.setID);
      const seller = marketData.profiles.find((item) => item.profileID === listing.profileID);
      if (!product || !game || !set || !seller) return [];
      const ratings = marketData.ratings.filter((rating) => rating.profileID === seller.profileID);
      const averageRating = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating.starRating, 0) / ratings.length
        : 0;
      return [{ listing, product, game, set, seller, averageRating, ratingCount: ratings.length }];
    });

    return cards
      .filter(({ listing, product, game, seller }) => {
        if (listing.availabilityStatus !== "Available") return false;
        if (selectedGame !== "all" && game.tcgID !== selectedGame) return false;
        if (selectedCondition !== "all" && product.condition !== selectedCondition) return false;
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return [
          product.productName,
          product.cardNumber,
          product.rarity,
          game.name,
          seller.firstName,
          seller.lastName,
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (sortMode === "price-low") return a.listing.price - b.listing.price;
        if (sortMode === "price-high") return b.listing.price - a.listing.price;
        return b.listing.listingDate.localeCompare(a.listing.listingDate);
      });
  }, [marketData, searchTerm, selectedCondition, selectedGame, sortMode]);

  const selectedCard = selectedListingID
    ? listingCards.find((card) => card.listing.listingID === selectedListingID) ??
      marketData.listings.flatMap((listing) => {
        const product = marketData.products.find((item) => item.productID === listing.productID);
        const game = product && marketData.tcgs.find((item) => item.tcgID === product.tcgID);
        const set = product && marketData.sets.find((item) => item.setID === product.setID);
        const seller = marketData.profiles.find((item) => item.profileID === listing.profileID);
        if (!product || !game || !set || !seller) return [];
        return [{ listing, product, game, set, seller, averageRating: 0, ratingCount: 0 }];
      }).find((card) => card.listing.listingID === selectedListingID)
    : undefined;

  const conversationProfiles = marketData.profiles.filter((profile) => profile.profileID !== CURRENT_PROFILE_ID);
  const conversationMessages = marketData.messages
    .filter((message) =>
      (message.senderProfileID === CURRENT_PROFILE_ID && message.recipientProfileID === activeConversationID) ||
      (message.senderProfileID === activeConversationID && message.recipientProfileID === CURRENT_PROFILE_ID),
    )
    .sort((a, b) => a.sentTimestamp.localeCompare(b.sentTimestamp));

  const showToast = (message: string) => setToast(message);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedListingID && !dialog && !cartIsOpen && !confirmation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmation) {
          setConfirmation(null);
        } else {
          setSelectedListingID(null);
          setDialog(null);
          setCartIsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cartIsOpen, confirmation, dialog, selectedListingID]);

  const updateCart = (nextItems: CartItem[]) => {
    const nextTotal = nextItems.reduce((sum, item) => {
      const listing = marketData.listings.find((entry) => entry.listingID === item.listingID);
      return sum + (listing?.price ?? 0) * item.quantity;
    }, 0);
    const now = new Date().toISOString();
    setMarketData((current) => ({
      ...current,
      cartItems: [
        ...current.cartItems.filter((item) => item.cartID !== currentCart?.cartID),
        ...nextItems,
      ],
      carts: current.carts.map((cart) =>
        cart.cartID === currentCart?.cartID
          ? { ...cart, lastUpdated: now, total: nextTotal }
          : cart,
      ),
    }));
  };

  const addToCart = (listing: Listing) => {
    if (!currentCart || listing.availabilityStatus !== "Available" || listing.quantity < 1) {
      showToast("This listing is no longer available.");
      return;
    }
    const existing = cartItems.find((item) => item.listingID === listing.listingID);
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > listing.quantity) {
      showToast("The seller does not have another copy available.");
      return;
    }
    const nextItems = existing
      ? cartItems.map((item) =>
          item.cartItemID === existing.cartItemID
            ? { ...item, quantity: nextQuantity, subtotal: nextQuantity * listing.price }
            : item,
        )
      : [
          ...cartItems,
          {
            cartItemID: makeID("cart-item"),
            cartID: currentCart.cartID,
            listingID: listing.listingID,
            quantity: 1,
            subtotal: listing.price,
          },
        ];
    updateCart(nextItems);
    showToast("Added to your cart.");
  };

  const removeFromCart = (cartItemID: string) => {
    updateCart(cartItems.filter((item) => item.cartItemID !== cartItemID));
  };

  const submitPurchaseRequest = () => {
    if (!currentCart || cartItems.length === 0) return;
    const unavailableItem = cartItems.find((item) => {
      const listing = marketData.listings.find((entry) => entry.listingID === item.listingID);
      return !listing || listing.availabilityStatus !== "Available" || item.quantity > listing.quantity;
    });
    if (unavailableItem) {
      showToast("A listing changed availability. Review your cart before continuing.");
      setDialog(null);
      setCartIsOpen(true);
      return;
    }

    const now = new Date().toISOString();
    const orderID = makeID("order");
    const transactionID = makeID("transaction");
    const orderTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const order: Order = {
      orderID,
      profileID: CURRENT_PROFILE_ID,
      orderDate: now.slice(0, 10),
      orderStatus: "Awaiting seller confirmation",
      totalAmount: orderTotal,
      cancellationStatus: "Eligible",
    };
    const orderItems: OrderItem[] = cartItems.map((item) => {
      const listing = marketData.listings.find((entry) => entry.listingID === item.listingID)!;
      return {
        orderItemID: makeID("order-item"),
        orderID,
        listingID: item.listingID,
        quantity: item.quantity,
        unitPrice: listing.price,
        subtotal: listing.price * item.quantity,
      };
    });
    const transaction: Transaction = {
      transactionID,
      orderID,
      paymentStatus: "Not processed",
      transactionStatus: "Pending seller confirmation",
      transactionTimestamp: now,
    };
    const fulfillment: Fulfillment = {
      fulfillmentID: makeID("fulfillment"),
      transactionID,
      fulfillmentMethod,
      fulfillmentStatus: "To be arranged",
      expectedDate: "",
      fulfillmentDate: "",
      fulfillmentDetails: fulfillmentMethod === "Meetup" ? "Coordinate a public meetup with the seller." : "Delivery details to be confirmed with the seller.",
    };

    setMarketData((current) => ({
      ...current,
      orders: [order, ...current.orders],
      orderItems: [...orderItems, ...current.orderItems],
      transactions: [transaction, ...current.transactions],
      fulfillments: [fulfillment, ...current.fulfillments],
      listings: current.listings.map((listing) => {
        const orderedItem = cartItems.find((item) => item.listingID === listing.listingID);
        if (!orderedItem) return listing;
        const quantity = listing.quantity - orderedItem.quantity;
        return {
          ...listing,
          quantity,
          availabilityStatus: quantity === 0 ? "Sold" : listing.availabilityStatus,
        };
      }),
      cartItems: current.cartItems.filter((item) => item.cartID !== currentCart.cartID),
      carts: current.carts.map((cart) =>
        cart.cartID === currentCart.cartID ? { ...cart, total: 0, lastUpdated: now } : cart,
      ),
    }));
    setDialog(null);
    setCartIsOpen(false);
    setSection("orders");
    showToast("Purchase request sent. No payment has been processed.");
  };

  const cancelOrder = (order: Order) => {
    if (order.cancellationStatus !== "Eligible") return;
    const now = new Date().toISOString();
    const relatedItems = marketData.orderItems.filter((item) => item.orderID === order.orderID);
    const transaction = marketData.transactions.find((item) => item.orderID === order.orderID);
    setMarketData((current) => ({
      ...current,
      orders: current.orders.map((item) =>
        item.orderID === order.orderID
          ? { ...item, orderStatus: "Cancelled", cancellationStatus: "Cancelled" }
          : item,
      ),
      transactions: current.transactions.map((item) =>
        item.orderID === order.orderID
          ? { ...item, transactionStatus: "Cancelled", transactionTimestamp: now }
          : item,
      ),
      listings: current.listings.map((listing) => {
        const relatedItem = relatedItems.find((item) => item.listingID === listing.listingID);
        if (!relatedItem || listing.availabilityStatus === "Removed") return listing;
        return {
          ...listing,
          quantity: listing.quantity + relatedItem.quantity,
          availabilityStatus: "Available",
        };
      }),
      fulfillments: current.fulfillments.map((item) =>
        item.transactionID === transaction?.transactionID
          ? { ...item, fulfillmentStatus: "Cancelled" }
          : item,
      ),
    }));
    showToast("Purchase request cancelled.");
  };

  const handleCreateListing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProfile) return;
    const formData = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const listingID = editingListing?.listingID ?? makeID("listing");
    const productID = editingProduct?.productID ?? makeID("product");
    const setID = String(formData.get("setID") ?? "");
    const product: Product = {
      productID,
      tcgID: formGameID,
      setID,
      productName: String(formData.get("productName") ?? "").trim(),
      cardNumber: String(formData.get("cardNumber") ?? "").trim(),
      rarity: String(formData.get("rarity") ?? "").trim(),
      condition: String(formData.get("condition") ?? "Near Mint") as Product["condition"],
      language: String(formData.get("language") ?? "English"),
      description: String(formData.get("description") ?? "").trim(),
    };
    const quantity = Math.max(1, Number(formData.get("quantity")) || 1);
    const price = Math.max(1, Number(formData.get("price")) || 1);
    const cartQuantity = editingListing
      ? cartItems.find((item) => item.listingID === editingListing.listingID)?.quantity ?? 0
      : 0;
    const hasPendingPurchase = editingListing
      ? marketData.orderItems.some((item) =>
          item.listingID === editingListing.listingID &&
          marketData.orders.some((order) => order.orderID === item.orderID && order.cancellationStatus === "Eligible"),
        )
      : false;
    if (hasPendingPurchase) {
      showToast("This listing cannot be edited while a purchase request is pending.");
      return;
    }
    if (quantity < cartQuantity) {
      showToast(`At least ${cartQuantity} copy${cartQuantity === 1 ? "" : "ies"} are already in your cart.`);
      return;
    }
    const listing: Listing = {
      ...(editingListing ?? {
        listingID,
        productID,
        profileID: CURRENT_PROFILE_ID,
        listingDate: now.slice(0, 10),
        availabilityStatus: "Available" as const,
      }),
      quantity,
      price,
    };
    const image = {
      imageID: marketData.listingImages.find((entry) => entry.listingID === listingID)?.imageID ?? makeID("image"),
      listingID,
      imageURL: listingImagePreview ?? `mock://${listingID}`,
      description: listingImageName || "No card photo uploaded.",
    };
    setMarketData((current) => ({
      ...current,
      products: editingProduct
        ? current.products.map((entry) => entry.productID === productID ? product : entry)
        : [product, ...current.products],
      listings: editingListing
        ? current.listings.map((entry) => entry.listingID === listingID ? listing : entry)
        : [listing, ...current.listings],
      listingImages: current.listingImages.some((entry) => entry.listingID === listingID)
        ? current.listingImages.map((entry) => entry.listingID === listingID ? image : entry)
        : [image, ...current.listingImages],
      cartItems: current.cartItems.map((item) =>
        item.listingID === listingID ? { ...item, subtotal: price * item.quantity } : item,
      ),
      carts: current.carts.map((cart) => ({
        ...cart,
        total: current.cartItems
          .filter((item) => item.cartID === cart.cartID)
          .reduce((sum, item) => {
            const itemPrice = item.listingID === listingID
              ? price
              : current.listings.find((entry) => entry.listingID === item.listingID)?.price ?? 0;
            return sum + itemPrice * item.quantity;
          }, 0),
        lastUpdated: now,
      })),
    }));
    setListingImagePreview(null);
    setListingImageName("");
    setEditingListingID(null);
    setDialog(null);
    if (!editingListing) setSection("listings");
    showToast(editingListing ? "Listing updated." : "Your listing is now in the marketplace prototype.");
  };

  const openCreateListing = () => {
    setEditingListingID(null);
    setFormGameID(marketData.tcgs[0]?.tcgID ?? "tcg-mtg");
    setListingImagePreview(null);
    setListingImageName("");
    setDialog("listing");
  };

  const openEditListing = (listing: Listing) => {
    const product = marketData.products.find((entry) => entry.productID === listing.productID);
    if (!product || listing.profileID !== CURRENT_PROFILE_ID || listing.availabilityStatus !== "Available") return;
    const hasPendingPurchase = marketData.orderItems.some((item) =>
      item.listingID === listing.listingID &&
      marketData.orders.some((order) => order.orderID === item.orderID && order.cancellationStatus === "Eligible"),
    );
    if (hasPendingPurchase) {
      showToast("This listing cannot be edited while a purchase request is pending.");
      return;
    }
    const image = marketData.listingImages.find((entry) => entry.listingID === listing.listingID);
    setEditingListingID(listing.listingID);
    setFormGameID(product.tcgID);
    setListingImagePreview(
      image?.imageURL.startsWith("https://") || image?.imageURL.startsWith("data:image/")
        ? image.imageURL
        : null,
    );
    setListingImageName(image?.description ?? "");
    setDialog("listing");
  };

  const removeListing = (listing: Listing) => {
    if (listing.profileID !== CURRENT_PROFILE_ID || listing.availabilityStatus === "Removed") return;
    const hasPendingPurchase = marketData.orderItems.some((item) =>
      item.listingID === listing.listingID &&
      marketData.orders.some((order) => order.orderID === item.orderID && order.cancellationStatus === "Eligible"),
    );
    if (hasPendingPurchase) {
      showToast("This listing cannot be removed while a purchase request is pending.");
      return;
    }
    const now = new Date().toISOString();
    const remainingCartItems = marketData.cartItems.filter((item) => item.listingID !== listing.listingID);
    setMarketData((current) => ({
      ...current,
      listings: current.listings.map((entry) =>
        entry.listingID === listing.listingID
          ? { ...entry, availabilityStatus: "Removed", quantity: 0 }
          : entry,
      ),
      cartItems: remainingCartItems,
      carts: current.carts.map((cart) => ({
        ...cart,
        total: remainingCartItems
          .filter((item) => item.cartID === cart.cartID)
          .reduce((sum, item) => sum + item.subtotal, 0),
        lastUpdated: now,
      })),
    }));
    showToast("Listing removed.");
  };

  const handleListingImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file to preview.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("Choose an image smaller than 8 MB.");
      event.currentTarget.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showToast("Could not read that image. Please try another file.");
        return;
      }
      setListingImagePreview(reader.result);
      setListingImageName(file.name);
    };
    reader.onerror = () => showToast("Could not read that image. Please try another file.");
    reader.readAsDataURL(file);
  };

  const markListingSold = (listing: Listing) => {
    const hasPendingPurchase = marketData.orderItems.some((item) =>
      item.listingID === listing.listingID &&
      marketData.orders.some((order) => order.orderID === item.orderID && order.cancellationStatus === "Eligible"),
    );
    if (hasPendingPurchase) {
      showToast("This listing cannot be marked sold while a purchase request is pending.");
      return;
    }
    setMarketData((current) => ({
      ...current,
      listings: current.listings.map((item) =>
        item.listingID === listing.listingID
          ? { ...item, availabilityStatus: "Sold", quantity: 0 }
          : item,
      ),
    }));
    showToast("Listing marked as sold.");
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!content) return;
    const message: Message = {
      messageID: makeID("message"),
      senderProfileID: CURRENT_PROFILE_ID,
      recipientProfileID: activeConversationID,
      messageContent: content,
      sentTimestamp: new Date().toISOString(),
    };
    setMarketData((current) => ({ ...current, messages: [...current.messages, message] }));
    setMessageDraft("");
  };

  const submitListingReport = (listing: Listing) => {
    const report: Report = {
      reportID: makeID("report"),
      reporterProfileID: CURRENT_PROFILE_ID,
      listingID: listing.listingID,
      reason: "Listing needs review",
      description: "Submitted from the frontend prototype.",
      reportDate: new Date().toISOString().slice(0, 10),
      reportStatus: "Submitted",
    };
    setMarketData((current) => ({ ...current, reports: [report, ...current.reports] }));
    setSelectedListingID(null);
    showToast("Listing report submitted for review.");
  };

  const confirmPendingAction = () => {
    if (!confirmation) return;
    const pendingAction = confirmation;
    setConfirmation(null);

    switch (pendingAction.action) {
      case "remove-listing": {
        const listing = marketData.listings.find((item) => item.listingID === pendingAction.listingID);
        if (listing) removeListing(listing);
        break;
      }
      case "mark-sold": {
        const listing = marketData.listings.find((item) => item.listingID === pendingAction.listingID);
        if (listing) markListingSold(listing);
        break;
      }
      case "report-listing": {
        const listing = marketData.listings.find((item) => item.listingID === pendingAction.listingID);
        if (listing) submitListingReport(listing);
        break;
      }
      case "cancel-order": {
        const order = marketData.orders.find((item) => item.orderID === pendingAction.orderID);
        if (order) cancelOrder(order);
        break;
      }
      case "submit-purchase":
        submitPurchaseRequest();
        break;
    }
  };

  const renderListingCard = (card: (typeof listingCards)[number]) => {
    const { listing, product, game, set, seller, averageRating, ratingCount } = card;
    return (
      <article className="product-card" key={listing.listingID}>
        <button
          className="product-card__art-button"
          type="button"
          onClick={() => setSelectedListingID(listing.listingID)}
          aria-label={`View ${product.productName} listing`}
        >
          <CardArtwork tcgID={game.tcgID} cardNumber={product.cardNumber} imageURL={getListingImageURL(listing.listingID)} />
          <span className="game-stamp">{game.name}</span>
          <span className="art-open-label">View card</span>
        </button>
        <div className="product-card__body">
          <div className="product-card__meta">
            <span>{set.setCode}</span>
            <span>{product.condition}</span>
          </div>
          <button
            className="product-card__title"
            type="button"
            onClick={() => setSelectedListingID(listing.listingID)}
          >
            {product.productName}
          </button>
          <p className="product-card__edition">{product.rarity} <span>·</span> {product.cardNumber}</p>
          <div className="product-card__seller">
            <span className="seller-mark">{seller.firstName.slice(0, 1)}{seller.lastName.slice(0, 1)}</span>
            <span className="seller-name">{getDisplayName(seller)}</span>
            <span className="seller-rating">
              <Icon name="star" size={13} />
              {averageRating ? averageRating.toFixed(1) : "New"}
              {ratingCount > 0 && <span className="rating-count">({ratingCount})</span>}
            </span>
          </div>
          <div className="product-card__footer">
            <div>
              <span className="price-label">Asking price</span>
              <strong>{formatPrice(listing.price)}</strong>
            </div>
            <button className="icon-button add-to-cart" type="button" onClick={() => addToCart(listing)} aria-label={`Add ${product.productName} to cart`}>
              <Icon name="bag" size={17} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient--left" aria-hidden="true" />
      <div className="ambient ambient--right" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("discover"); }} aria-label="GARY Marketplace home">
          <span className="brand__seal" aria-hidden="true"><Image src="/icon.png" alt="" width={28} height={28} /></span>
          <span className="brand__copy">
            <strong>GARY</strong>
            <small>MERCHANT OF ASPHODEL</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={section === "discover" ? "nav-link is-active" : "nav-link"} type="button" onClick={() => setSection("discover")}>Discover</button>
          <button className={section === "listings" ? "nav-link is-active" : "nav-link"} type="button" onClick={() => setSection("listings")}>My listings</button>
          <button className={section === "messages" ? "nav-link is-active" : "nav-link"} type="button" onClick={() => setSection("messages")}>Messages</button>
          <button className={section === "orders" ? "nav-link is-active" : "nav-link"} type="button" onClick={() => setSection("orders")}>Orders</button>
        </nav>
        <div className="topbar__actions">
          <button className="topbar-sell" type="button" onClick={openCreateListing}>
            <Icon name="plus" size={16} />
            <span>Sell a card</span>
          </button>
          <button className="cart-button" type="button" onClick={() => setCartIsOpen(true)} aria-label={`Open cart, ${cartCount} items`}>
            <Icon name="bag" size={19} />
            <span className="cart-button__label">Cart</span>
            <span className="cart-count">{cartCount}</span>
          </button>
          <button className="profile-button" type="button" onClick={() => setSection("listings")} aria-label="Open your seller profile">
            <span>KS</span>
          </button>
        </div>
      </header>

      <main className="page-main">
        {section === "discover" && (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line" /> A LOCAL MARKET FOR COLLECTORS</div>
                <h1>Find the cards<br />that make your <em>story.</em></h1>
                <p className="hero-description">A thoughtful marketplace for trading, collecting, and finding the one card your deck has been missing.</p>
                <div className="hero-actions">
                  <button className="button button--gold" type="button" onClick={() => document.getElementById("market-grid")?.scrollIntoView({ behavior: "smooth" })}>
                    Explore the market <Icon name="arrow" size={16} />
                  </button>
                  <span className="hero-note"><Icon name="pin" size={15} /> Made for local trades</span>
                </div>
                <div className="hero-proof">
                  <span><strong>4</strong> card games</span>
                  <span className="proof-divider" />
                  <span><strong>Local</strong> collector community</span>
                </div>
              </div>
              <div className="hero-illustration" aria-hidden="true">
                <div className="hero-orbit hero-orbit--one" />
                <div className="hero-orbit hero-orbit--two" />
                <div className="hero-moon" />
                <div className="hero-card-back">
                  <Image
                    className="hero-card-back__image"
                    src="/display.png"
                    alt=""
                    fill
                    sizes="(max-width: 620px) 150px, 230px"
                    priority
                  />
                </div>
                <span className="hero-coin hero-coin--one" />
                <span className="hero-coin hero-coin--two" />
                <span className="hero-illustration-caption">Trade with intention</span>
              </div>
              <div className="hero-bottom-line" />
            </section>

            <section className="market-section" id="market-grid">
              <div className="section-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> THE MARKETPLACE</div>
                  <h2>Find your next <em>favorite.</em></h2>
                </div>
                <p className="section-side-note">Good finds, fair trades, and collectors who care.</p>
              </div>
              <div className="market-toolbar">
                <div className="game-tabs" role="group" aria-label="Filter by trading card game">
                  <button className={selectedGame === "all" ? "game-tab is-active" : "game-tab"} type="button" onClick={() => setSelectedGame("all")}>All games</button>
                  {marketData.tcgs.map((game) => (
                    <button className={selectedGame === game.tcgID ? "game-tab is-active" : "game-tab"} type="button" key={game.tcgID} onClick={() => setSelectedGame(game.tcgID)}>
                      {game.name}
                    </button>
                  ))}
                </div>
                <div className="toolbar-controls">
                  <label className="search-field">
                    <span className="sr-only">Search cards</span>
                    <Icon name="search" size={17} />
                    <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search cards, sets, sellers..." />
                  </label>
                  <label className="select-field">
                    <span className="sr-only">Sort listings</span>
                    <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                      <option value="recent">Recently listed</option>
                      <option value="price-low">Price: low to high</option>
                      <option value="price-high">Price: high to low</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="market-layout">
                <aside className="filter-panel" aria-label="Listing filters">
                  <div className="filter-heading"><span>Refine your search</span><Icon name="spark" size={15} /></div>
                  <fieldset className="filter-group">
                    <legend>Condition</legend>
                    {["all", "Near Mint", "Lightly Played", "Moderately Played"].map((condition) => (
                      <label className="filter-option" key={condition}>
                        <input type="radio" name="condition" value={condition} checked={selectedCondition === condition} onChange={() => setSelectedCondition(condition)} />
                        <span className="filter-radio" />
                        <span>{condition === "all" ? "Any condition" : condition}</span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="filter-location">
                    <span className="filter-label">Seller location</span>
                    <div className="location-value"><Icon name="pin" size={15} /> Metro Manila <span className="location-change">Local</span></div>
                    <p>Meet up or arrange delivery with the seller.</p>
                  </div>
                  <div className="filter-footer">
                    <span className="filter-dot" />
                    <span>Collector-to-collector listings</span>
                  </div>
                </aside>
                <div className="listing-results">
                  <div className="results-caption">
                    <span><strong>{listingCards.length}</strong> listings found</span>
                    <span className="results-caption__right">Showing local collector finds <span className="status-dot" /></span>
                  </div>
                  {listingCards.length ? (
                    <div className="product-grid">
                      {listingCards.map(renderListingCard)}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-seal"><Icon name="search" size={21} /></span>
                      <h3>No cards found</h3>
                      <p>Try another search or clear a filter to see more listings.</p>
                      <button className="text-button" type="button" onClick={() => { setSearchTerm(""); setSelectedGame("all"); setSelectedCondition("all"); }}>Clear filters</button>
                    </div>
                  )}
                  <div className="market-footnote"><span className="footnote-rule" /> Listings are shared by independent collectors. Confirm details with the seller before purchase.</div>
                </div>
              </div>
            </section>
          </>
        )}

        {section === "listings" && (
          <section className="workspace-section">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> SELLER WORKSPACE</div>
                <h1>Your <em>collection.</em></h1>
                <p>Keep your listings current and make room for the next great find.</p>
              </div>
              <button className="button button--gold" type="button" onClick={openCreateListing}><Icon name="plus" size={16} /> Create a listing</button>
            </div>
            <div className="seller-summary">
              <div><span>Active listings</span><strong>{marketData.listings.filter((listing) => listing.profileID === CURRENT_PROFILE_ID && listing.availabilityStatus === "Available").length}</strong></div>
              <div><span>Items sold</span><strong>{marketData.listings.filter((listing) => listing.profileID === CURRENT_PROFILE_ID && listing.availabilityStatus === "Sold").length}</strong></div>
              <div><span>Seller profile</span><strong>{currentProfile?.location ?? "Local"}</strong></div>
            </div>
            <div className="workspace-subheading">
              <h2>My listings <span>{marketData.listings.filter((listing) => listing.profileID === CURRENT_PROFILE_ID).length}</span></h2>
              <p>Manage availability and card details.</p>
            </div>
            {marketData.listings.some((listing) => listing.profileID === CURRENT_PROFILE_ID) ? (
              <div className="seller-list">
                {marketData.listings.filter((listing) => listing.profileID === CURRENT_PROFILE_ID).map((listing) => {
                  const product = marketData.products.find((item) => item.productID === listing.productID);
                  const game = product && marketData.tcgs.find((item) => item.tcgID === product.tcgID);
                  const set = product && marketData.sets.find((item) => item.setID === product.setID);
                  if (!product || !game || !set) return null;
                  return (
                    <article className={`seller-listing${listing.availabilityStatus === "Removed" ? " seller-listing--removed" : ""}`} key={listing.listingID}>
                      <CardArtwork tcgID={game.tcgID} cardNumber={product.cardNumber} imageURL={getListingImageURL(listing.listingID)} />
                      <div className="seller-listing__info">
                        <span className="seller-listing__game">{game.name} <span>·</span> {set.setCode}</span>
                        <h3>{product.productName}</h3>
                        <span className="seller-listing__condition">{product.condition} · {product.rarity}</span>
                      </div>
                      <div className="seller-listing__quantity"><span>Quantity</span><strong>{listing.quantity}</strong></div>
                      <div className="seller-listing__price"><span>Asking price</span><strong>{formatPrice(listing.price)}</strong></div>
                      <div className="seller-listing__status"><span className={`status-pill status-pill--${listing.availabilityStatus.toLowerCase()}`}>{listing.availabilityStatus}</span></div>
                      <div className="seller-listing__actions">
                        {listing.availabilityStatus === "Available" && (
                          <>
                            <button className="button button--quiet" type="button" onClick={() => openEditListing(listing)} aria-label={`Edit ${product.productName}`}>
                              <Icon name="edit" size={14} /> Edit
                            </button>
                            <button className="button button--quiet seller-listing__remove" type="button" onClick={() => setConfirmation({ action: "remove-listing", listingID: listing.listingID, subject: product.productName })} aria-label={`Delete ${product.productName}`}>
                              <Icon name="trash" size={14} /> Delete
                            </button>
                            <button className="button button--quiet" type="button" onClick={() => setConfirmation({ action: "mark-sold", listingID: listing.listingID, subject: product.productName })}>Mark as sold</button>
                          </>
                        )}
                        {listing.availabilityStatus === "Sold" && (
                          <button className="button button--quiet seller-listing__remove" type="button" onClick={() => setConfirmation({ action: "remove-listing", listingID: listing.listingID, subject: product.productName })} aria-label={`Delete ${product.productName}`}>
                            <Icon name="trash" size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state empty-state--seller">
                <span className="empty-seal"><Icon name="plus" size={21} /></span>
                <h3>Your showcase starts here</h3>
                <p>Create a listing with the card, set, condition, quantity, and price details collectors need.</p>
                <button className="button button--gold" type="button" onClick={openCreateListing}><Icon name="plus" size={16} /> List your first card</button>
              </div>
            )}
          </section>
        )}

        {section === "messages" && (
          <section className="workspace-section">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> COLLECTOR MESSAGES</div>
                <h1>Trade <em>stories.</em></h1>
                <p>Ask about condition, compare details, and coordinate a local handoff.</p>
              </div>
            </div>
            <div className="message-workspace">
              <aside className="conversation-list">
                <div className="conversation-list__title">Conversations <span>{conversationProfiles.length}</span></div>
                {conversationProfiles.map((profile) => {
                  const user = marketData.users.find((item) => item.userID === profile.userID);
                  const latest = marketData.messages
                    .filter((message) => message.senderProfileID === profile.profileID || message.recipientProfileID === profile.profileID)
                    .sort((a, b) => b.sentTimestamp.localeCompare(a.sentTimestamp))[0];
                  return (
                    <button className={activeConversationID === profile.profileID ? "conversation-item is-active" : "conversation-item"} key={profile.profileID} type="button" onClick={() => setActiveConversationID(profile.profileID)}>
                      <span className="conversation-avatar">{profile.firstName.slice(0, 1)}{profile.lastName.slice(0, 1)}</span>
                      <span className="conversation-copy">
                        <strong>{getDisplayName(profile)}</strong>
                        <small>{latest?.messageContent ?? "Start a conversation about a listing."}</small>
                      </span>
                      <span className="conversation-status" aria-label={user?.accountStatus ?? "Active"} />
                    </button>
                  );
                })}
              </aside>
              <div className="conversation-panel">
                {(() => {
                  const profile = marketData.profiles.find((item) => item.profileID === activeConversationID);
                  if (!profile) return null;
                  return (
                    <>
                      <div className="conversation-header">
                        <span className="conversation-avatar">{profile.firstName.slice(0, 1)}{profile.lastName.slice(0, 1)}</span>
                        <div><strong>{getDisplayName(profile)}</strong><span><Icon name="pin" size={13} /> {profile.location}</span></div>
                        <span className="online-indicator">Collector</span>
                      </div>
                      <div className="message-list" aria-live="polite">
                        {conversationMessages.length === 0 && <p className="message-empty">No messages yet. Ask about a card or arrange a meetup.</p>}
                        {conversationMessages.map((message) => (
                          <div className={message.senderProfileID === CURRENT_PROFILE_ID ? "message-row message-row--mine" : "message-row"} key={message.messageID}>
                            <p>{message.messageContent}</p>
                            <time>{new Date(message.sentTimestamp).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</time>
                          </div>
                        ))}
                      </div>
                      <form className="message-composer" onSubmit={sendMessage}>
                        <label className="sr-only" htmlFor="message-draft">Write a message</label>
                        <input id="message-draft" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Ask about condition or arrange a meetup..." />
                        <button className="button button--gold" type="submit" disabled={!messageDraft.trim()}><span>Send</span><Icon name="arrow" size={15} /></button>
                      </form>
                    </>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {section === "orders" && (
          <section className="workspace-section">
            <div className="workspace-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> PURCHASE REQUESTS</div>
                <h1>Every trade, <em>in view.</em></h1>
                <p>Track request status and coordinate fulfillment with the seller.</p>
              </div>
            </div>
            {marketData.orders.filter((order) => order.profileID === CURRENT_PROFILE_ID).length ? (
              <div className="order-list">
                {marketData.orders.filter((order) => order.profileID === CURRENT_PROFILE_ID).map((order) => {
                  const orderItems = marketData.orderItems.filter((item) => item.orderID === order.orderID);
                  const transaction = marketData.transactions.find((item) => item.orderID === order.orderID);
                  const fulfillment = transaction && marketData.fulfillments.find((item) => item.transactionID === transaction.transactionID);
                  const firstItem = orderItems[0];
                  const listing = firstItem && marketData.listings.find((item) => item.listingID === firstItem.listingID);
                  const product = listing && marketData.products.find((item) => item.productID === listing.productID);
                  const seller = listing && marketData.profiles.find((item) => item.profileID === listing.profileID);
                  return (
                    <article className="order-card" key={order.orderID}>
                      <div className="order-card__top">
                        <div><span className="order-label">Purchase request</span><strong>{order.orderID.slice(-8).toUpperCase()}</strong></div>
                        <span className={`status-pill ${order.cancellationStatus === "Cancelled" ? "status-pill--sold" : "status-pill--available"}`}>{order.orderStatus}</span>
                      </div>
                      <div className="order-card__body">
                        <div className="order-card__item">
                          {listing && product && marketData.tcgs.find((game) => game.tcgID === product.tcgID) && (
                            <CardArtwork tcgID={product.tcgID} cardNumber={product.cardNumber} imageURL={getListingImageURL(listing.listingID)} />
                          )}
                          <div><strong>{product?.productName ?? `${orderItems.length} item${orderItems.length === 1 ? "" : "s"}`}</strong><span>From {seller ? getDisplayName(seller) : "local seller"}</span></div>
                        </div>
                        <div className="order-detail"><span>Requested</span><strong>{new Date(order.orderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong></div>
                        <div className="order-detail"><span>Fulfillment</span><strong>{fulfillment?.fulfillmentMethod ?? "To be arranged"}</strong></div>
                        <div className="order-detail"><span>Total</span><strong>{formatPrice(order.totalAmount)}</strong></div>
                      </div>
                      <div className="order-card__bottom">
                        <span><Icon name="clock" size={15} /> {transaction?.transactionStatus ?? "Awaiting update"} <span className="payment-note">· Payment not processed</span></span>
                        {order.cancellationStatus === "Eligible" && <button className="text-button text-button--muted" type="button" onClick={() => setConfirmation({ action: "cancel-order", orderID: order.orderID, subject: product?.productName ?? "this purchase request" })}>Cancel request</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state empty-state--seller">
                <span className="empty-seal"><Icon name="bag" size={21} /></span>
                <h3>No purchase requests yet</h3>
                <p>When you request a card, its seller, fulfillment choice, and current status will appear here.</p>
                <button className="button button--gold" type="button" onClick={() => setSection("discover")}>Explore the market <Icon name="arrow" size={15} /></button>
              </div>
            )}
          </section>
        )}
      </main>

      {cartIsOpen && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartIsOpen(false); }}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <div className="drawer-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR SELECTION</div><h2 id="cart-title">The <em>cart.</em></h2></div>
              <button className="icon-button close-button" type="button" onClick={() => setCartIsOpen(false)} aria-label="Close cart"><Icon name="close" /></button>
            </div>
            {cartItems.length ? (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => {
                    const listing = marketData.listings.find((entry) => entry.listingID === item.listingID);
                    const product = listing && marketData.products.find((entry) => entry.productID === listing.productID);
                    const game = product && marketData.tcgs.find((entry) => entry.tcgID === product.tcgID);
                    if (!listing || !product || !game) return null;
                    return (
                      <div className="cart-item" key={item.cartItemID}>
                        <CardArtwork tcgID={game.tcgID} cardNumber={product.cardNumber} imageURL={getListingImageURL(listing.listingID)} />
                        <div className="cart-item__details"><strong>{product.productName}</strong><span>{product.condition} · Qty {item.quantity}</span><button className="text-button text-button--muted" type="button" onClick={() => removeFromCart(item.cartItemID)}>Remove</button></div>
                        <strong className="cart-item__price">{formatPrice(item.subtotal)}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="cart-summary">
                  <div><span>Items subtotal</span><strong>{formatPrice(cartTotal)}</strong></div>
                  <p>Fulfillment is arranged directly with each seller. No payment is collected in this prototype.</p>
                  <button className="button button--gold button--wide" type="button" onClick={() => { setCartIsOpen(false); setDialog("purchase"); }}>
                    Submit purchase request <Icon name="arrow" size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state empty-state--cart">
                <span className="empty-seal"><Icon name="bag" size={21} /></span>
                <h3>Your cart is waiting</h3>
                <p>Save a card here while you compare local listings.</p>
                <button className="button button--gold" type="button" onClick={() => { setCartIsOpen(false); setSection("discover"); }}>Browse cards</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {selectedCard && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedListingID(null); }}>
          <section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <button className="icon-button close-button detail-close" type="button" onClick={() => setSelectedListingID(null)} aria-label="Close card details"><Icon name="close" /></button>
            <div className="detail-art-wrap"><CardArtwork tcgID={selectedCard.game.tcgID} cardNumber={selectedCard.product.cardNumber} imageURL={getListingImageURL(selectedCard.listing.listingID)} /></div>
            <div className="detail-copy">
              <div className="eyebrow"><span className="eyebrow-line" /> {selectedCard.game.name.toUpperCase()}</div>
              <h2 id="detail-title">{selectedCard.product.productName}</h2>
              <p className="detail-set">{selectedCard.set.setName} <span>·</span> {selectedCard.product.cardNumber}</p>
              <p className="detail-description">{selectedCard.product.description}</p>
              <div className="detail-attributes">
                <div><span>Condition</span><strong>{selectedCard.product.condition}</strong></div>
                <div><span>Rarity</span><strong>{selectedCard.product.rarity}</strong></div>
                <div><span>Language</span><strong>{selectedCard.product.language}</strong></div>
                <div><span>Available</span><strong>{selectedCard.listing.quantity} copy{selectedCard.listing.quantity === 1 ? "" : "ies"}</strong></div>
              </div>
              <div className="detail-seller">
                <span className="seller-mark">{selectedCard.seller.firstName.slice(0, 1)}{selectedCard.seller.lastName.slice(0, 1)}</span>
                <div><strong>{getDisplayName(selectedCard.seller)}</strong><span><Icon name="pin" size={13} /> {selectedCard.seller.location}</span></div>
                <span className="seller-rating"><Icon name="star" size={13} /> {selectedCard.averageRating ? selectedCard.averageRating.toFixed(1) : "New"}</span>
              </div>
              <div className="detail-bottom">
                <div><span>Seller&apos;s asking price</span><strong>{formatPrice(selectedCard.listing.price)}</strong></div>
                <div className="detail-actions">
                  <button className="button button--quiet" type="button" onClick={() => { setActiveConversationID(selectedCard.seller.profileID); setSelectedListingID(null); setSection("messages"); }}>Message seller</button>
                  <button className="button button--gold" type="button" onClick={() => { addToCart(selectedCard.listing); setSelectedListingID(null); }}>
                    <Icon name="bag" size={16} /> Add to cart
                  </button>
                </div>
              </div>
              <button className="report-link" type="button" onClick={() => setConfirmation({ action: "report-listing", listingID: selectedCard.listing.listingID, subject: selectedCard.product.productName })}>Report this listing</button>
            </div>
          </section>
        </div>
      )}

      {dialog === "listing" && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="form-dialog listing-dialog" role="dialog" aria-modal="true" aria-labelledby="listing-form-title">
            <div className="dialog-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" /> SELL TO THE COMMUNITY</div><h2 id="listing-form-title">{editingListing ? <>Edit your <em>listing.</em></> : <>Create a <em>listing.</em></>}</h2></div>
              <button className="icon-button close-button" type="button" onClick={() => setDialog(null)} aria-label="Close listing form"><Icon name="close" /></button>
            </div>
            <form className="listing-form" onSubmit={handleCreateListing}>
              <div className="listing-form__columns">
                <section className="listing-form__details" aria-labelledby="listing-details-title">
                  <h3 id="listing-details-title" className="listing-form__section-title">Card details</h3>
                  <div className="form-row">
                    <label>Trading card game
                      <select value={formGameID} onChange={(event) => setFormGameID(event.target.value)}>
                        {marketData.tcgs.map((game) => <option value={game.tcgID} key={game.tcgID}>{game.name}</option>)}
                      </select>
                    </label>
                    <label>Set
                      <select name="setID" required defaultValue={editingProduct?.setID}>
                        {marketData.sets.filter((set) => set.tcgID === formGameID).map((set) => <option value={set.setID} key={set.setID}>{set.setCode} · {set.setName}</option>)}
                      </select>
                    </label>
                  </div>
                  <label>Card name
                    <input name="productName" required maxLength={90} defaultValue={editingProduct?.productName} placeholder="e.g. Sheoldred, the Apocalypse" />
                  </label>
                  <div className="form-row">
                    <label>Card number
                      <input name="cardNumber" required maxLength={30} defaultValue={editingProduct?.cardNumber} placeholder="e.g. 107/281" />
                    </label>
                    <label>Rarity
                      <input name="rarity" required maxLength={50} defaultValue={editingProduct?.rarity} placeholder="e.g. Mythic Rare" />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Condition
                      <select name="condition" defaultValue={editingProduct?.condition ?? "Near Mint"}>
                        <option>Near Mint</option><option>Lightly Played</option><option>Moderately Played</option>
                      </select>
                    </label>
                    <label>Language
                      <select name="language" defaultValue={editingProduct?.language ?? "English"}><option>English</option><option>Japanese</option><option>Korean</option><option>Chinese</option></select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label>Quantity
                      <input name="quantity" type="number" min="1" max="99" defaultValue={editingListing?.quantity ?? 1} required />
                    </label>
                    <label>Price (PHP)
                      <input name="price" type="number" min="1" step="1" defaultValue={editingListing?.price} required placeholder="0" />
                    </label>
                  </div>
                  <label>Listing description
                    <textarea name="description" rows={3} maxLength={280} defaultValue={editingProduct?.description} placeholder="Share any details a collector should know." />
                  </label>
                </section>
                <section className="listing-form__photo" aria-labelledby="listing-photo-title">
                  <h3 id="listing-photo-title" className="listing-form__section-title">Card photo</h3>
                  <div className="listing-photo-preview">
                    {listingImagePreview ? (
                      <Image
                        className="listing-photo-preview__image"
                        src={listingImagePreview}
                        alt="Preview of the card photo you selected"
                        fill
                        sizes="(max-width: 720px) 100vw, 360px"
                        unoptimized
                      />
                    ) : (
                      <div className="listing-photo-preview__empty">
                        <Icon name="plus" size={26} />
                        <span>Your card photo will appear here</span>
                      </div>
                    )}
                  </div>
                  <label className="listing-photo-upload">
                    <span>Choose card photo</span>
                    <input
                      className="listing-photo-upload__input"
                      type="file"
                      accept="image/*"
                      onChange={handleListingImageChange}
                    />
                  </label>
                  <p className="listing-photo-help">
                    {listingImageName || "Use a clear photo of the card. Image files up to 8 MB."}
                  </p>
                </section>
              </div>
              <div className="listing-form__actions">
                <div className="form-note"><Icon name="spark" size={15} /> Photos are only saved in this prototype session.</div>
                <button className="button button--gold button--wide" type="submit">{editingListing ? "Save changes" : "Publish listing"} <Icon name="arrow" size={16} /></button>
              </div>
            </form>
          </section>
        </div>
      )}

      {dialog === "purchase" && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="form-dialog purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
            <div className="dialog-heading">
              <div><div className="eyebrow"><span className="eyebrow-line" /> ONE LAST DETAIL</div><h2 id="purchase-title">Request this <em>trade.</em></h2></div>
              <button className="icon-button close-button" type="button" onClick={() => setDialog(null)} aria-label="Close request form"><Icon name="close" /></button>
            </div>
            <p className="purchase-intro">The seller will confirm availability and coordinate the handoff with you.</p>
            <fieldset className="fulfillment-options">
              <legend>How would you like to receive your cards?</legend>
              {["Meetup", "Delivery"].map((method) => (
                <label className={fulfillmentMethod === method ? "fulfillment-option is-selected" : "fulfillment-option"} key={method}>
                  <input type="radio" name="fulfillment" value={method} checked={fulfillmentMethod === method} onChange={() => setFulfillmentMethod(method)} />
                  <span className="filter-radio" />
                  <span><strong>{method}</strong><small>{method === "Meetup" ? "Arrange a public meeting place with the seller." : "Confirm delivery details directly with the seller."}</small></span>
                </label>
              ))}
            </fieldset>
            <div className="purchase-total"><span>Request total</span><strong>{formatPrice(cartTotal)}</strong></div>
            <div className="prototype-disclaimer">This creates a purchase request only. Payment is not processed.</div>
            <button className="button button--gold button--wide" type="button" onClick={() => setConfirmation({ action: "submit-purchase" })}>Review purchase request <Icon name="arrow" size={16} /></button>
          </section>
        </div>
      )}

      {confirmation && (
        <div className="overlay confirmation-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmation(null); }}>
          <section
            className={`confirmation-dialog${confirmation.action === "remove-listing" || confirmation.action === "cancel-order" ? " confirmation-dialog--danger" : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-description"
          >
            <div className="eyebrow"><span className="eyebrow-line" /> PLEASE CONFIRM</div>
            <h2 id="confirmation-title">
              {confirmation.action === "remove-listing" && "Remove this listing?"}
              {confirmation.action === "mark-sold" && "Mark as sold?"}
              {confirmation.action === "report-listing" && "Report this listing?"}
              {confirmation.action === "cancel-order" && "Cancel this request?"}
              {confirmation.action === "submit-purchase" && "Send purchase request?"}
            </h2>
            <p id="confirmation-description">
              {confirmation.action === "remove-listing" && (
                <>Remove <strong>{confirmation.subject}</strong> from the marketplace? It will also be removed from your cart. Order history will be kept.</>
              )}
              {confirmation.action === "mark-sold" && (
                <>Mark <strong>{confirmation.subject}</strong> as sold? It will no longer be available to buyers.</>
              )}
              {confirmation.action === "report-listing" && (
                <>Submit a report about <strong>{confirmation.subject}</strong> for moderator review? The report is saved in this prototype only.</>
              )}
              {confirmation.action === "cancel-order" && (
                <>Cancel the purchase request for <strong>{confirmation.subject}</strong>? Reserved copies will be returned to the listing when applicable.</>
              )}
              {confirmation.action === "submit-purchase" && (
                <>Send a request for <strong>{formatPrice(cartTotal)}</strong> with <strong>{fulfillmentMethod.toLowerCase()}</strong> fulfillment? The seller will confirm details; no payment is processed.</>
              )}
            </p>
            <div className="confirmation-dialog__actions">
              <button
                className="button button--quiet"
                type="button"
                autoFocus
                onClick={() => setConfirmation(null)}
              >
                {confirmation.action === "remove-listing" ? "Keep listing" : confirmation.action === "cancel-order" ? "Keep request" : "Go back"}
              </button>
              <button
                className={`button ${confirmation.action === "remove-listing" || confirmation.action === "cancel-order" ? "button--danger" : "button--gold"}`}
                type="button"
                onClick={confirmPendingAction}
              >
                {confirmation.action === "remove-listing" && "Remove listing"}
                {confirmation.action === "mark-sold" && "Mark as sold"}
                {confirmation.action === "report-listing" && "Submit report"}
                {confirmation.action === "cancel-order" && "Cancel request"}
                {confirmation.action === "submit-purchase" && "Send request"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast-message" role="status" aria-live="polite"><span className="toast-mark">✓</span>{toast}</div>}
    </div>
  );
}
