"use client";

import {
  AlertTriangle,
  Check,
  CircleHelp,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountPanel } from "@/components/account-panel";
import { AdminPanel } from "@/components/admin-panel";
import { AuthenticationDialog, type AuthInput, MessageComposerDialog, MessageDialog, ReportDialog } from "@/components/action-dialogs";
import { CatalogView } from "@/components/catalog-view";
import { CartDialog, CompareDialog, ListingDetailDialog, type CartDisplayLine, Dialog } from "@/components/dialogs";
import { InboxPanel } from "@/components/inbox-panel";
import { SellerPanel } from "@/components/seller-panel";
import { SiteFooter, SiteHeader, type WorkspaceView } from "@/components/site-chrome";
import { TransactionsPanel, type TransactionAction } from "@/components/transactions-panel";
import { demoDisputes, demoMembers, demoReports, demoTransactions } from "@/lib/demo-data";
import type { BrowserSupabaseClient } from "@/lib/supabase/client";
import {
  addCartItem,
  cancelTransaction,
  changeAccountStatus,
  changeCartItemQuantity,
  changeDispute,
  changeMemberRole,
  changeReportStatus,
  createDispute,
  createListing,
  createRating,
  createReport,
  fetchAccountUser,
  fetchAnnouncements,
  fetchCart,
  fetchDisputes,
  fetchFavorites,
  fetchListings,
  fetchMembers,
  fetchMessages,
  fetchReports,
  fetchTransactions,
  removeCartItem,
  saveAccountProfile,
  saveAnnouncement,
  sendMessage,
  setFavorite,
  setListingStatus,
  startSelling,
  submitPurchaseRequest,
  updateListing,
  updateTransactionStatus,
  uploadListingImage,
} from "@/lib/marketplace-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  demoAnnouncements as seedAnnouncements,
  demoBuyer as seedBuyer,
  demoSeller as seedSeller,
  demoListings as seedListings,
} from "@/lib/demo-data";
import type {
  Announcement,
  CartLine,
  FulfillmentMethod,
  ListingDraft,
  ListingFilters,
  MarketplaceConversation,
  MarketplaceDispute,
  MarketplaceListing,
  MarketplaceMember,
  MarketplaceReport,
  MarketplaceTransaction,
  MarketplaceUser,
  UserRole,
} from "@/types";

type PendingIntent =
  | { kind: "message"; listingId: string }
  | { kind: "report"; listingId: string; target: "listing" | "seller" }
  | { kind: "add-to-cart"; listingId: string }
  | null;

interface ListingConfirmation {
  listing: MarketplaceListing;
  action: "sold" | "removed";
}

const defaultFilters: ListingFilters = {
  query: "",
  game: "",
  setName: "",
  condition: "",
  rarity: "",
  minPrice: "",
  maxPrice: "",
  sort: "recent",
};

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function localId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function demoMemberForRole(role: UserRole, email: string, username: string): MarketplaceUser {
  const known = role === "seller" ? seedSeller : role === "buyer" ? seedBuyer : null;
  if (known) return { ...known, email: email || known.email, username: username || known.username };
  return {
    id: `preview-${role}`,
    email: email || `${role}@example.test`,
    username: username || (role === "admin" ? "asphodel_admin" : "marketplace_moderator"),
    firstName: role === "admin" ? "Morgan" : "Riley",
    lastName: "Staff",
    location: "Metro Manila",
    description: "Marketplace staff preview profile.",
    role,
    accountStatus: "active",
  };
}

export function Marketplace() {
  const [supabase, setSupabase] = useState<BrowserSupabaseClient | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const [user, setUser] = useState<MarketplaceUser | null>(null);
  const [view, setView] = useState<WorkspaceView>("shop");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [sellerError, setSellerError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>(seedListings);
  const [announcements, setAnnouncements] = useState<Announcement[]>(seedAnnouncements);
  const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
  const [messages, setMessages] = useState<MarketplaceConversation[]>([]);
  const [reports, setReports] = useState<MarketplaceReport[]>(demoReports);
  const [disputes, setDisputes] = useState<MarketplaceDispute[]>(demoDisputes);
  const [members, setMembers] = useState<MarketplaceMember[]>(demoMembers);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ListingFilters>(defaultFilters);
  const [savedOnly, setSavedOnly] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showAuth, setShowAuth] = useState(false);
  const [authRoleDefault, setAuthRoleDefault] = useState<UserRole>("buyer");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [messageListing, setMessageListing] = useState<MarketplaceListing | null>(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ id: string; name: string; listingId: string | null } | null>(null);
  const [reportListing, setReportListing] = useState<MarketplaceListing | null>(null);
  const [reportTarget, setReportTarget] = useState<"listing" | "seller">("listing");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [listingConfirmation, setListingConfirmation] = useState<ListingConfirmation | null>(null);
  const [becomeSellerOpen, setBecomeSellerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pendingIntentRef = useRef<PendingIntent>(null);
  const pendingViewRef = useRef<WorkspaceView | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const isPreview = clientReady && !supabase;

  useEffect(() => {
    setSupabase(getSupabaseBrowserClient());
    setClientReady(true);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("asphodel-theme");
    const savedTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    const storedFavorites = window.localStorage.getItem("asphodel-favorites");
    if (storedFavorites) {
      try {
        const parsed: unknown = JSON.parse(storedFavorites);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
          setSavedIds(parsed);
        }
      } catch {
        window.localStorage.removeItem("asphodel-favorites");
      }
    }
    setFavoritesReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("asphodel-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!favoritesReady) return;
    window.localStorage.setItem("asphodel-favorites", JSON.stringify(savedIds));
  }, [favoritesReady, savedIds]);

  useEffect(() => {
    if (!clientReady) return;
    let active = true;

    async function loadPublicData() {
      if (!supabase) {
        setListings(seedListings);
        setAnnouncements(seedAnnouncements);
        setCatalogLoading(false);
        return;
      }

      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [items, news] = await Promise.all([
          fetchListings(supabase),
          fetchAnnouncements(supabase),
        ]);
        if (!active) return;
        setListings(items);
        setAnnouncements(news);
      } catch (error) {
        if (!active) return;
        setListings([]);
        setCatalogError(messageFromError(error, "Listings could not be loaded."));
      } finally {
        if (active) setCatalogLoading(false);
      }

      const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (active) setWorkspaceError(sessionError.message);
        return;
      }
      if (sessionResult.session?.user && active) {
        try {
          const account = await fetchAccountUser(
            supabase,
            sessionResult.session.user.id,
            sessionResult.session.user.email ?? "",
          );
          if (active) setUser(account);
        } catch (error) {
          if (active) setWorkspaceError(messageFromError(error, "Your account could not be loaded."));
        }
      }
    }

    void loadPublicData();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        setUser(null);
        setView("shop");
      }
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [clientReady, supabase]);

  useEffect(() => {
    if (!user) return;
    if (!supabase || user.id.startsWith("preview-")) {
      if (!supabase) {
        const previewUser = user;
        const relevantTransactions = previewUser.role === "admin" || previewUser.role === "moderator"
          ? demoTransactions
          : demoTransactions.filter((transaction) => transaction.buyerId === previewUser.id || transaction.sellerId === previewUser.id);
        setTransactions(relevantTransactions);
        setMessages(createPreviewMessages(previewUser));
        if (previewUser.role === "admin" || previewUser.role === "moderator") setReports(demoReports);
        if (previewUser.role === "admin") {
          setMembers(demoMembers);
          setDisputes(demoDisputes);
          setAnnouncements(seedAnnouncements);
        }
      }
      return;
    }

    const activeUser = user;
    const activeClient = supabase;
    let active = true;
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    async function loadAccountWorkspace() {
      try {
        const isStaff = activeUser.role === "admin" || activeUser.role === "moderator";
        const isAdmin = activeUser.role === "admin";
        const [
          cartItems,
          favoriteIds,
          userTransactions,
          inbox,
          sellerListings,
          staffReports,
          staffDisputes,
          staffMembers,
          staffAnnouncements,
        ] = await Promise.all([
          fetchCart(activeClient, activeUser.id),
          fetchFavorites(activeClient, activeUser.id),
          fetchTransactions(activeClient, activeUser.id, isAdmin),
          fetchMessages(activeClient, activeUser.id),
          activeUser.role === "seller" || isStaff
            ? fetchListings(activeClient, { sellerId: activeUser.id, includeUnavailable: true })
            : Promise.resolve([]),
          isStaff ? fetchReports(activeClient) : Promise.resolve([]),
          isAdmin ? fetchDisputes(activeClient) : Promise.resolve([]),
          isAdmin ? fetchMembers(activeClient) : Promise.resolve([]),
          fetchAnnouncements(activeClient, isAdmin),
        ]);
        if (!active) return;
        setCart(cartItems);
        setSavedIds(favoriteIds);
        setTransactions(userTransactions);
        setMessages(inbox);
        setReports(staffReports);
        setDisputes(staffDisputes);
        if (isAdmin) setMembers(staffMembers);
        setAnnouncements(staffAnnouncements);

        const [publicListings, cartListings] = await Promise.all([
          fetchListings(activeClient),
          fetchListings(activeClient, { ids: cartItems.map((item) => item.listingId), includeUnavailable: true }),
        ]);
        if (!active) return;
        const combinedListings = new Map<string, MarketplaceListing>();
        [...publicListings, ...sellerListings, ...cartListings].forEach((listing) => combinedListings.set(listing.id, listing));
        setListings([...combinedListings.values()]);
      } catch (error) {
        if (active) setWorkspaceError(messageFromError(error, "Your marketplace workspace could not be loaded."));
      } finally {
        if (active) setWorkspaceLoading(false);
      }
    }

    void loadAccountWorkspace();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!toastMessage) return;
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4200);
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [toastMessage]);

  const visibleCart = useMemo((): CartDisplayLine[] => {
    const listingById = new Map(listings.map((listing) => [listing.id, listing]));
    return cart.flatMap((line) => {
      const listing = listingById.get(line.listingId);
      return listing ? [{ listing, quantity: line.quantity }] : [];
    });
  }, [cart, listings]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const selectedForCompare = useMemo(
    () => compareIds.flatMap((id) => {
      const listing = listings.find((item) => item.id === id);
      return listing ? [listing] : [];
    }),
    [compareIds, listings],
  );
  const currentAnnouncement = announcements.find((announcement) => announcement.isPublished);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function changeFilter<K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function requestAuthentication(options: { view?: WorkspaceView; intent?: PendingIntent; role?: UserRole } = {}) {
    pendingViewRef.current = options.view ?? null;
    pendingIntentRef.current = options.intent ?? null;
    setAuthRoleDefault(options.role ?? "buyer");
    setAuthError(null);
    setShowAuth(true);
  }

  async function activatePreviewUser(input: AuthInput): Promise<MarketplaceUser> {
    const username = input.username.trim() || (input.role === "seller" ? seedSeller.username : input.role === "buyer" ? seedBuyer.username : "");
    const previewUser = demoMemberForRole(input.role, input.email.trim(), username);
    if (input.role === "buyer" || input.role === "seller") {
      setMembers((current) => current.some((member) => member.id === previewUser.id)
        ? current
        : [...current, {
            id: previewUser.id,
            username: previewUser.username,
            firstName: previewUser.firstName,
            lastName: previewUser.lastName,
            location: previewUser.location,
            role: previewUser.role,
            accountStatus: previewUser.accountStatus,
            createdAt: new Date().toISOString(),
          }]);
    }
    return previewUser;
  }

  async function handleAuthenticate(input: AuthInput) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      let authenticatedUser: MarketplaceUser;
      if (!supabase) {
        authenticatedUser = await activatePreviewUser(input);
      } else if (input.mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            data: {
              username: input.username.trim(),
              role: input.role === "seller" ? "seller" : "buyer",
            },
          },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setAuthError("Check your email to confirm the new account, then sign in here.");
          return;
        }
        authenticatedUser = await fetchAccountUser(supabase, data.user.id, data.user.email ?? input.email);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: input.email.trim(),
          password: input.password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("The sign-in completed without an account session.");
        authenticatedUser = await fetchAccountUser(supabase, data.user.id, data.user.email ?? input.email);
      }

      setUser(authenticatedUser);
      setShowAuth(false);
      setWorkspaceError(null);
      const nextView = pendingViewRef.current;
      const pendingIntent = pendingIntentRef.current;
      pendingViewRef.current = null;
      pendingIntentRef.current = null;

      if (nextView) {
        if (nextView === "seller" && authenticatedUser.role === "buyer") {
          setBecomeSellerOpen(true);
        } else {
          setView(nextView);
        }
      }
      if (pendingIntent?.kind === "add-to-cart") {
        const listing = listings.find((item) => item.id === pendingIntent.listingId);
        if (listing) await addListingToCart(listing, authenticatedUser);
      } else if (pendingIntent?.kind === "message") {
        const listing = listings.find((item) => item.id === pendingIntent.listingId);
        if (listing) setMessageListing(listing);
      } else if (pendingIntent?.kind === "report") {
        const listing = listings.find((item) => item.id === pendingIntent.listingId);
        if (listing) {
          setReportListing(listing);
          setReportTarget(pendingIntent.target);
        }
      }
      showToast(`Welcome, ${authenticatedUser.username}.`);
    } catch (error) {
      setAuthError(messageFromError(error, "We could not complete the sign-in."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (supabase && user && !user.id.startsWith("preview-")) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setProfileError(error.message);
        return;
      }
    }
    setUser(null);
    setView("shop");
    setCart([]);
    setTransactions([]);
    setMessages([]);
    setProfileError(null);
    showToast("You have signed out.");
  }

  function handleNavigate(target: WorkspaceView) {
    if (target === "shop") {
      setView("shop");
      return;
    }
    if (!user) {
      requestAuthentication({ view: target, role: target === "seller" ? "seller" : "buyer" });
      return;
    }
    if (user.accountStatus === "suspended" && target !== "account") {
      showToast("This account is currently suspended. Browse read-only or contact marketplace staff.");
      return;
    }
    if (target === "seller" && user.role === "buyer") {
      setBecomeSellerOpen(true);
      return;
    }
    if (target === "staff" && user.role !== "admin" && user.role !== "moderator") {
      showToast("The staff workspace is available to authorized marketplace staff only.");
      return;
    }
    setView(target);
  }

  async function handleBecomeSeller() {
    if (!user) {
      requestAuthentication({ view: "seller", role: "seller" });
      return;
    }
    if (user.role === "buyer") {
      setBecomeSellerOpen(true);
      return;
    }
    setView("seller");
  }

  async function confirmBecomeSeller() {
    if (!user) return;
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        await startSelling(supabase);
      }
      const updatedUser = { ...user, role: "seller" as const };
      setUser(updatedUser);
      setMembers((current) => current.map((member) => member.id === user.id ? { ...member, role: "seller" } : member));
      setBecomeSellerOpen(false);
      setView("seller");
      showToast("Your seller studio is ready. You can still browse and request cards.");
    } catch (error) {
      setWorkspaceError(messageFromError(error, "Seller access could not be enabled."));
    }
  }

  async function addListingToCart(listing: MarketplaceListing, authenticatedUser = user) {
    if (supabase && !authenticatedUser) {
      requestAuthentication({ intent: { kind: "add-to-cart", listingId: listing.id }, role: "buyer" });
      return;
    }
    if (listing.status !== "active" || listing.quantity < 1) {
      showToast("That listing is no longer available.");
      return;
    }
    if (authenticatedUser?.id === listing.seller.id) {
      showToast("You cannot submit a purchase request for your own listing.");
      return;
    }
    const previousCart = cart;
    const existing = cart.find((line) => line.listingId === listing.id);
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > listing.quantity) {
      setCartError(`Only ${listing.quantity} ${listing.quantity === 1 ? "copy is" : "copies are"} currently available.`);
      setCartOpen(true);
      return;
    }
    setCart((current) => existing
      ? current.map((line) => line.listingId === listing.id ? { ...line, quantity: nextQuantity } : line)
      : [...current, { listingId: listing.id, quantity: 1 }]);
    setCartError(null);
    if (supabase && authenticatedUser && !authenticatedUser.id.startsWith("preview-")) {
      try {
        await addCartItem(supabase, listing.id, 1);
        const freshCart = await fetchCart(supabase, authenticatedUser.id);
        setCart(freshCart);
      } catch (error) {
        setCart(previousCart);
        setCartError(messageFromError(error, "This card could not be added to your cart."));
        setCartOpen(true);
        return;
      }
    }
    showToast(`${listing.product.name} added to your cart.`);
  }

  function handleFavorite(listingId: string) {
    const wasSaved = savedIds.includes(listingId);
    setSavedIds((current) => wasSaved ? current.filter((id) => id !== listingId) : [...current, listingId]);
    if (supabase && user && !user.id.startsWith("preview-")) {
      void setFavorite(supabase, user.id, listingId, !wasSaved).catch((error: unknown) => {
        setSavedIds((current) => wasSaved ? [...current, listingId] : current.filter((id) => id !== listingId));
        showToast(messageFromError(error, "That saved item could not be updated."));
      });
    }
  }

  function handleCompare(listingId: string) {
    setCompareIds((current) => {
      if (current.includes(listingId)) return current.filter((id) => id !== listingId);
      if (current.length >= 3) {
        showToast("Compare up to three listings at a time.");
        return current;
      }
      return [...current, listingId];
    });
  }

  function openMessage(listing: MarketplaceListing) {
    if (!user) {
      requestAuthentication({ intent: { kind: "message", listingId: listing.id } });
      return;
    }
    setSelectedListing(null);
    setMessageError(null);
    setMessageListing(listing);
  }

  function openReport(listing: MarketplaceListing) {
    if (!user) {
      requestAuthentication({ intent: { kind: "report", listingId: listing.id, target: "listing" } });
      return;
    }
    setSelectedListing(null);
    setReportError(null);
    setReportTarget("listing");
    setReportListing(listing);
  }

  function openSellerReport(listing: MarketplaceListing) {
    if (!user) {
      requestAuthentication({ intent: { kind: "report", listingId: listing.id, target: "seller" } });
      return;
    }
    setSelectedListing(null);
    setReportError(null);
    setReportTarget("seller");
    setReportListing(listing);
  }

  async function handleSendListingMessage(content: string) {
    if (!user || !messageListing) return;
    setMessageBusy(true);
    setMessageError(null);
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        await sendMessage(supabase, messageListing.seller.id, messageListing.id, content);
        setMessages(await fetchMessages(supabase, user.id));
      } else {
        setMessages((current) => [{
          id: localId("message"),
          listingId: messageListing.id,
          senderId: user.id,
          senderName: user.username,
          recipientId: messageListing.seller.id,
          recipientName: messageListing.seller.username,
          content,
          sentAt: new Date().toISOString(),
          readAt: null,
        }, ...current]);
      }
      setMessageListing(null);
      showToast("Your message was sent.");
    } catch (error) {
      setMessageError(messageFromError(error, "The message could not be sent."));
    } finally {
      setMessageBusy(false);
    }
  }

  async function handleInboxReply(recipientId: string, listingId: string | null, content: string) {
    if (!user) return;
    if (supabase && !user.id.startsWith("preview-")) {
      await sendMessage(supabase, recipientId, listingId, content);
      setMessages(await fetchMessages(supabase, user.id));
    } else {
      const recipient = members.find((member) => member.id === recipientId);
      setMessages((current) => [{
        id: localId("message"),
        listingId,
        senderId: user.id,
        senderName: user.username,
        recipientId,
        recipientName: recipient?.username ?? "Marketplace member",
        content,
        sentAt: new Date().toISOString(),
        readAt: null,
      }, ...current]);
    }
    showToast("Your reply was sent.");
  }

  async function handleSubmitReport(reason: string, description: string) {
    if (!user || !reportListing) return;
    setReportBusy(true);
    setReportError(null);
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        await createReport(
          supabase,
          reportTarget === "seller"
            ? { targetUserId: reportListing.seller.id }
            : { listingId: reportListing.id },
          reason,
          description,
        );
      } else {
        setReports((current) => [{
          id: localId("report"),
          reporterId: user.id,
          targetUserId: reportTarget === "seller" ? reportListing.seller.id : null,
          listingId: reportTarget === "listing" ? reportListing.id : null,
          reason,
          description,
          status: "pending",
          createdAt: new Date().toISOString(),
        }, ...current]);
      }
      setReportListing(null);
      showToast("Your report was sent to the moderation team.");
    } catch (error) {
      setReportError(messageFromError(error, "The report could not be submitted."));
    } finally {
      setReportBusy(false);
    }
  }

  async function handleCheckout(method: FulfillmentMethod, details: string) {
    if (!user) {
      setCartError("Sign in to submit a purchase request. Your cart will stay here.");
      requestAuthentication();
      return;
    }
    if (user.role === "admin" || user.role === "moderator") {
      setCartError("Staff preview accounts cannot submit purchase requests. Sign in as a buyer or seller.");
      return;
    }
    const eligibleCart = visibleCart.filter(({ listing }) => listing.fulfillmentMethods.includes(method));
    const invalid = eligibleCart.find(({ listing, quantity }) => listing.status !== "active" || quantity > listing.quantity);
    if (invalid) {
      setCartError(`${invalid.listing.product.name} is no longer available in the requested quantity. Update your cart and try again.`);
      return;
    }
    if (!eligibleCart.length) {
      setCartError(`No cart items offer ${method === "shipping" ? "shipping" : "local meetup"}.`);
      return;
    }

    setCheckoutBusy(true);
    setCartError(null);
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        const transactionIds = await submitPurchaseRequest(supabase, method, details);
        const remainingCart = await fetchCart(supabase, user.id);
        const [freshListings, remainingListings] = await Promise.all([
          fetchListings(supabase),
          fetchListings(supabase, { ids: remainingCart.map((item) => item.listingId), includeUnavailable: true }),
        ]);
        setListings((current) => {
          const result = new Map(current.map((listing) => [listing.id, listing]));
          [...freshListings, ...remainingListings].forEach((listing) => result.set(listing.id, listing));
          return [...result.values()];
        });
        setCart(remainingCart);
        setTransactions(await fetchTransactions(supabase, user.id));
        if (remainingCart.length === 0) setCartOpen(false);
        showToast(
          `${transactionIds.length} purchase request${transactionIds.length === 1 ? "" : "s"} submitted.`
          + (remainingCart.length ? " Remaining items are still in your cart." : " Confirm payment and fulfillment with each seller."),
        );
      } else {
        const grouped = new Map<string, CartDisplayLine[]>();
        eligibleCart.forEach((line) => grouped.set(line.listing.seller.id, [...(grouped.get(line.listing.seller.id) ?? []), line]));
        const created: MarketplaceTransaction[] = [...grouped.entries()].map(([sellerId, lines]) => {
          const seller = listings.find((listing) => listing.seller.id === sellerId)?.seller;
          return {
            id: localId("transaction"),
            buyerId: user.id,
            sellerId,
            orderId: localId("order"),
            status: "requested",
            paymentStatus: "pending",
            totalAmount: lines.reduce((sum, line) => sum + line.listing.price * line.quantity, 0),
            fulfillmentMethod: method,
            createdAt: new Date().toISOString(),
            itemSummary: lines.map((line) => `${line.quantity} × ${line.listing.product.name}`).join(", "),
            otherPartyId: sellerId,
            otherPartyName: seller?.username ?? "Marketplace seller",
          };
        });
        const purchased = new Set(eligibleCart.map((line) => line.listing.id));
        setListings((current) => current.map((listing) => purchased.has(listing.id)
          ? { ...listing, quantity: Math.max(0, listing.quantity - (cart.find((line) => line.listingId === listing.id)?.quantity ?? 0)), status: listing.quantity - (cart.find((line) => line.listingId === listing.id)?.quantity ?? 0) <= 0 ? "sold" : "active" }
          : listing));
        setTransactions((current) => [...created, ...current]);
        setCart((current) => current.filter((line) => !purchased.has(line.listingId)));
        if (eligibleCart.length === visibleCart.length) setCartOpen(false);
        showToast("Purchase request saved in this preview. No payment was collected.");
      }
    } catch (error) {
      setCartError(messageFromError(error, "Your purchase request could not be recorded."));
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function handleCartRemove(listingId: string) {
    const previous = cart;
    setCart((current) => current.filter((line) => line.listingId !== listingId));
    setCartError(null);
    if (supabase && user && !user.id.startsWith("preview-")) {
      try {
        await removeCartItem(supabase, user.id, listingId);
      } catch (error) {
        setCart(previous);
        setCartError(messageFromError(error, "The item could not be removed from your cart."));
      }
    }
  }

  async function handleCartQuantity(listingId: string, quantity: number) {
    if (quantity <= 0) {
      await handleCartRemove(listingId);
      return;
    }
    const listing = listings.find((item) => item.id === listingId);
    if (!listing || quantity > listing.quantity) {
      setCartError("That quantity is no longer available.");
      return;
    }
    const previous = cart;
    setCart((current) => current.map((line) => line.listingId === listingId ? { ...line, quantity } : line));
    setCartError(null);
    if (supabase && !user?.id.startsWith("preview-") && user) {
      try {
        await changeCartItemQuantity(supabase, listingId, quantity);
      } catch (error) {
        setCart(previous);
        setCartError(messageFromError(error, "The cart quantity could not be updated."));
      }
    }
  }

  async function handleCreateListing(draft: ListingDraft) {
    if (!user) return;
    setSellerError(null);
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        const listingId = await createListing(supabase, draft);
        let photoError: string | null = null;
        if (draft.imageFile) {
          try {
            await uploadListingImage(supabase, listingId, draft.imageFile);
          } catch (error) {
            photoError = messageFromError(error, "The listing photo could not be uploaded.");
          }
        }
        const [publicListings, sellerListings] = await Promise.all([
          fetchListings(supabase),
          fetchListings(supabase, { sellerId: user.id, includeUnavailable: true }),
        ]);
        const combined = new Map([...listings, ...publicListings, ...sellerListings].map((listing) => [listing.id, listing]));
        setListings([...combined.values()]);
        if (photoError) {
          setSellerError(`Listing published, but its photo could not be uploaded: ${photoError}`);
          showToast("Listing published; the photo upload failed.");
          return;
        }
      } else {
        const listing: MarketplaceListing = {
          id: localId("listing"),
          product: {
            id: localId("product"),
            name: draft.name.trim(),
            game: draft.game,
            setName: draft.setName.trim(),
            cardNumber: draft.cardNumber.trim(),
            rarity: draft.rarity.trim(),
            productType: draft.productType.trim(),
            description: draft.description.trim(),
            art: 1 + Math.floor(Math.random() * 10),
          },
          seller: { id: user.id, username: user.username, location: user.location, description: user.description },
          condition: draft.condition,
          quantity: draft.quantity,
          price: draft.price,
          fulfillmentMethods: draft.fulfillmentMethods,
          listedAt: new Date().toISOString(),
          status: "active",
        };
        setListings((current) => [listing, ...current]);
      }
      showToast("Your listing is now available in the marketplace.");
    } catch (error) {
      setSellerError(messageFromError(error, "The listing could not be created."));
      throw error;
    }
  }

  async function handleEditListing(listing: MarketplaceListing, draft: ListingDraft) {
    setSellerError(null);
    try {
      if (supabase && user && !user.id.startsWith("preview-")) {
        await updateListing(supabase, listing.id, draft);
      }
      setListings((current) => current.map((item) => item.id === listing.id ? {
        ...item,
        condition: draft.condition,
        quantity: draft.quantity,
        price: draft.price,
        fulfillmentMethods: draft.fulfillmentMethods,
      } : item));
      showToast("Your listing has been updated.");
    } catch (error) {
      setSellerError(messageFromError(error, "The listing could not be updated."));
      throw error;
    }
  }

  async function confirmListingAction() {
    if (!listingConfirmation) return;
    const { listing, action } = listingConfirmation;
    try {
      if (supabase && user && !user.id.startsWith("preview-")) {
        await setListingStatus(supabase, listing.id, action);
      }
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: action, quantity: action === "sold" ? 0 : item.quantity } : item));
      setListingConfirmation(null);
      showToast(action === "sold" ? "Listing marked as sold." : "Listing removed from discovery.");
    } catch (error) {
      setSellerError(messageFromError(error, "The listing status could not be changed."));
      setListingConfirmation(null);
    }
  }

  async function handleProfileSave(changes: {
    firstName: string;
    lastName: string;
    location: string;
    description: string;
    contactInformation: string;
  }) {
    if (!user) return;
    setProfileError(null);
    try {
      if (supabase && !user.id.startsWith("preview-")) {
        await saveAccountProfile(supabase, user.id, changes);
      }
      setUser({ ...user, ...changes });
      showToast("Your profile has been updated.");
    } catch (error) {
      setProfileError(messageFromError(error, "Your profile could not be saved."));
    }
  }

  async function handleTransactionAction(transaction: MarketplaceTransaction, action: TransactionAction) {
    try {
      const nextStatus: MarketplaceTransaction["status"] = action === "accept" ? "accepted"
        : action === "ship" ? "shipped"
          : action === "complete" ? "completed" : "cancelled";
      if (supabase && !user?.id.startsWith("preview-") && user) {
        if (action === "cancel") await cancelTransaction(supabase, transaction.id);
        else await updateTransactionStatus(supabase, transaction.id, nextStatus);
        setTransactions(await fetchTransactions(supabase, user.id, user.role === "admin"));
      } else {
        setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status: nextStatus } : item));
      }
      showToast(`Transaction marked ${nextStatus}.`);
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The transaction could not be updated."));
    }
  }

  async function handleReview(transaction: MarketplaceTransaction, stars: number, review: string) {
    if (!user) throw new Error("Sign in to leave a review.");
    if (supabase && !user.id.startsWith("preview-")) {
      await createRating(supabase, transaction.id, transaction.sellerId, stars, review);
    }
    setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, reviewed: true } : item));
    showToast("Thank you. Your seller review was recorded.");
  }

  async function handleDispute(transaction: MarketplaceTransaction, reason: string, description: string) {
    if (!user) throw new Error("Sign in to open a dispute.");
    if (supabase && !user.id.startsWith("preview-")) {
      await createDispute(supabase, transaction.id, reason, description);
      setDisputes(await fetchDisputes(supabase));
    } else {
      setDisputes((current) => [{
        id: localId("dispute"),
        transactionId: transaction.id,
        openedBy: user.id,
        reason,
        description,
        status: "open",
        outcome: "",
        createdAt: new Date().toISOString(),
      }, ...current]);
    }
    showToast("Your dispute was sent for marketplace review.");
  }

  async function handleAdminReport(reportId: string, status: MarketplaceReport["status"]) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await changeReportStatus(supabase, reportId, status);
      setReports((current) => current.map((report) => report.id === reportId ? { ...report, status } : report));
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The report status could not be updated."));
    }
  }

  async function handleAdminRemoveListing(listingId: string) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await setListingStatus(supabase, listingId, "removed");
      setListings((current) => current.map((listing) => listing.id === listingId ? { ...listing, status: "removed" } : listing));
      showToast("The listing was removed from active discovery.");
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The listing could not be removed."));
    }
  }

  async function handleAdminDispute(disputeId: string, status: MarketplaceDispute["status"], outcome: string) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await changeDispute(supabase, disputeId, status, outcome);
      setDisputes((current) => current.map((dispute) => dispute.id === disputeId ? { ...dispute, status, outcome } : dispute));
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The dispute could not be updated."));
    }
  }

  async function handleAdminMemberStatus(memberId: string, status: "active" | "suspended", reason: string) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await changeAccountStatus(supabase, memberId, status, reason);
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, accountStatus: status } : member));
      showToast(status === "suspended" ? "Account access suspended." : "Account access restored.");
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The member account could not be updated."));
    }
  }

  async function handleAdminMemberRole(memberId: string, role: UserRole) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await changeMemberRole(supabase, memberId, role);
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role } : member));
      showToast("Member role updated.");
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The member role could not be updated."));
    }
  }

  async function handleAnnouncementSave(item: { id?: string; title: string; body: string; isPublished: boolean }) {
    try {
      if (supabase && user && !user.id.startsWith("preview-")) await saveAnnouncement(supabase, item);
      const timestamp = new Date().toISOString();
      setAnnouncements((current) => {
        if (item.id) return current.map((announcement) => announcement.id === item.id ? {
          ...announcement,
          title: item.title,
          body: item.body,
          isPublished: item.isPublished,
          publishedAt: item.isPublished ? timestamp : "",
        } : announcement);
        return [{
          id: localId("announcement"),
          title: item.title,
          body: item.body,
          isPublished: item.isPublished,
          publishedAt: item.isPublished ? timestamp : "",
        }, ...current];
      });
      showToast(item.isPublished ? "Announcement published." : "Announcement saved as a draft.");
    } catch (error) {
      setWorkspaceError(messageFromError(error, "The announcement could not be saved."));
      throw error;
    }
  }

  function toggleSavedOnly() {
    setView("shop");
    setSavedOnly((current) => !current);
  }

  function toggleTheme() {
    setTheme((current) => current === "light" ? "dark" : "light");
  }

  const roleIsStaff = user?.role === "admin" || user?.role === "moderator";
  const sellerListings = user
    ? listings.filter((listing) => listing.seller.id === user.id)
    : [];
  const cartDisplayError = cart.some((line) => !listings.some((listing) => listing.id === line.listingId))
    ? "Some saved cart items are no longer available. Remove them or refresh after signing in."
    : cartError;

  return (
    <div className="app-shell">
      <SiteHeader
        user={user}
        view={view}
        query={filters.query}
        savedCount={savedIds.length}
        cartCount={cartCount}
        theme={theme}
        onQueryChange={(query) => changeFilter("query", query)}
        onSearch={() => { setView("shop"); setSavedOnly(false); }}
        onNavigate={handleNavigate}
        onShowSaved={toggleSavedOnly}
        onCart={() => { setCartError(null); setCartOpen(true); }}
        onToggleTheme={toggleTheme}
      />
      <main className="page-frame">
        {isPreview && (
          <div className="preview-banner" role="status">
            <CircleHelp size={15} aria-hidden="true" />
            <span><strong>Preview mode.</strong> Listings and sample accounts are illustrative; actions are kept in this browser only. Add Supabase credentials and run the included schema to persist real data.</span>
          </div>
        )}
        {messageTarget && (
          <MessageComposerDialog
            recipientName={messageTarget.name}
            busy={messageBusy}
            error={messageError}
            onClose={() => setMessageTarget(null)}
            onSubmit={async (content) => {
              if (!user) return;
              setMessageBusy(true);
              setMessageError(null);
              try {
                await handleInboxReply(messageTarget.id, messageTarget.listingId, content);
                setMessageTarget(null);
              } catch (error) {
                setMessageError(messageFromError(error, "The message could not be sent."));
              } finally {
                setMessageBusy(false);
              }
            }}
          />
        )}
        {view === "shop" && (
          <CatalogView
            listings={listings}
            filters={filters}
            savedIds={savedIds}
            savedOnly={savedOnly}
            compareIds={compareIds}
            loading={catalogLoading}
            error={catalogError}
            announcement={currentAnnouncement}
            onFilterChange={changeFilter}
            onClearFilters={() => { setFilters(defaultFilters); setSavedOnly(false); }}
            onToggleSavedOnly={toggleSavedOnly}
            onOpenListing={setSelectedListing}
            onFavorite={handleFavorite}
            onCompare={handleCompare}
            onAddToCart={(listing) => void addListingToCart(listing)}
            onBecomeSeller={() => void handleBecomeSeller()}
            onOpenCompare={() => setCompareOpen(true)}
          />
        )}
        {view === "seller" && user && (
          <SellerPanel
            listings={sellerListings}
            busy={false}
            error={sellerError}
            preview={isPreview}
            onCreate={handleCreateListing}
            onEdit={handleEditListing}
            onRemove={(listing) => setListingConfirmation({ listing, action: "removed" })}
            onMarkSold={(listing) => setListingConfirmation({ listing, action: "sold" })}
          />
        )}
        {view === "transactions" && user && (
          <TransactionsPanel
            transactions={transactions}
            user={user}
            loading={workspaceLoading}
            error={workspaceError}
            onAction={handleTransactionAction}
            onMessage={(transaction) => {
              if (!transaction.otherPartyId) return;
              setMessageError(null);
              setMessageTarget({
                id: transaction.otherPartyId,
                name: transaction.otherPartyName ?? "Marketplace member",
                listingId: null,
              });
            }}
            onReview={handleReview}
            onDispute={handleDispute}
          />
        )}
        {view === "inbox" && user && (
          <InboxPanel
            messages={messages}
            user={user}
            loading={workspaceLoading}
            error={workspaceError}
            onSend={handleInboxReply}
          />
        )}
        {view === "account" && user && (
          <AccountPanel
            user={user}
            busy={false}
            error={profileError}
            onSave={handleProfileSave}
            onSignOut={() => void handleSignOut()}
          />
        )}
        {view === "staff" && user && roleIsStaff && (
          <AdminPanel
            role={user.role}
            reports={reports}
            transactions={transactions}
            disputes={disputes}
            members={members}
            announcements={announcements}
            listings={listings}
            loading={workspaceLoading}
            error={workspaceError}
            onReportStatus={handleAdminReport}
            onRemoveListing={handleAdminRemoveListing}
            onDisputeUpdate={handleAdminDispute}
            onMemberStatus={handleAdminMemberStatus}
            onMemberRole={handleAdminMemberRole}
            onAnnouncementSave={handleAnnouncementSave}
          />
        )}
        {user?.accountStatus === "suspended" && (
          <p className="alert suspended-banner" role="alert"><AlertTriangle size={15} />This account is suspended. You can review your profile, but selling, messaging, and purchase requests are unavailable.</p>
        )}
      </main>
      <SiteFooter onNavigate={handleNavigate} />

      {selectedListing && (
        <ListingDetailDialog
          listing={selectedListing}
          isFavorite={savedIds.includes(selectedListing.id)}
          onClose={() => setSelectedListing(null)}
          onAddToCart={(listing) => void addListingToCart(listing)}
          onMessage={openMessage}
          onReport={openReport}
          onReportSeller={openSellerReport}
          onFavorite={handleFavorite}
        />
      )}
      {messageListing && (
        <MessageDialog
          listing={messageListing}
          busy={messageBusy}
          error={messageError}
          onClose={() => setMessageListing(null)}
          onSubmit={({ content }) => handleSendListingMessage(content)}
        />
      )}
      {reportListing && (
        <ReportDialog
          targetName={reportTarget === "seller" ? reportListing.seller.username : reportListing.product.name}
          targetType={reportTarget}
          busy={reportBusy}
          error={reportError}
          onClose={() => setReportListing(null)}
          onSubmit={handleSubmitReport}
        />
      )}
      {cartOpen && (
        <CartDialog
          lines={visibleCart}
          busy={checkoutBusy}
          error={cartDisplayError}
          onClose={() => setCartOpen(false)}
          onChangeQuantity={(listingId, quantity) => void handleCartQuantity(listingId, quantity)}
          onRemove={(listingId) => void handleCartRemove(listingId)}
          onCheckout={handleCheckout}
        />
      )}
      {compareOpen && (
        <CompareDialog
          listings={selectedForCompare}
          onClose={() => setCompareOpen(false)}
          onOpen={(listing) => { setCompareOpen(false); setSelectedListing(listing); }}
        />
      )}
      {showAuth && (
        <AuthenticationDialog
          preview={!supabase}
          busy={authBusy}
          error={authError}
          initialRole={authRoleDefault}
          onClose={() => { setShowAuth(false); pendingViewRef.current = null; pendingIntentRef.current = null; }}
          onSubmit={handleAuthenticate}
        />
      )}
      {listingConfirmation && (
        <Dialog
          title={listingConfirmation.action === "sold" ? "Mark this card as sold?" : "Remove this listing?"}
          description={listingConfirmation.listing.product.name}
          narrow
          onClose={() => setListingConfirmation(null)}
        >
          <p className="dialog-message">
            {listingConfirmation.action === "sold"
              ? "The listing will no longer appear in active discovery."
              : "The listing will be hidden from buyers. You can review its status in your seller studio."}
          </p>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setListingConfirmation(null)}>Keep listing</button>
            <button type="button" className="button" onClick={() => void confirmListingAction()}>
              <Check size={14} /> Confirm
            </button>
          </div>
        </Dialog>
      )}
      {becomeSellerOpen && user && (
        <Dialog title="Open your seller studio?" description="One account can browse, request cards, and publish its own listings." narrow onClose={() => setBecomeSellerOpen(false)}>
          <div className="seller-upgrade">
            <span className="empty-state-icon"><Store size={23} /></span>
            <p>Your profile role will change to <strong>seller</strong>. Your existing profile and transaction history stay with you.</p>
          </div>
          {workspaceError && <p className="alert" role="alert">{workspaceError}</p>}
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setBecomeSellerOpen(false)}>Not now</button>
            <button type="button" className="button" onClick={() => void confirmBecomeSeller()}><Store size={14} /> Become a seller</button>
          </div>
        </Dialog>
      )}
      {toastMessage && (
        <div className="toast-stack" role="status" aria-live="polite">
          <div className="toast"><Check size={15} /><span>{toastMessage}</span></div>
        </div>
      )}
    </div>
  );
}

function createPreviewMessages(user: MarketplaceUser): MarketplaceConversation[] {
  if (user.role === "buyer") {
    return [{
      id: "message-demo-01",
      listingId: "demo-01",
      senderId: "preview-seller",
      senderName: "mira_at_the_harbor",
      recipientId: user.id,
      recipientName: user.username,
      content: "Thanks for your interest. The card is in a sleeve and available for a meetup around Makati this week.",
      sentAt: "2026-11-24T15:00:00.000Z",
      readAt: null,
    }];
  }
  if (user.role === "seller") {
    return [{
      id: "message-demo-02",
      listingId: "demo-01",
      senderId: "preview-buyer",
      senderName: "thequietcollector",
      recipientId: user.id,
      recipientName: user.username,
      content: "Hello! Is the Dawn-Sworn Reliquary still available for a local meetup?",
      sentAt: "2026-11-24T14:20:00.000Z",
      readAt: null,
    }];
  }
  return [];
}
