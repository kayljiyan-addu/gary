export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfileRow = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  location: string;
  description: string;
  role: "buyer" | "seller" | "moderator" | "admin";
  account_status: "active" | "suspended";
  created_at: string;
};

type ProductRow = {
  id: string;
  tcg_id: string;
  set_id: string | null;
  product_name: string;
  card_number: string;
  rarity: string;
  product_type: string;
  description: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  product_id: string;
  seller_id: string;
  quantity: number;
  price: number;
  condition: "Near Mint" | "Lightly Played" | "Moderately Played" | "Heavily Played";
  listing_date: string;
  availability_status: "active" | "sold" | "removed";
  fulfillment_methods: ("shipping" | "meetup")[];
  updated_at: string;
};

type CartRow = {
  id: string;
  buyer_id: string;
  created_at: string;
  updated_at: string;
};

type CartItemRow = {
  id: string;
  cart_id: string;
  listing_id: string;
  quantity: number;
  added_at: string;
};

type OrderRow = {
  id: string;
  buyer_id: string;
  order_date: string;
  order_status: string;
  total_amount: number;
  cancellation_status: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  listing_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type TransactionRow = {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  payment_status: "pending" | "paid" | "refunded" | "not_required";
  transaction_status: "requested" | "accepted" | "shipped" | "completed" | "cancelled" | "disputed";
  transaction_timestamp: string;
  total_amount: number;
};

type FulfillmentRow = {
  id: string;
  transaction_id: string;
  fulfillment_method: "shipping" | "meetup";
  fulfillment_status: "requested" | "accepted" | "in_transit" | "ready_for_meetup" | "completed" | "cancelled";
  expected_date: string | null;
  fulfillment_date: string | null;
  fulfillment_details: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  listing_id: string | null;
  transaction_id: string | null;
  message_content: string;
  sent_timestamp: string;
  read_timestamp: string | null;
};

type RatingRow = {
  id: string;
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  star_rating: number;
  written_review: string;
  rating_date: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  target_user_id: string | null;
  listing_id: string | null;
  reason: string;
  description: string;
  report_status: "pending" | "reviewing" | "resolved" | "dismissed";
  report_date: string;
  reviewed_by: string | null;
};

type DisputeRow = {
  id: string;
  transaction_id: string;
  opened_by: string;
  reason: string;
  description: string;
  dispute_status: "open" | "reviewing" | "resolved";
  outcome: string;
  created_at: string;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  published_at: string | null;
  created_by: string;
};

type TcgRow = { id: string; name: string; description: string };
type SetRow = { id: string; tcg_id: string; set_code: string; set_name: string; release_date: string | null };
type ListingImageRow = { id: string; listing_id: string; storage_path: string; description: string | null };
type UserContactRow = { user_id: string; contact_information: string; updated_at: string };
type AdminActionRow = {
  id: string;
  administrator_id: string;
  target_user_id: string | null;
  target_listing_id: string | null;
  action: string;
  reason: string;
  created_at: string;
};
type FavoriteRow = { user_id: string; listing_id: string; created_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      products: Table<ProductRow>;
      listings: Table<ListingRow>;
      carts: Table<CartRow>;
      cart_items: Table<CartItemRow>;
      orders: Table<OrderRow>;
      order_items: Table<OrderItemRow>;
      transactions: Table<TransactionRow>;
      fulfillments: Table<FulfillmentRow>;
      messages: Table<MessageRow>;
      ratings: Table<RatingRow>;
      reports: Table<ReportRow>;
      disputes: Table<DisputeRow>;
      announcements: Table<AnnouncementRow>;
      tcgs: Table<TcgRow>;
      sets: Table<SetRow>;
      listing_images: Table<ListingImageRow>;
      user_contacts: Table<UserContactRow>;
      admin_action_logs: Table<AdminActionRow>;
      favorites: Table<FavoriteRow>;
    };
    Views: {
      seller_rating_summaries: {
        Row: { seller_id: string; average_rating: number | null; review_count: number };
        Relationships: [];
      };
    };
    Functions: {
      add_to_cart: {
        Args: { p_listing_uuid: string; p_requested_quantity: number };
        Returns: Json;
      };
      set_cart_item_quantity: {
        Args: { p_cart_item_uuid: string; p_requested_quantity: number };
        Returns: undefined;
      };
      create_listing_with_product: {
        Args: {
          product_name: string;
          tcg_name: string;
          set_name: string;
          card_number: string;
          rarity: string;
          product_type: string;
          product_description: string;
          listing_condition: ListingRow["condition"];
          listing_quantity: number;
          listing_price: number;
          listing_fulfillment_methods: ListingRow["fulfillment_methods"];
        };
        Returns: string;
      };
      create_purchase_request: {
        Args: {
          p_fulfillment_method: FulfillmentRow["fulfillment_method"];
          p_fulfillment_details: string;
        };
        Returns: Json;
      };
      cancel_transaction: {
        Args: { transaction_uuid: string };
        Returns: boolean;
      };
      become_seller: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      admin_set_account_status: {
        Args: { member_uuid: string; desired_status: "active" | "suspended"; action_reason: string };
        Returns: undefined;
      };
      admin_set_member_role: {
        Args: { member_uuid: string; desired_role: "buyer" | "seller" | "moderator" | "admin" };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
