export type AccountStatus = "Active" | "Suspended";
export type UserRole = "Buyer/Seller" | "Moderator" | "Marketplace Administrator";
export type ProductCondition = "Near Mint" | "Lightly Played" | "Moderately Played";
export type ListingAvailability = "Available" | "Sold" | "Removed";
export type TransactionStatus = "Pending seller confirmation" | "Preparing" | "Fulfilled" | "Cancelled";

export interface User {
  userID: string;
  username: string;
  email: string;
  password: string;
  accountStatus: AccountStatus;
  role: UserRole;
  dateRegistered: string;
}

export interface Profile {
  profileID: string;
  userID: string;
  firstName: string;
  lastName: string;
  location: string;
  contactInformation: string;
  profileDescription: string;
}

export interface TCG {
  tcgID: string;
  name: string;
  description: string;
}

export interface Set {
  setID: string;
  tcgID: string;
  setCode: string;
  setName: string;
  releaseDate: string;
}

export interface Product {
  productID: string;
  tcgID: string;
  setID: string;
  productName: string;
  cardNumber: string;
  rarity: string;
  condition: ProductCondition;
  language: string;
  description: string;
}

export interface Listing {
  listingID: string;
  productID: string;
  profileID: string;
  quantity: number;
  price: number;
  listingDate: string;
  availabilityStatus: ListingAvailability;
}

export interface ListingImage {
  imageID: string;
  listingID: string;
  imageURL: string;
  description: string;
}

export interface Rating {
  ratingID: string;
  profileID: string;
  reviewerProfileID: string;
  transactionID: string;
  starRating: number;
  writtenReview: string;
  transactionFeedback: string;
  ratingDate: string;
}

export interface Message {
  messageID: string;
  senderProfileID: string;
  recipientProfileID: string;
  messageContent: string;
  sentTimestamp: string;
}

export interface Report {
  reportID: string;
  reporterProfileID: string;
  targetUserID?: string;
  listingID?: string;
  reason: string;
  description: string;
  reportDate: string;
  reportStatus: string;
}

export interface Cart {
  cartID: string;
  profileID: string;
  dateCreated: string;
  lastUpdated: string;
  total: number;
}

export interface CartItem {
  cartItemID: string;
  cartID: string;
  listingID: string;
  quantity: number;
  subtotal: number;
}

export interface Order {
  orderID: string;
  profileID: string;
  orderDate: string;
  orderStatus: string;
  totalAmount: number;
  cancellationStatus: string;
}

export interface OrderItem {
  orderItemID: string;
  orderID: string;
  listingID: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  transactionID: string;
  orderID: string;
  paymentStatus: string;
  transactionStatus: TransactionStatus;
  transactionTimestamp: string;
}

export interface Fulfillment {
  fulfillmentID: string;
  transactionID: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  expectedDate: string;
  fulfillmentDate: string;
  fulfillmentDetails: string;
}

export interface MarketplaceData {
  users: User[];
  profiles: Profile[];
  tcgs: TCG[];
  sets: Set[];
  products: Product[];
  listings: Listing[];
  listingImages: ListingImage[];
  ratings: Rating[];
  messages: Message[];
  reports: Report[];
  carts: Cart[];
  cartItems: CartItem[];
  orders: Order[];
  orderItems: OrderItem[];
  transactions: Transaction[];
  fulfillments: Fulfillment[];
}

export const CURRENT_USER_ID = "user-gary";
export const CURRENT_PROFILE_ID = "profile-gary";

export const initialMarketplaceData: MarketplaceData = {
  users: [
    {
      userID: CURRENT_USER_ID,
      username: "asphodelcollector",
      email: "collector@example.invalid",
      password: "",
      accountStatus: "Active",
      role: "Buyer/Seller",
      dateRegistered: "2025-08-12",
    },
    {
      userID: "user-vale",
      username: "thecardvale",
      email: "vale@example.invalid",
      password: "",
      accountStatus: "Active",
      role: "Buyer/Seller",
      dateRegistered: "2025-06-02",
    },
    {
      userID: "user-ember",
      username: "embervault",
      email: "ember@example.invalid",
      password: "",
      accountStatus: "Active",
      role: "Buyer/Seller",
      dateRegistered: "2025-07-20",
    },
    {
      userID: "user-moss",
      username: "mossandmana",
      email: "moss@example.invalid",
      password: "",
      accountStatus: "Active",
      role: "Buyer/Seller",
      dateRegistered: "2025-09-11",
    },
  ],
  profiles: [
    {
      profileID: CURRENT_PROFILE_ID,
      userID: CURRENT_USER_ID,
      firstName: "Kai",
      lastName: "Soriano",
      location: "Quezon City",
      contactInformation: "collector@example.invalid",
      profileDescription: "Commander player, binder builder, and collector of strange little artifacts.",
    },
    {
      profileID: "profile-vale",
      userID: "user-vale",
      firstName: "Mara",
      lastName: "Vale",
      location: "Makati City",
      contactInformation: "vale@example.invalid",
      profileDescription: "Carefully sleeved singles from a collector-run shop.",
    },
    {
      profileID: "profile-ember",
      userID: "user-ember",
      firstName: "Nico",
      lastName: "Reyes",
      location: "Pasig City",
      contactInformation: "ember@example.invalid",
      profileDescription: "Trading since 2018. Happy to meet around the metro.",
    },
    {
      profileID: "profile-moss",
      userID: "user-moss",
      firstName: "Tala",
      lastName: "Cruz",
      location: "Manila",
      contactInformation: "moss@example.invalid",
      profileDescription: "A little bit of every game, a lot of love for good trade stories.",
    },
  ],
  tcgs: [
    { tcgID: "tcg-mtg", name: "Magic: The Gathering", description: "Fantasy strategy card game" },
    { tcgID: "tcg-pokemon", name: "Pokémon", description: "Collectible creature card game" },
    { tcgID: "tcg-yugioh", name: "Yu-Gi-Oh!", description: "Duel and collect trading card game" },
    { tcgID: "tcg-one-piece", name: "One Piece Card Game", description: "Pirate-themed trading card game" },
  ],
  sets: [
    { setID: "set-mtg-dmu", tcgID: "tcg-mtg", setCode: "DMU", setName: "Dominaria United", releaseDate: "2022-09-09" },
    { setID: "set-mtg-ltr", tcgID: "tcg-mtg", setCode: "LTR", setName: "The Lord of the Rings: Tales of Middle-earth", releaseDate: "2023-06-23" },
    { setID: "set-pokemon-paf", tcgID: "tcg-pokemon", setCode: "PAF", setName: "Paldean Fates", releaseDate: "2024-01-26" },
    { setID: "set-pokemon-scr", tcgID: "tcg-pokemon", setCode: "SCR", setName: "Stellar Crown", releaseDate: "2024-09-13" },
    { setID: "set-yugioh-qcdb", tcgID: "tcg-yugioh", setCode: "QCDB", setName: "Quarter Century Bonanza", releaseDate: "2024-11-08" },
    { setID: "set-op-op05", tcgID: "tcg-one-piece", setCode: "OP05", setName: "Awakening of the New Era", releaseDate: "2023-12-08" },
  ],
  products: [
    {
      productID: "product-sheoldred",
      tcgID: "tcg-mtg",
      setID: "set-mtg-dmu",
      productName: "Sheoldred, the Apocalypse",
      cardNumber: "107/281",
      rarity: "Mythic Rare",
      condition: "Near Mint",
      language: "English",
      description: "Black-aligned legendary creature card from Dominaria United.",
    },
    {
      productID: "product-one-ring",
      tcgID: "tcg-mtg",
      setID: "set-mtg-ltr",
      productName: "The One Ring",
      cardNumber: "246/Scene 1",
      rarity: "Mythic Rare",
      condition: "Lightly Played",
      language: "English",
      description: "A centerpiece artifact card from Tales of Middle-earth.",
    },
    {
      productID: "product-mew",
      tcgID: "tcg-pokemon",
      setID: "set-pokemon-paf",
      productName: "Mew ex",
      cardNumber: "232/091",
      rarity: "Special Illustration Rare",
      condition: "Near Mint",
      language: "English",
      description: "A bright special illustration rare from Paldean Fates.",
    },
    {
      productID: "product-terapagos",
      tcgID: "tcg-pokemon",
      setID: "set-pokemon-scr",
      productName: "Terapagos ex",
      cardNumber: "170/142",
      rarity: "Special Illustration Rare",
      condition: "Near Mint",
      language: "English",
      description: "A special illustration rare from the Stellar Crown set.",
    },
    {
      productID: "product-blue-eyes",
      tcgID: "tcg-yugioh",
      setID: "set-yugioh-qcdb",
      productName: "Blue-Eyes White Dragon",
      cardNumber: "QCDB-EN001",
      rarity: "Quarter Century Secret Rare",
      condition: "Lightly Played",
      language: "English",
      description: "Classic dragon card with a vivid foil finish.",
    },
    {
      productID: "product-luffy",
      tcgID: "tcg-one-piece",
      setID: "set-op-op05",
      productName: "Monkey D. Luffy",
      cardNumber: "OP05-119",
      rarity: "Secret Rare",
      condition: "Near Mint",
      language: "English",
      description: "A sought-after leader-era card from Awakening of the New Era.",
    },
  ],
  listings: [
    { listingID: "listing-sheoldred", productID: "product-sheoldred", profileID: "profile-vale", quantity: 1, price: 1850, listingDate: "2026-10-19", availabilityStatus: "Available" },
    { listingID: "listing-one-ring", productID: "product-one-ring", profileID: "profile-ember", quantity: 1, price: 3290, listingDate: "2026-10-16", availabilityStatus: "Available" },
    { listingID: "listing-mew", productID: "product-mew", profileID: "profile-moss", quantity: 1, price: 2480, listingDate: "2026-10-21", availabilityStatus: "Available" },
    { listingID: "listing-terapagos", productID: "product-terapagos", profileID: "profile-vale", quantity: 2, price: 1120, listingDate: "2026-10-23", availabilityStatus: "Available" },
    { listingID: "listing-blue-eyes", productID: "product-blue-eyes", profileID: "profile-ember", quantity: 1, price: 760, listingDate: "2026-10-18", availabilityStatus: "Available" },
    { listingID: "listing-luffy", productID: "product-luffy", profileID: "profile-moss", quantity: 1, price: 2890, listingDate: "2026-10-22", availabilityStatus: "Available" },
  ],
  listingImages: [
    { imageID: "image-sheoldred", listingID: "listing-sheoldred", imageURL: "https://cards.scryfall.io/normal/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg?1783921327", description: "Sheoldred, the Apocalypse from Dominaria United" },
    { imageID: "image-one-ring", listingID: "listing-one-ring", imageURL: "https://cards.scryfall.io/normal/front/d/5/d5806e68-1054-458e-866d-1f2470f682b2.jpg?1790212038", description: "The One Ring from The Lord of the Rings: Tales of Middle-earth" },
    { imageID: "image-mew", listingID: "listing-mew", imageURL: "https://images.pokemontcg.io/sv4pt5/232.png", description: "Mew ex from Paldean Fates" },
    { imageID: "image-terapagos", listingID: "listing-terapagos", imageURL: "https://images.pokemontcg.io/sv7/170.png", description: "Terapagos ex from Stellar Crown" },
    { imageID: "image-blue-eyes", listingID: "listing-blue-eyes", imageURL: "https://images.ygoprodeck.com/images/cards/89631139.jpg", description: "Blue-Eyes White Dragon" },
    { imageID: "image-luffy", listingID: "listing-luffy", imageURL: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_EN.webp", description: "Monkey D. Luffy from Awakening of the New Era" },
  ],
  ratings: [
    {
      ratingID: "rating-vale",
      profileID: "profile-vale",
      reviewerProfileID: CURRENT_PROFILE_ID,
      transactionID: "transaction-001",
      starRating: 5,
      writtenReview: "Card arrived exactly as described. Smooth meetup and careful sleeve.",
      transactionFeedback: "Excellent seller",
      ratingDate: "2026-09-15",
    },
    {
      ratingID: "rating-ember",
      profileID: "profile-ember",
      reviewerProfileID: CURRENT_PROFILE_ID,
      transactionID: "transaction-002",
      starRating: 5,
      writtenReview: "Friendly communication and a fair, honest condition check.",
      transactionFeedback: "Would trade again",
      ratingDate: "2026-08-27",
    },
    {
      ratingID: "rating-moss",
      profileID: "profile-moss",
      reviewerProfileID: "profile-vale",
      transactionID: "transaction-003",
      starRating: 4,
      writtenReview: "Quick replies and everything was packed safely.",
      transactionFeedback: "Good seller",
      ratingDate: "2026-08-04",
    },
  ],
  messages: [
    {
      messageID: "message-001",
      senderProfileID: "profile-vale",
      recipientProfileID: CURRENT_PROFILE_ID,
      messageContent: "Hi! I can share a close-up of the back before you decide.",
      sentTimestamp: "2026-10-23T09:32:00",
    },
    {
      messageID: "message-002",
      senderProfileID: CURRENT_PROFILE_ID,
      recipientProfileID: "profile-vale",
      messageContent: "That would be great, thank you.",
      sentTimestamp: "2026-10-23T09:44:00",
    },
  ],
  reports: [],
  carts: [
    { cartID: "cart-gary", profileID: CURRENT_PROFILE_ID, dateCreated: "2026-10-01", lastUpdated: "2026-10-01", total: 0 },
  ],
  cartItems: [],
  orders: [
    {
      orderID: "order-001",
      profileID: CURRENT_PROFILE_ID,
      orderDate: "2026-10-18",
      orderStatus: "Awaiting seller confirmation",
      totalAmount: 760,
      cancellationStatus: "Eligible",
    },
  ],
  orderItems: [
    { orderItemID: "order-item-001", orderID: "order-001", listingID: "listing-blue-eyes", quantity: 1, unitPrice: 760, subtotal: 760 },
  ],
  transactions: [
    {
      transactionID: "transaction-001",
      orderID: "order-001",
      paymentStatus: "Not processed",
      transactionStatus: "Pending seller confirmation",
      transactionTimestamp: "2026-10-18T13:05:00",
    },
  ],
  fulfillments: [
    {
      fulfillmentID: "fulfillment-001",
      transactionID: "transaction-001",
      fulfillmentMethod: "Meetup",
      fulfillmentStatus: "To be arranged",
      expectedDate: "2026-10-28",
      fulfillmentDate: "",
      fulfillmentDetails: "Quezon City, details to be confirmed in messages.",
    },
  ],
};
