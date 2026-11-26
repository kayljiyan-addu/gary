import type { BrowserSupabaseClient } from "@/lib/supabase/client";
import type {
  CartLine,
  FulfillmentMethod,
  ListingDraft,
  MarketplaceConversation,
  MarketplaceDispute,
  MarketplaceListing,
  MarketplaceMember,
  MarketplaceReport,
  MarketplaceTransaction,
  UserRole,
} from "@/types";

type Client = BrowserSupabaseClient;

function raiseIfError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchListings(
  client: Client,
  options: { ids?: string[]; sellerId?: string; includeUnavailable?: boolean } = {},
): Promise<MarketplaceListing[]> {
  let query = client
    .from("listings")
    .select("id, product_id, seller_id, quantity, price, condition, listing_date, availability_status, fulfillment_methods")
    .order("listing_date", { ascending: false })
    .limit(100);

  if (!options.includeUnavailable) {
    query = query.eq("availability_status", "active");
  }
  if (options.ids) {
    if (options.ids.length === 0) return [];
    query = query.in("id", options.ids);
  }
  if (options.sellerId) {
    query = query.eq("seller_id", options.sellerId);
  }

  const { data: listings, error } = await query;
  raiseIfError(error);
  if (!listings?.length) return [];

  const productIds = [...new Set(listings.map((listing) => listing.product_id))];
  const sellerIds = [...new Set(listings.map((listing) => listing.seller_id))];
  const [productsResult, profilesResult] = await Promise.all([
    client
      .from("products")
      .select("id, tcg_id, set_id, product_name, card_number, rarity, product_type, description")
      .in("id", productIds),
    client
      .from("profiles")
      .select("id, username, location, description")
      .in("id", sellerIds),
  ]);
  raiseIfError(productsResult.error);
  raiseIfError(profilesResult.error);

  const products = productsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const tcgIds = [...new Set(products.map((product) => product.tcg_id))];
  const setIds = [...new Set(products.flatMap((product) => product.set_id ? [product.set_id] : []))];
  const [tcgsResult, setsResult, imagesResult] = await Promise.all([
    tcgIds.length
      ? client.from("tcgs").select("id, name").in("id", tcgIds)
      : Promise.resolve({ data: [], error: null }),
    setIds.length
      ? client.from("sets").select("id, set_name").in("id", setIds)
      : Promise.resolve({ data: [], error: null }),
    client.from("listing_images").select("listing_id, storage_path").in("listing_id", listings.map((listing) => listing.id)),
  ]);
  raiseIfError(tcgsResult.error);
  raiseIfError(setsResult.error);
  raiseIfError(imagesResult.error);

  const productById = new Map(products.map((product) => [product.id, product]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const tcgById = new Map((tcgsResult.data ?? []).map((tcg) => [tcg.id, tcg.name]));
  const setById = new Map((setsResult.data ?? []).map((set) => [set.id, set.set_name]));
  const imageByListing = new Map((imagesResult.data ?? []).map((image) => [
    image.listing_id,
    client.storage.from("listing-images").getPublicUrl(image.storage_path).data.publicUrl,
  ]));
  const { data: ratingSummaries, error: ratingsError } = await client
    .from("seller_rating_summaries")
    .select("seller_id, average_rating, review_count")
    .in("seller_id", sellerIds);
  raiseIfError(ratingsError);
  const ratingBySeller = new Map(
    (ratingSummaries ?? []).map((summary) => [summary.seller_id, {
      rating: summary.average_rating === null ? undefined : Number(summary.average_rating),
      reviewCount: summary.review_count,
    }]),
  );

  return listings.flatMap((listing) => {
    const product = productById.get(listing.product_id);
    const seller = profileById.get(listing.seller_id);
    if (!product || !seller) return [];
    return [{
      id: listing.id,
      product: {
        id: product.id,
        name: product.product_name,
        game: tcgById.get(product.tcg_id) ?? "Trading card game",
        setName: product.set_id ? setById.get(product.set_id) ?? "Unlisted set" : "Unlisted set",
        cardNumber: product.card_number,
        rarity: product.rarity,
        productType: product.product_type,
        description: product.description,
        art: 1 + (product.id.charCodeAt(0) % 10),
      },
      seller: {
        id: seller.id,
        username: seller.username,
        location: seller.location,
        description: seller.description,
      },
      condition: listing.condition,
      quantity: listing.quantity,
      price: Number(listing.price),
      fulfillmentMethods: listing.fulfillment_methods,
      listedAt: listing.listing_date,
      status: listing.availability_status,
      imageUrl: imageByListing.get(listing.id),
      ...ratingBySeller.get(listing.seller_id),
    }];
  });
}

export async function createListing(client: Client, draft: ListingDraft): Promise<string> {
  const { data, error } = await client.rpc("create_listing_with_product", {
    product_name: draft.name.trim(),
    tcg_name: draft.game,
    set_name: draft.setName.trim(),
    card_number: draft.cardNumber.trim(),
    rarity: draft.rarity.trim(),
    product_type: draft.productType.trim(),
    product_description: draft.description.trim(),
    listing_condition: draft.condition,
    listing_quantity: draft.quantity,
    listing_price: draft.price,
    listing_fulfillment_methods: draft.fulfillmentMethods,
  });
  raiseIfError(error);
  if (!data) throw new Error("The new listing was saved without a listing identifier.");
  return data;
}

export async function uploadListingImage(client: Client, listingId: string, file: File): Promise<void> {
  const allowedTypes = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const extension = allowedTypes.get(file.type);
  if (!extension) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 5 MB.");
  }

  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in to upload a listing image.");

  const path = `${userResult.user.id}/${listingId}/${globalThis.crypto.randomUUID()}.${extension}`;
  const storage = client.storage.from("listing-images");
  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  raiseIfError(uploadError);

  const { error: imageError } = await client.from("listing_images").insert({
    listing_id: listingId,
    storage_path: path,
  });
  if (imageError) {
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) {
      throw new Error(`${imageError.message}; uploaded file cleanup also failed: ${cleanupError.message}`);
    }
    throw new Error(imageError.message);
  }
}

export async function updateListing(
  client: Client,
  listingId: string,
  changes: Pick<ListingDraft, "condition" | "quantity" | "price" | "fulfillmentMethods">,
): Promise<void> {
  const { error } = await client
    .from("listings")
    .update({
      condition: changes.condition,
      quantity: changes.quantity,
      price: changes.price,
      fulfillment_methods: changes.fulfillmentMethods,
    })
    .eq("id", listingId);
  raiseIfError(error);
}

export async function setListingStatus(
  client: Client,
  listingId: string,
  status: "sold" | "removed",
): Promise<void> {
  const { error } = await client
    .from("listings")
    .update({
      availability_status: status,
      ...(status === "sold" ? { quantity: 0 } : {}),
    })
    .eq("id", listingId);
  raiseIfError(error);
}

export async function addCartItem(client: Client, listingId: string, quantity: number): Promise<void> {
  const { error } = await client.rpc("add_to_cart", {
    p_listing_uuid: listingId,
    p_requested_quantity: quantity,
  });
  raiseIfError(error);
}

export async function fetchCart(client: Client, buyerId: string): Promise<CartLine[]> {
  const { data: cart, error: cartError } = await client
    .from("carts")
    .select("id")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  raiseIfError(cartError);
  if (!cart) return [];

  const { data: items, error } = await client
    .from("cart_items")
    .select("id, listing_id, quantity")
    .eq("cart_id", cart.id);
  raiseIfError(error);
  return (items ?? []).map((item) => ({ listingId: item.listing_id, quantity: item.quantity }));
}

export async function removeCartItem(client: Client, buyerId: string, listingId: string): Promise<void> {
  const { data: cart, error: cartError } = await client
    .from("carts")
    .select("id")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  raiseIfError(cartError);
  if (!cart) return;

  const { error } = await client
    .from("cart_items")
    .delete()
    .eq("cart_id", cart.id)
    .eq("listing_id", listingId);
  raiseIfError(error);
}

export async function changeCartItemQuantity(
  client: Client,
  listingId: string,
  quantity: number,
): Promise<void> {
  const { data: cart, error: cartError } = await client
    .from("carts")
    .select("id")
    .maybeSingle();
  raiseIfError(cartError);
  if (!cart) throw new Error("Your cart is empty.");

  const { data: item, error: itemError } = await client
    .from("cart_items")
    .select("id")
    .eq("cart_id", cart.id)
    .eq("listing_id", listingId)
    .single();
  raiseIfError(itemError);
  if (!item) throw new Error("The cart item no longer exists.");

  const { error } = await client.rpc("set_cart_item_quantity", {
    p_cart_item_uuid: item.id,
    p_requested_quantity: quantity,
  });
  raiseIfError(error);
}

export async function submitPurchaseRequest(
  client: Client,
  method: FulfillmentMethod,
  details: string,
): Promise<string[]> {
  const { data, error } = await client.rpc("create_purchase_request", {
    p_fulfillment_method: method,
    p_fulfillment_details: details,
  });
  raiseIfError(error);
  if (!Array.isArray(data)) {
    throw new Error("The purchase request was not returned in the expected format.");
  }
  return data.flatMap((entry) => {
    if (typeof entry === "object" && entry !== null && "transaction_id" in entry && typeof entry.transaction_id === "string") {
      return [entry.transaction_id];
    }
    return [];
  });
}

export async function fetchTransactions(client: Client, userId: string, all = false): Promise<MarketplaceTransaction[]> {
  let query = client
    .from("transactions")
    .select("id, order_id, buyer_id, seller_id, payment_status, transaction_status, transaction_timestamp, total_amount")
    .order("transaction_timestamp", { ascending: false })
    .limit(100);
  if (!all) query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  const { data, error } = await query;
  raiseIfError(error);
  if (!data?.length) return [];

  const orderIds = [...new Set(data.map((transaction) => transaction.order_id))];
  const partyIds = [...new Set(data.flatMap((transaction) => [transaction.buyer_id, transaction.seller_id]))];
  const [fulfillmentsResult, itemsResult, profilesResult, ratingsResult] = await Promise.all([
    client
      .from("fulfillments")
      .select("transaction_id, fulfillment_method, fulfillment_status")
      .in("transaction_id", data.map((transaction) => transaction.id)),
    client
      .from("order_items")
      .select("order_id, product_id, quantity")
      .in("order_id", orderIds),
    client.from("profiles").select("id, username").in("id", partyIds),
    client
      .from("ratings")
      .select("transaction_id")
      .eq("buyer_id", userId)
      .in("transaction_id", data.map((transaction) => transaction.id)),
  ]);
  raiseIfError(fulfillmentsResult.error);
  raiseIfError(itemsResult.error);
  raiseIfError(profilesResult.error);
  raiseIfError(ratingsResult.error);

  const productIds = [...new Set((itemsResult.data ?? []).map((item) => item.product_id))];
  const { data: products, error: productsError } = productIds.length
    ? await client.from("products").select("id, product_name").in("id", productIds)
    : { data: [], error: null };
  raiseIfError(productsError);

  const methodByTransaction = new Map((fulfillmentsResult.data ?? []).map((fulfillment) => [fulfillment.transaction_id, fulfillment.fulfillment_method]));
  const fulfillmentStatusByTransaction = new Map((fulfillmentsResult.data ?? []).map((fulfillment) => [fulfillment.transaction_id, fulfillment.fulfillment_status]));
  const usernameById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.username]));
  const productNameById = new Map((products ?? []).map((product) => [product.id, product.product_name]));
  const reviewedTransactionIds = new Set((ratingsResult.data ?? []).map((rating) => rating.transaction_id));
  const itemSummaryByOrder = new Map<string, string[]>();
  for (const item of itemsResult.data ?? []) {
    const labels = itemSummaryByOrder.get(item.order_id) ?? [];
    labels.push(`${item.quantity} × ${productNameById.get(item.product_id) ?? "Trading card"}`);
    itemSummaryByOrder.set(item.order_id, labels);
  }

  return data.map((transaction) => ({
    id: transaction.id,
    buyerId: transaction.buyer_id,
    sellerId: transaction.seller_id,
    orderId: transaction.order_id,
    status: transaction.transaction_status,
    paymentStatus: transaction.payment_status,
    totalAmount: Number(transaction.total_amount),
    fulfillmentMethod: methodByTransaction.get(transaction.id) ?? "shipping",
    fulfillmentStatus: fulfillmentStatusByTransaction.get(transaction.id),
    createdAt: transaction.transaction_timestamp,
    itemSummary: itemSummaryByOrder.get(transaction.order_id)?.join(", ") ?? "Purchase request",
    otherPartyId: transaction.buyer_id === userId ? transaction.seller_id : transaction.buyer_id,
    otherPartyName: usernameById.get(transaction.buyer_id === userId ? transaction.seller_id : transaction.buyer_id) ?? "Marketplace member",
    reviewed: reviewedTransactionIds.has(transaction.id),
  }));
}

export async function cancelTransaction(client: Client, transactionId: string): Promise<void> {
  const { error } = await client.rpc("cancel_transaction", { transaction_uuid: transactionId });
  raiseIfError(error);
}

export async function sendMessage(
  client: Client,
  recipientId: string,
  listingId: string | null,
  content: string,
): Promise<void> {
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  const sender = userResult.user;
  if (!sender) throw new Error("Sign in to send a message.");

  const { error } = await client.from("messages").insert({
    sender_id: sender.id,
    recipient_id: recipientId,
    listing_id: listingId,
    message_content: content.trim(),
  });
  raiseIfError(error);
}

export async function createReport(
  client: Client,
  target: { targetUserId?: string; listingId?: string },
  reason: string,
  description: string,
): Promise<void> {
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in to submit a report.");

  const { error } = await client.from("reports").insert({
    reporter_id: userResult.user.id,
    target_user_id: target.targetUserId ?? null,
    listing_id: target.listingId ?? null,
    reason,
    description: description.trim(),
  });
  raiseIfError(error);
}

export async function createRating(
  client: Client,
  transactionId: string,
  sellerId: string,
  stars: number,
  review: string,
): Promise<void> {
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in to leave a review.");

  const { error } = await client.from("ratings").insert({
    transaction_id: transactionId,
    buyer_id: userResult.user.id,
    seller_id: sellerId,
    star_rating: stars,
    written_review: review.trim(),
  });
  raiseIfError(error);
}

export async function updateTransactionStatus(
  client: Client,
  transactionId: string,
  status: MarketplaceTransaction["status"],
): Promise<void> {
  const { error } = await client
    .from("transactions")
    .update({ transaction_status: status })
    .eq("id", transactionId);
  raiseIfError(error);
}

export async function fetchMessages(client: Client, userId: string): Promise<MarketplaceConversation[]> {
  const { data, error } = await client
    .from("messages")
    .select("id, sender_id, recipient_id, listing_id, message_content, sent_timestamp, read_timestamp")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("sent_timestamp", { ascending: false })
    .limit(100);
  raiseIfError(error);
  if (!data?.length) return [];

  const memberIds = [...new Set(data.flatMap((message) => [message.sender_id, message.recipient_id]))];
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id, username")
    .in("id", memberIds);
  raiseIfError(profilesError);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  return data.map((message) => ({
    id: message.id,
    listingId: message.listing_id,
    senderId: message.sender_id,
    senderName: names.get(message.sender_id) ?? "Marketplace member",
    recipientId: message.recipient_id,
    recipientName: names.get(message.recipient_id) ?? "Marketplace member",
    content: message.message_content,
    sentAt: message.sent_timestamp,
    readAt: message.read_timestamp,
  }));
}

export async function fetchReports(client: Client): Promise<MarketplaceReport[]> {
  const { data, error } = await client
    .from("reports")
    .select("id, reporter_id, target_user_id, listing_id, reason, description, report_status, report_date")
    .order("report_date", { ascending: false })
    .limit(100);
  raiseIfError(error);
  return (data ?? []).map((report) => ({
    id: report.id,
    reporterId: report.reporter_id,
    targetUserId: report.target_user_id,
    listingId: report.listing_id,
    reason: report.reason,
    description: report.description,
    status: report.report_status,
    createdAt: report.report_date,
  }));
}

export async function fetchDisputes(client: Client): Promise<MarketplaceDispute[]> {
  const { data, error } = await client
    .from("disputes")
    .select("id, transaction_id, opened_by, reason, description, dispute_status, outcome, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  raiseIfError(error);
  return (data ?? []).map((dispute) => ({
    id: dispute.id,
    transactionId: dispute.transaction_id,
    openedBy: dispute.opened_by,
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.dispute_status,
    outcome: dispute.outcome,
    createdAt: dispute.created_at,
  }));
}

export async function fetchMembers(client: Client): Promise<MarketplaceMember[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, username, first_name, last_name, location, role, account_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  raiseIfError(error);
  return (data ?? []).map((profile) => ({
    id: profile.id,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    location: profile.location,
    role: profile.role,
    accountStatus: profile.account_status,
    createdAt: profile.created_at,
  }));
}

export async function fetchAnnouncements(client: Client, includeUnpublished = false) {
  let query = client
    .from("announcements")
    .select("id, title, body, is_published, published_at")
    .order("published_at", { ascending: false })
    .limit(20);
  if (!includeUnpublished) query = query.eq("is_published", true);
  const { data, error } = await query;
  raiseIfError(error);
  return (data ?? []).map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    isPublished: announcement.is_published,
    publishedAt: announcement.published_at ?? "",
  }));
}

export async function changeReportStatus(
  client: Client,
  reportId: string,
  status: MarketplaceReport["status"],
): Promise<void> {
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in with a staff account to review reports.");
  const { error } = await client
    .from("reports")
    .update({ report_status: status, reviewed_by: userResult.user.id })
    .eq("id", reportId);
  raiseIfError(error);
}

export async function changeAccountStatus(
  client: Client,
  memberId: string,
  status: "active" | "suspended",
  reason: string,
): Promise<void> {
  const { error } = await client.rpc("admin_set_account_status", {
    member_uuid: memberId,
    desired_status: status,
    action_reason: reason.trim(),
  });
  raiseIfError(error);
}

export async function changeDispute(
  client: Client,
  disputeId: string,
  status: MarketplaceDispute["status"],
  outcome: string,
): Promise<void> {
  const { error } = await client
    .from("disputes")
    .update({ dispute_status: status, outcome: outcome.trim() })
    .eq("id", disputeId);
  raiseIfError(error);
}

export async function createDispute(
  client: Client,
  transactionId: string,
  reason: string,
  description: string,
): Promise<void> {
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in to open a dispute.");
  const { error } = await client.from("disputes").insert({
    transaction_id: transactionId,
    opened_by: userResult.user.id,
    reason,
    description: description.trim(),
  });
  raiseIfError(error);
}

export async function saveAnnouncement(
  client: Client,
  announcement: { id?: string; title: string; body: string; isPublished: boolean },
): Promise<void> {
  if (announcement.id) {
    const { error } = await client
      .from("announcements")
      .update({
        title: announcement.title.trim(),
        body: announcement.body.trim(),
        is_published: announcement.isPublished,
        published_at: announcement.isPublished ? new Date().toISOString() : null,
      })
      .eq("id", announcement.id);
    raiseIfError(error);
    return;
  }
  const { data: userResult, error: userError } = await client.auth.getUser();
  raiseIfError(userError);
  if (!userResult.user) throw new Error("Sign in with an administrator account to publish announcements.");
  const { error } = await client.from("announcements").insert({
    title: announcement.title.trim(),
    body: announcement.body.trim(),
    is_published: announcement.isPublished,
    published_at: announcement.isPublished ? new Date().toISOString() : null,
    created_by: userResult.user.id,
  });
  raiseIfError(error);
}

export async function changeMemberRole(client: Client, memberId: string, role: UserRole): Promise<void> {
  const { error } = await client.rpc("admin_set_member_role", {
    member_uuid: memberId,
    desired_role: role,
  });
  raiseIfError(error);
}

export async function fetchAccountUser(
  client: Client,
  userId: string,
  email: string,
): Promise<import("@/types").MarketplaceUser> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, username, first_name, last_name, location, description, role, account_status")
    .eq("id", userId)
    .single();
  raiseIfError(error);
  if (!profile) throw new Error("The marketplace profile could not be found.");

  const { data: contact, error: contactError } = await client
    .from("user_contacts")
    .select("contact_information")
    .eq("user_id", userId)
    .maybeSingle();
  raiseIfError(contactError);

  return {
    id: profile.id,
    email,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    location: profile.location,
    description: profile.description,
    role: profile.role,
    accountStatus: profile.account_status,
    contactInformation: contact?.contact_information ?? "",
  };
}

export async function saveAccountProfile(
  client: Client,
  userId: string,
  changes: {
    firstName: string;
    lastName: string;
    location: string;
    description: string;
    contactInformation: string;
  },
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({
      first_name: changes.firstName.trim(),
      last_name: changes.lastName.trim(),
      location: changes.location.trim(),
      description: changes.description.trim(),
    })
    .eq("id", userId);
  raiseIfError(error);

  const { error: contactError } = await client
    .from("user_contacts")
    .upsert(
      { user_id: userId, contact_information: changes.contactInformation.trim() },
      { onConflict: "user_id" },
    );
  raiseIfError(contactError);
}

export async function startSelling(client: Client): Promise<void> {
  const { error } = await client.rpc("become_seller", {});
  raiseIfError(error);
}

export async function fetchFavorites(client: Client, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);
  raiseIfError(error);
  return (data ?? []).map((favorite) => favorite.listing_id);
}

export async function setFavorite(
  client: Client,
  userId: string,
  listingId: string,
  isFavorite: boolean,
): Promise<void> {
  if (isFavorite) {
    const { error } = await client.from("favorites").insert({ user_id: userId, listing_id: listingId });
    raiseIfError(error);
  } else {
    const { error } = await client
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    raiseIfError(error);
  }
}
