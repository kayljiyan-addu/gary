create extension if not exists pgcrypto;

create type public.user_role as enum ('buyer', 'seller', 'moderator', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.listing_condition as enum ('Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played');
create type public.availability_status as enum ('active', 'sold', 'removed');
create type public.fulfillment_method as enum ('shipping', 'meetup');
create type public.transaction_status as enum ('requested', 'accepted', 'shipped', 'completed', 'cancelled', 'disputed');
create type public.payment_status as enum ('pending', 'paid', 'refunded', 'not_required');
create type public.report_status as enum ('pending', 'reviewing', 'resolved', 'dismissed');
create type public.dispute_status as enum ('open', 'reviewing', 'resolved');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  first_name text not null default '' check (char_length(first_name) <= 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  location text not null default '' check (char_length(location) <= 100),
  description text not null default '' check (char_length(description) <= 500),
  role public.user_role not null default 'buyer',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  contact_information text not null default '' check (char_length(contact_information) <= 200),
  updated_at timestamptz not null default now()
);

create table public.tcgs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 80),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  tcg_id uuid not null references public.tcgs (id) on delete cascade,
  set_code text not null check (char_length(set_code) between 1 and 50),
  set_name text not null check (char_length(set_name) between 1 and 100),
  release_date date,
  created_at timestamptz not null default now(),
  unique (tcg_id, set_code)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tcg_id uuid not null references public.tcgs (id) on delete restrict,
  set_id uuid references public.sets (id) on delete set null,
  product_name text not null check (char_length(product_name) between 1 and 100),
  card_number text not null default '' check (char_length(card_number) <= 30),
  rarity text not null default 'Unspecified' check (char_length(rarity) <= 40),
  product_type text not null default 'Card' check (char_length(product_type) <= 60),
  description text not null default '' check (char_length(description) <= 1000),
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  quantity integer not null check (quantity between 0 and 999),
  price numeric(12, 2) not null check (price > 0),
  condition public.listing_condition not null,
  listing_date timestamptz not null default now(),
  availability_status public.availability_status not null default 'active',
  fulfillment_methods public.fulfillment_method[] not null default array['shipping']::public.fulfillment_method[],
  updated_at timestamptz not null default now(),
  check (cardinality(fulfillment_methods) > 0),
  check (availability_status <> 'active' or quantity > 0)
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 1024),
  description text check (char_length(description) <= 200),
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 999),
  added_at timestamptz not null default now(),
  unique (cart_id, listing_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  order_date timestamptz not null default now(),
  order_status public.transaction_status not null default 'requested',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  cancellation_status text not null default 'not_cancelled'
    check (cancellation_status in ('not_cancelled', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 999),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  subtotal numeric(12, 2) not null check (subtotal > 0),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  payment_status public.payment_status not null default 'pending',
  transaction_status public.transaction_status not null default 'requested',
  transaction_timestamp timestamptz not null default now(),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  check (buyer_id <> seller_id)
);

create table public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions (id) on delete cascade,
  fulfillment_method public.fulfillment_method not null,
  fulfillment_status text not null default 'requested'
    check (fulfillment_status in ('requested', 'accepted', 'in_transit', 'ready_for_meetup', 'completed', 'cancelled')),
  expected_date date,
  fulfillment_date timestamptz,
  fulfillment_details text not null default '' check (char_length(fulfillment_details) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete restrict,
  recipient_id uuid not null references public.profiles (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  message_content text not null check (char_length(message_content) between 1 and 1000),
  sent_timestamp timestamptz not null default now(),
  read_timestamp timestamptz,
  check (sender_id <> recipient_id)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  star_rating smallint not null check (star_rating between 1 and 5),
  written_review text not null default '' check (char_length(written_review) <= 1000),
  rating_date timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create view public.seller_rating_summaries
with (security_invoker = true)
as
select seller_id, avg(star_rating)::numeric(3, 2) as average_rating, count(*)::integer as review_count
from public.ratings
group by seller_id;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  target_user_id uuid references public.profiles (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 80),
  description text not null check (char_length(description) between 10 and 1000),
  report_date timestamptz not null default now(),
  report_status public.report_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  check ((target_user_id is not null)::integer + (listing_id is not null)::integer = 1),
  check (target_user_id is null or target_user_id <> reporter_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions (id) on delete restrict,
  opened_by uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 80),
  description text not null check (char_length(description) between 10 and 1000),
  dispute_status public.dispute_status not null default 'open',
  outcome text not null default '' check (char_length(outcome) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 5 and 1000),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  administrator_id uuid not null references public.profiles (id) on delete restrict,
  target_user_id uuid references public.profiles (id) on delete set null,
  target_listing_id uuid references public.listings (id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  reason text not null default '' check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create index listings_active_recent_idx on public.listings (listing_date desc) where availability_status = 'active';
create index listings_product_idx on public.listings (product_id);
create index listings_seller_idx on public.listings (seller_id, listing_date desc);
create index products_tcg_set_idx on public.products (tcg_id, set_id);
create index cart_items_cart_idx on public.cart_items (cart_id);
create index orders_buyer_idx on public.orders (buyer_id, order_date desc);
create index transactions_buyer_idx on public.transactions (buyer_id, transaction_timestamp desc);
create index transactions_seller_idx on public.transactions (seller_id, transaction_timestamp desc);
create index messages_recipient_idx on public.messages (recipient_id, sent_timestamp desc);
create index messages_sender_idx on public.messages (sender_id, sent_timestamp desc);
create index reports_status_idx on public.reports (report_status, report_date desc);
create index disputes_status_idx on public.disputes (dispute_status, created_at desc);

insert into public.tcgs (name, description) values
  ('Mythic Realms', 'A fantasy trading card game of relics, realms, and remembered legends.'),
  ('Chronicle Duels', 'A strategy card game about the people and places that shape a chronicle.'),
  ('Verdant Skies', 'A nature-inspired card game of woodland companions and far horizons.')
on conflict (name) do nothing;

insert into public.sets (tcg_id, set_code, set_name)
select tcgs.id, seed.set_code, seed.set_name
from (values
  ('Mythic Realms', 'ember-archive', 'The Ember Archive'),
  ('Mythic Realms', 'saltwind-testament', 'Saltwind Testament'),
  ('Chronicle Duels', 'moonlit-index', 'Moonlit Index'),
  ('Verdant Skies', 'briar-crown', 'The Briar Crown')
) as seed(tcg_name, set_code, set_name)
join public.tcgs on tcgs.name = seed.tcg_name
on conflict (tcg_id, set_code) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
  );
$$;

create or replace function public.is_marketplace_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin')
      and account_status = 'active'
  );
$$;

create or replace function public.is_marketplace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_role public.user_role;
begin
  requested_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))));
  requested_username := regexp_replace(requested_username, '[^a-z0-9_.-]', '', 'g');
  if char_length(requested_username) < 3 then
    requested_username := 'collector-' || left(new.id::text, 8);
  end if;

  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller'::public.user_role
    else 'buyer'::public.user_role
  end;

  insert into public.profiles (id, username, role)
  values (new.id, left(requested_username, 30), requested_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_status is distinct from old.account_status and not public.is_marketplace_admin() then
    raise exception 'Only marketplace administrators can change account status.';
  end if;

  if new.role is distinct from old.role
    and not public.is_marketplace_admin()
    and not (
      old.id = (select auth.uid())
      and old.role in ('buyer', 'seller')
      and new.role in ('buyer', 'seller')
    )
  then
    raise exception 'Only marketplace administrators can assign staff roles.';
  end if;

  return new;
end;
$$;

create trigger guard_profile_update_before
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger user_contacts_updated_at
  before update on public.user_contacts
  for each row execute function public.set_updated_at();

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger carts_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create trigger fulfillments_updated_at
  before update on public.fulfillments
  for each row execute function public.set_updated_at();

create trigger disputes_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();

create trigger announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create or replace function public.guard_listing_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.seller_id = (select auth.uid()) or public.is_marketplace_admin())
    and new.quantity is distinct from old.quantity
    and new.quantity + coalesce((
      select sum(order_items.quantity)
      from public.order_items
      join public.transactions on transactions.order_id = order_items.order_id
      where order_items.listing_id = old.id
        and transactions.transaction_status = 'requested'
    ), 0) > 999
  then
    raise exception 'Available quantity plus pending purchase requests cannot exceed 999.';
  end if;

  if old.seller_id = (select auth.uid()) and not public.is_marketplace_admin()
    and (new.seller_id is distinct from old.seller_id or new.product_id is distinct from old.product_id)
  then
    raise exception 'A seller cannot transfer a listing or replace its product.';
  end if;
  return new;
end;
$$;

create trigger guard_listing_update_before
  before update on public.listings
  for each row execute function public.guard_listing_update();

create or replace function public.guard_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.listing_id is distinct from old.listing_id
    or new.transaction_id is distinct from old.transaction_id
    or new.message_content is distinct from old.message_content
    or new.sent_timestamp is distinct from old.sent_timestamp
    or old.recipient_id is distinct from (select auth.uid())
  then
    raise exception 'Messages are immutable; recipients may only mark them as read.';
  end if;
  return new;
end;
$$;

create trigger guard_message_update_before
  before update on public.messages
  for each row execute function public.guard_message_update();

create or replace function public.guard_transaction_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  fulfillment_kind public.fulfillment_method;
begin
  if new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.order_id is distinct from old.order_id
    or new.total_amount is distinct from old.total_amount
  then
    raise exception 'Transaction parties and amounts cannot be changed.';
  end if;

  if new.payment_status is distinct from old.payment_status and not public.is_marketplace_admin() then
    raise exception 'Only marketplace administrators can adjust payment status.';
  end if;

  if new.transaction_status is not distinct from old.transaction_status or public.is_marketplace_admin() then
    return new;
  end if;

  if new.transaction_status = 'disputed'
    and actor_id in (old.buyer_id, old.seller_id)
    and old.transaction_status in ('requested', 'accepted', 'shipped')
  then
    return new;
  end if;

  if actor_id = old.buyer_id
    and old.transaction_status = 'requested'
    and new.transaction_status = 'cancelled'
  then
    if current_setting('asphodel.allow_transaction_cancel', true) = 'true' then
      return new;
    end if;
    raise exception 'Use the cancellation action so reserved inventory is restored.';
  end if;

  if actor_id = old.seller_id
    and old.transaction_status = 'requested'
    and new.transaction_status = 'accepted'
  then
    return new;
  end if;

  select fulfillment_method into fulfillment_kind
    from public.fulfillments
    where transaction_id = old.id;

  if actor_id = old.seller_id
    and old.transaction_status = 'accepted'
    and (
      new.transaction_status = 'shipped'
      or (new.transaction_status = 'completed' and fulfillment_kind = 'meetup')
    )
  then
    return new;
  end if;

  if actor_id = old.buyer_id
    and old.transaction_status = 'shipped'
    and new.transaction_status = 'completed'
  then
    return new;
  end if;

  raise exception 'This transaction status change is not permitted.';
end;
$$;

create trigger guard_transaction_update_before
  before update on public.transactions
  for each row execute function public.guard_transaction_update();

create or replace function public.sync_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.transaction_status is distinct from old.transaction_status then
    update public.orders
      set order_status = new.transaction_status,
          cancellation_status = case when new.transaction_status = 'cancelled' then 'cancelled' else cancellation_status end
      where id = new.order_id;
    update public.fulfillments
      set fulfillment_status = case
        when new.transaction_status = 'accepted' and fulfillment_method = 'meetup' then 'ready_for_meetup'
        when new.transaction_status = 'accepted' then 'accepted'
        when new.transaction_status = 'shipped' then 'in_transit'
        when new.transaction_status = 'completed' then 'completed'
        when new.transaction_status = 'cancelled' then 'cancelled'
        else fulfillment_status
      end,
      fulfillment_date = case
        when new.transaction_status = 'completed' then now()
        else fulfillment_date
      end
      where transaction_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_order_status_after
  after update of transaction_status on public.transactions
  for each row execute function public.sync_order_status();

create or replace function public.create_listing_with_product(
  product_name text,
  tcg_name text,
  set_name text,
  card_number text,
  rarity text,
  product_type text,
  product_description text,
  listing_condition public.listing_condition,
  listing_quantity integer,
  listing_price numeric,
  listing_fulfillment_methods public.fulfillment_method[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  tcg_uuid uuid;
  set_uuid uuid;
  product_uuid uuid;
  listing_uuid uuid;
  normalized_set_code text;
begin
  if actor_id is null or not public.is_active_member() then
    raise exception 'An active marketplace account is required.';
  end if;
  if not exists (select 1 from public.profiles where id = actor_id and role = 'seller') then
    raise exception 'Seller access is required to create a listing.';
  end if;
  if char_length(trim(product_name)) not between 2 and 100
    or char_length(trim(tcg_name)) not between 1 and 80
    or char_length(trim(set_name)) not between 1 and 100
    or listing_quantity not between 1 and 999
    or listing_price <= 0
    or cardinality(listing_fulfillment_methods) = 0
  then
    raise exception 'One or more listing details are invalid.';
  end if;

  insert into public.tcgs (name) values (trim(tcg_name))
    on conflict (name) do update set name = excluded.name
    returning id into tcg_uuid;

  normalized_set_code := left(regexp_replace(lower(trim(set_name)), '[^a-z0-9]+', '-', 'g'), 50);
  if normalized_set_code = '' then normalized_set_code := 'unlisted-set'; end if;
  insert into public.sets (tcg_id, set_code, set_name)
    values (tcg_uuid, normalized_set_code, trim(set_name))
    on conflict (tcg_id, set_code) do update set set_name = excluded.set_name
    returning id into set_uuid;

  insert into public.products (
    tcg_id, set_id, product_name, card_number, rarity, product_type, description
  ) values (
    tcg_uuid, set_uuid, trim(product_name), trim(card_number), coalesce(nullif(trim(rarity), ''), 'Unspecified'),
    coalesce(nullif(trim(product_type), ''), 'Card'), trim(product_description)
  ) returning id into product_uuid;

  insert into public.listings (
    product_id, seller_id, quantity, price, condition, fulfillment_methods
  ) values (
    product_uuid, actor_id, listing_quantity, listing_price, listing_condition, listing_fulfillment_methods
  ) returning id into listing_uuid;

  return listing_uuid;
end;
$$;

create or replace function public.admin_set_account_status(
  member_uuid uuid,
  desired_status public.account_status,
  action_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.is_marketplace_admin() then
    raise exception 'Marketplace administrator access is required.';
  end if;
  if member_uuid = actor_id and desired_status = 'suspended' then
    raise exception 'You cannot suspend your own administrator account.';
  end if;
  if char_length(trim(action_reason)) not between 1 and 1000 then
    raise exception 'Provide a reason for this account status change.';
  end if;

  update public.profiles set account_status = desired_status where id = member_uuid;
  if not found then
    raise exception 'The selected member no longer exists.';
  end if;

  insert into public.admin_action_logs (administrator_id, target_user_id, action, reason)
    values (
      actor_id,
      member_uuid,
      case when desired_status = 'suspended' then 'suspend_account' else 'reinstate_account' end,
      trim(action_reason)
    );
end;
$$;

create or replace function public.admin_set_member_role(
  member_uuid uuid,
  desired_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null or not public.is_marketplace_admin() then
    raise exception 'Marketplace administrator access is required.';
  end if;
  if member_uuid = actor_id then
    raise exception 'You cannot change your own administrator role.';
  end if;

  update public.profiles set role = desired_role where id = member_uuid;
  if not found then
    raise exception 'The selected member no longer exists.';
  end if;

  insert into public.admin_action_logs (administrator_id, target_user_id, action, reason)
    values (actor_id, member_uuid, 'change_member_role', 'Member role updated by an administrator.');
end;
$$;

create or replace function public.add_to_cart(p_listing_uuid uuid, p_requested_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  cart_uuid uuid;
  available_quantity integer;
  seller_uuid uuid;
  current_quantity integer;
begin
  if actor_id is null or not public.is_active_member() then
    raise exception 'Sign in with an active account to add cards to your cart.';
  end if;
  if p_requested_quantity not between 1 and 999 then
    raise exception 'Choose a valid quantity.';
  end if;

  insert into public.carts (buyer_id) values (actor_id)
    on conflict (buyer_id) do update set updated_at = now()
    returning id into cart_uuid;

  select quantity, seller_id into available_quantity, seller_uuid
    from public.listings
    where id = p_listing_uuid and availability_status = 'active'
    for update;
  if not found or available_quantity < 1 then
    raise exception 'This listing is no longer available.';
  end if;
  if seller_uuid = actor_id then
    raise exception 'You cannot add your own listing to your cart.';
  end if;

  select quantity into current_quantity
    from public.cart_items
    where cart_id = cart_uuid and cart_items.listing_id = p_listing_uuid
    for update;

  if coalesce(current_quantity, 0) + p_requested_quantity > available_quantity then
    raise exception 'The requested quantity is not available.';
  end if;

  insert into public.cart_items (cart_id, listing_id, quantity)
    values (cart_uuid, p_listing_uuid, p_requested_quantity)
    on conflict (cart_id, listing_id)
    do update set quantity = public.cart_items.quantity + excluded.quantity;

  return jsonb_build_object('cart_id', cart_uuid, 'quantity', coalesce(current_quantity, 0) + p_requested_quantity);
end;
$$;

create or replace function public.set_cart_item_quantity(p_cart_item_uuid uuid, p_requested_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  cart_uuid uuid;
  item_listing_id uuid;
  cart_owner uuid;
  available_quantity integer;
begin
  if actor_id is null or not public.is_active_member() then
    raise exception 'Sign in with an active account to update your cart.';
  end if;
  if p_requested_quantity not between 1 and 999 then
    raise exception 'Choose a valid quantity.';
  end if;

  select carts.id into cart_uuid
    from public.carts
    where carts.buyer_id = actor_id
    for update;
  if not found then
    raise exception 'Your cart is empty.';
  end if;

  select cart_items.listing_id, carts.buyer_id into item_listing_id, cart_owner
    from public.cart_items
    join public.carts on carts.id = cart_items.cart_id
    where cart_items.id = p_cart_item_uuid
    for update of cart_items;
  if not found or cart_owner <> actor_id then
    raise exception 'That cart item is unavailable.';
  end if;

  select quantity into available_quantity
    from public.listings
    where id = item_listing_id and availability_status = 'active'
    for update;
  if not found or p_requested_quantity > available_quantity then
    raise exception 'The requested quantity is no longer available.';
  end if;

  update public.cart_items set quantity = p_requested_quantity where id = p_cart_item_uuid;
end;
$$;

create or replace function public.create_purchase_request(
  p_fulfillment_method public.fulfillment_method,
  p_fulfillment_details text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  cart_uuid uuid;
  seller_group record;
  cart_item record;
  order_uuid uuid;
  transaction_uuid uuid;
  result jsonb := '[]'::jsonb;
begin
  if actor_id is null or not public.is_active_member() then
    raise exception 'Sign in with an active account to submit a purchase request.';
  end if;
  if not exists (select 1 from public.profiles where id = actor_id and role in ('buyer', 'seller')) then
    raise exception 'A buyer or seller account is required to submit a purchase request.';
  end if;
  if char_length(coalesce(p_fulfillment_details, '')) > 500 then
    raise exception 'Fulfillment details must be 500 characters or fewer.';
  end if;

  select id into cart_uuid from public.carts where buyer_id = actor_id for update;
  if cart_uuid is null or not exists (select 1 from public.cart_items where cart_id = cart_uuid) then
    raise exception 'Your cart is empty.';
  end if;

  perform listings.id
    from public.cart_items
    join public.listings on listings.id = cart_items.listing_id
    where cart_items.cart_id = cart_uuid
    order by listings.id
    for update of listings;

  if not exists (
    select 1
    from public.cart_items ci
    join public.listings l on l.id = ci.listing_id
    where ci.cart_id = cart_uuid
      and p_fulfillment_method = any(l.fulfillment_methods)
  ) then
    raise exception 'No items in your cart offer the selected fulfillment method.';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    join public.listings l on l.id = ci.listing_id
    where ci.cart_id = cart_uuid
      and p_fulfillment_method = any(l.fulfillment_methods)
      and (
        l.availability_status <> 'active'
        or l.quantity < ci.quantity
        or l.seller_id = actor_id
      )
  ) then
    raise exception 'A cart item is unavailable, has insufficient stock, or does not offer that fulfillment method.';
  end if;

  for seller_group in
    select l.seller_id, sum(ci.quantity * l.price)::numeric(12,2) as seller_total
    from public.cart_items ci
    join public.listings l on l.id = ci.listing_id
    where ci.cart_id = cart_uuid
      and p_fulfillment_method = any(l.fulfillment_methods)
    group by l.seller_id
  loop
    insert into public.orders (buyer_id, order_status, total_amount)
      values (actor_id, 'requested', seller_group.seller_total)
      returning id into order_uuid;

    for cart_item in
      select ci.quantity, l.id as listing_id, l.product_id, l.price
      from public.cart_items ci
      join public.listings l on l.id = ci.listing_id
      where ci.cart_id = cart_uuid
        and l.seller_id = seller_group.seller_id
        and p_fulfillment_method = any(l.fulfillment_methods)
      for update of l
    loop
      insert into public.order_items (order_id, listing_id, product_id, quantity, unit_price, subtotal)
        values (order_uuid, cart_item.listing_id, cart_item.product_id, cart_item.quantity, cart_item.price, cart_item.quantity * cart_item.price);

      update public.listings
        set quantity = quantity - cart_item.quantity,
            availability_status = case when quantity - cart_item.quantity = 0 then 'sold'::public.availability_status else 'active'::public.availability_status end,
            updated_at = now()
        where id = cart_item.listing_id;
    end loop;

    insert into public.transactions (order_id, buyer_id, seller_id, transaction_status, payment_status, total_amount)
      values (order_uuid, actor_id, seller_group.seller_id, 'requested', 'pending', seller_group.seller_total)
      returning id into transaction_uuid;

    insert into public.fulfillments (transaction_id, fulfillment_method, fulfillment_details)
      values (transaction_uuid, p_fulfillment_method, coalesce(trim(p_fulfillment_details), ''));

    result := result || jsonb_build_array(jsonb_build_object(
      'transaction_id', transaction_uuid,
      'order_id', order_uuid,
      'seller_id', seller_group.seller_id
    ));
  end loop;

  delete from public.cart_items ci
    using public.listings l
    where ci.cart_id = cart_uuid
      and l.id = ci.listing_id
      and p_fulfillment_method = any(l.fulfillment_methods);
  update public.carts set updated_at = now() where id = cart_uuid;
  return result;
end;
$$;

create or replace function public.cancel_transaction(transaction_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  transaction_record public.transactions%rowtype;
  item record;
begin
  if actor_id is null or not public.is_active_member() then
    raise exception 'Sign in with an active account to cancel a request.';
  end if;

  select * into transaction_record
    from public.transactions
    where id = transaction_uuid and buyer_id = actor_id
    for update;
  if not found then
    raise exception 'That transaction could not be found or is not yours to cancel.';
  end if;
  if transaction_record.transaction_status <> 'requested' then
    raise exception 'Only a purchase request awaiting seller response can be cancelled.';
  end if;

  perform set_config('asphodel.allow_transaction_cancel', 'true', true);
  update public.transactions set transaction_status = 'cancelled' where id = transaction_uuid;
  perform set_config('asphodel.allow_transaction_cancel', 'false', true);

  for item in
    select listing_id, quantity from public.order_items where order_id = transaction_record.order_id
  loop
    update public.listings
      set quantity = listings.quantity + item.quantity,
          availability_status = case
            when listings.availability_status = 'removed' then 'removed'::public.availability_status
            else 'active'::public.availability_status
          end,
          updated_at = now()
      where id = item.listing_id;
  end loop;

  return true;
end;
$$;

create or replace function public.become_seller()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'An active account is required to start selling.';
  end if;
  update public.profiles
    set role = 'seller'
    where id = (select auth.uid()) and role = 'buyer';
  if not found then
    raise exception 'This account cannot change to seller access.';
  end if;
end;
$$;

create or replace function public.set_disputed_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.transactions
    set transaction_status = 'disputed'
    where id = new.transaction_id
      and transaction_status in ('requested', 'accepted', 'shipped');
  return new;
end;
$$;

create trigger dispute_marks_transaction
  after insert on public.disputes
  for each row execute function public.set_disputed_transaction();

alter table public.profiles enable row level security;
alter table public.user_contacts enable row level security;
alter table public.tcgs enable row level security;
alter table public.sets enable row level security;
alter table public.products enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.transactions enable row level security;
alter table public.fulfillments enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.disputes enable row level security;
alter table public.announcements enable row level security;
alter table public.admin_action_logs enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select to anon, authenticated using (true);
create policy "Members update their own profile or admins manage profiles"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_marketplace_admin())
  with check (id = (select auth.uid()) or public.is_marketplace_admin());

create policy "Users read their own contact details"
  on public.user_contacts for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.transactions
      where (buyer_id = (select auth.uid()) and seller_id = user_contacts.user_id)
         or (seller_id = (select auth.uid()) and buyer_id = user_contacts.user_id)
    )
  );
create policy "Users manage their own contact details"
  on public.user_contacts for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_member());
create policy "Users update their own contact details"
  on public.user_contacts for update to authenticated
  using (user_id = (select auth.uid()) and public.is_active_member())
  with check (user_id = (select auth.uid()) and public.is_active_member());

create policy "TCGs are publicly viewable" on public.tcgs for select to anon, authenticated using (true);
create policy "Sets are publicly viewable" on public.sets for select to anon, authenticated using (true);
create policy "Products are publicly viewable" on public.products for select to anon, authenticated using (true);

create policy "Active listings, owners, and staff can view listings"
  on public.listings for select to anon, authenticated
  using (availability_status = 'active' or seller_id = (select auth.uid()) or public.is_marketplace_staff());
create policy "Active sellers create listings"
  on public.listings for insert to authenticated
  with check (
    seller_id = (select auth.uid())
    and public.is_active_member()
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'seller')
  );
create policy "Owners or admins update listings"
  on public.listings for update to authenticated
  using (seller_id = (select auth.uid()) or public.is_marketplace_admin())
  with check (
    public.is_marketplace_admin()
    or (seller_id = (select auth.uid()) and public.is_active_member())
  );

create policy "Visible listing images can be viewed"
  on public.listing_images for select to anon, authenticated
  using (exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and (listings.availability_status = 'active' or listings.seller_id = (select auth.uid()) or public.is_marketplace_staff())
  ));
create policy "Listing owners manage listing images"
  on public.listing_images for insert to authenticated
  with check (exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = (select auth.uid())
      and public.is_active_member()
  ) and split_part(storage_path, '/', 1) = (select auth.uid())::text);
create policy "Listing owners update listing images"
  on public.listing_images for update to authenticated
  using (exists (select 1 from public.listings where listings.id = listing_images.listing_id and listings.seller_id = (select auth.uid())))
  with check (
    exists (select 1 from public.listings where listings.id = listing_images.listing_id and listings.seller_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );
create policy "Listing owners remove listing images"
  on public.listing_images for delete to authenticated
  using (exists (select 1 from public.listings where listings.id = listing_images.listing_id and listings.seller_id = (select auth.uid())));

create policy "Members read their saved listings"
  on public.favorites for select to authenticated using (user_id = (select auth.uid()));
create policy "Members save active listings"
  on public.favorites for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_active_member()
    and exists (select 1 from public.listings where id = listing_id and availability_status = 'active')
  );
create policy "Members remove their saved listings"
  on public.favorites for delete to authenticated using (user_id = (select auth.uid()));

create policy "Members manage their own cart"
  on public.carts for all to authenticated
  using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()) and public.is_active_member());
create policy "Members manage items in their own cart"
  on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.buyer_id = (select auth.uid())))
  with check (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.buyer_id = (select auth.uid()) and public.is_active_member()));

create policy "Transaction parties and staff view orders"
  on public.orders for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or public.is_marketplace_staff()
    or exists (select 1 from public.transactions where transactions.order_id = orders.id and transactions.seller_id = (select auth.uid()))
  );
create policy "Transaction parties and staff view order items"
  on public.order_items for select to authenticated
  using (
    exists (select 1 from public.orders where orders.id = order_items.order_id and orders.buyer_id = (select auth.uid()))
    or public.is_marketplace_staff()
    or exists (select 1 from public.transactions where transactions.order_id = order_items.order_id and transactions.seller_id = (select auth.uid()))
  );

create policy "Transaction parties and staff view transactions"
  on public.transactions for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_marketplace_staff());
create policy "Transaction parties update permitted transaction states"
  on public.transactions for update to authenticated
  using (
    public.is_marketplace_admin()
    or (public.is_active_member() and (buyer_id = (select auth.uid()) or seller_id = (select auth.uid())))
  )
  with check (
    public.is_marketplace_admin()
    or (public.is_active_member() and (buyer_id = (select auth.uid()) or seller_id = (select auth.uid())))
  );

create policy "Transaction parties and staff view fulfillment"
  on public.fulfillments for select to authenticated
  using (exists (
    select 1 from public.transactions
    where transactions.id = fulfillments.transaction_id
      and (transactions.buyer_id = (select auth.uid()) or transactions.seller_id = (select auth.uid()) or public.is_marketplace_staff())
  ));
create policy "Transaction parties update fulfillment"
  on public.fulfillments for update to authenticated
  using (exists (
    select 1 from public.transactions
    where transactions.id = fulfillments.transaction_id
      and public.is_active_member()
      and (transactions.buyer_id = (select auth.uid()) or transactions.seller_id = (select auth.uid()))
  ))
  with check (exists (
    select 1 from public.transactions
    where transactions.id = fulfillments.transaction_id
      and public.is_active_member()
      and (transactions.buyer_id = (select auth.uid()) or transactions.seller_id = (select auth.uid()))
  ));

create policy "Message participants view messages"
  on public.messages for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "Active members message other active members"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_active_member()
    and exists (select 1 from public.profiles where id = recipient_id and account_status = 'active')
  );
create policy "Recipients mark messages as read"
  on public.messages for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy "Ratings are publicly viewable" on public.ratings for select to anon, authenticated using (true);
create policy "Buyers rate sellers after completed trades"
  on public.ratings for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and public.is_active_member()
    and exists (
      select 1 from public.transactions
      where transactions.id = transaction_id
        and transactions.buyer_id = (select auth.uid())
        and transactions.seller_id = ratings.seller_id
        and transactions.transaction_status = 'completed'
    )
  );

create policy "Reporters and staff view reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_marketplace_staff());
create policy "Active members report users or listings"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and public.is_active_member()
    and (
      (target_user_id is not null and exists (select 1 from public.profiles where id = target_user_id))
      or (listing_id is not null and exists (select 1 from public.listings where id = listing_id))
    )
  );
create policy "Staff update report review status"
  on public.reports for update to authenticated
  using (public.is_marketplace_staff())
  with check (public.is_marketplace_staff());

create policy "Dispute parties and staff view disputes"
  on public.disputes for select to authenticated
  using (
    public.is_marketplace_staff()
    or opened_by = (select auth.uid())
    or exists (
      select 1 from public.transactions
      where transactions.id = disputes.transaction_id
        and (transactions.buyer_id = (select auth.uid()) or transactions.seller_id = (select auth.uid()))
    )
  );
create policy "Active transaction parties open disputes"
  on public.disputes for insert to authenticated
  with check (
    opened_by = (select auth.uid())
    and public.is_active_member()
    and exists (
      select 1 from public.transactions
      where transactions.id = transaction_id
        and (transactions.buyer_id = (select auth.uid()) or transactions.seller_id = (select auth.uid()))
        and transactions.transaction_status in ('requested', 'accepted', 'shipped')
    )
  );
create policy "Administrators handle disputes"
  on public.disputes for update to authenticated
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

create policy "Published announcements are public; staff can review drafts"
  on public.announcements for select to anon, authenticated
  using (is_published or public.is_marketplace_staff());
create policy "Administrators create announcements"
  on public.announcements for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_marketplace_admin());
create policy "Administrators update announcements"
  on public.announcements for update to authenticated
  using (public.is_marketplace_admin())
  with check (public.is_marketplace_admin());

create policy "Administrators view action logs"
  on public.admin_action_logs for select to authenticated
  using (public.is_marketplace_admin());
create policy "Administrators write action logs"
  on public.admin_action_logs for insert to authenticated
  with check (administrator_id = (select auth.uid()) and public.is_marketplace_admin());

grant usage on schema public to anon, authenticated;
grant select on public.tcgs, public.sets, public.products, public.listings, public.listing_images, public.profiles, public.ratings, public.announcements to anon, authenticated;
grant select on public.seller_rating_summaries to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke all on function public.is_active_member() from public;
revoke all on function public.is_marketplace_staff() from public;
revoke all on function public.is_marketplace_admin() from public;
revoke all on function public.create_listing_with_product(text, text, text, text, text, text, text, public.listing_condition, integer, numeric, public.fulfillment_method[]) from public, anon;
revoke all on function public.add_to_cart(uuid, integer) from public, anon;
revoke all on function public.set_cart_item_quantity(uuid, integer) from public, anon;
revoke all on function public.create_purchase_request(public.fulfillment_method, text) from public, anon;
revoke all on function public.cancel_transaction(uuid) from public, anon;
revoke all on function public.become_seller() from public, anon;
revoke all on function public.admin_set_account_status(uuid, public.account_status, text) from public, anon;
revoke all on function public.admin_set_member_role(uuid, public.user_role) from public, anon;

grant execute on function public.is_active_member() to anon, authenticated;
grant execute on function public.is_marketplace_staff() to anon, authenticated;
grant execute on function public.is_marketplace_admin() to authenticated;
grant execute on function public.create_listing_with_product(text, text, text, text, text, text, text, public.listing_condition, integer, numeric, public.fulfillment_method[]) to authenticated;
grant execute on function public.add_to_cart(uuid, integer) to authenticated;
grant execute on function public.set_cart_item_quantity(uuid, integer) to authenticated;
grant execute on function public.create_purchase_request(public.fulfillment_method, text) to authenticated;
grant execute on function public.cancel_transaction(uuid) to authenticated;
grant execute on function public.become_seller() to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_set_member_role(uuid, public.user_role) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Listing images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-images');
create policy "Sellers upload images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.is_active_member()
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'seller')
  );
create policy "Sellers update images in their own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Sellers delete images in their own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.guard_profile_update() from public, anon, authenticated;
revoke all on function public.guard_listing_update() from public, anon, authenticated;
revoke all on function public.guard_message_update() from public, anon, authenticated;
revoke all on function public.guard_transaction_update() from public, anon, authenticated;
revoke all on function public.sync_order_status() from public, anon, authenticated;
revoke all on function public.set_disputed_transaction() from public, anon, authenticated;
