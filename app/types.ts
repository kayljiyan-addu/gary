export type UserRole = "buyer" | "seller" | "moderator" | "admin";
export type AccountStatus = "active" | "suspended";
export type FulfillmentMethod = "shipping" | "meetup";
export type FulfillmentStatus = "requested" | "accepted" | "in_transit" | "ready_for_meetup" | "completed" | "cancelled";
export type ListingCondition = "Near Mint" | "Lightly Played" | "Moderately Played" | "Heavily Played";
export type AvailabilityStatus = "active" | "sold" | "removed";

export interface MarketplaceUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  location: string;
  description: string;
  contactInformation?: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  game: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  productType: string;
  description: string;
  art: number;
}

export interface MarketplaceListing {
  id: string;
  product: MarketplaceProduct;
  seller: Pick<MarketplaceUser, "id" | "username" | "location" | "description">;
  condition: ListingCondition;
  quantity: number;
  price: number;
  fulfillmentMethods: FulfillmentMethod[];
  listedAt: string;
  status: AvailabilityStatus;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
}

export interface CartLine {
  listingId: string;
  quantity: number;
}

export interface ConversationMessage {
  id: string;
  listingId: string | null;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: string;
  readAt: string | null;
}

export interface MarketplaceReport {
  id: string;
  reporterId: string;
  targetUserId: string | null;
  listingId: string | null;
  reason: string;
  description: string;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
}

export interface MarketplaceDispute {
  id: string;
  transactionId: string;
  openedBy: string;
  reason: string;
  description: string;
  status: "open" | "reviewing" | "resolved";
  outcome: string;
  createdAt: string;
}

export interface MarketplaceMember {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  location: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface MarketplaceTransaction {
  id: string;
  buyerId: string;
  sellerId: string;
  orderId: string;
  status: "requested" | "accepted" | "shipped" | "completed" | "cancelled" | "disputed";
  paymentStatus: "pending" | "paid" | "refunded" | "not_required";
  totalAmount: number;
  fulfillmentMethod: FulfillmentMethod;
  fulfillmentStatus?: FulfillmentStatus;
  createdAt: string;
  itemSummary?: string;
  otherPartyId?: string;
  otherPartyName?: string;
  reviewed?: boolean;
}

export interface MarketplaceConversation {
  id: string;
  listingId: string | null;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  sentAt: string;
  readAt: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  isPublished: boolean;
}

export interface ListingDraft {
  name: string;
  game: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  productType: string;
  description: string;
  condition: ListingCondition;
  quantity: number;
  price: number;
  fulfillmentMethods: FulfillmentMethod[];
  imageFile?: File | null;
}

export interface ListingFilters {
  query: string;
  game: string;
  setName: string;
  condition: string;
  rarity: string;
  minPrice: string;
  maxPrice: string;
  sort: "recent" | "price-low" | "price-high";
}
