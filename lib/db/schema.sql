create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand text not null,
  category_label text not null,
  name text not null,
  description text not null,
  price_cents integer not null,
  rating numeric(2,1) not null default 4.5,
  review_count integer not null default 0,
  storefront jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.products
add column if not exists storefront jsonb not null default '{}'::jsonb;

insert into public.products (
  slug,
  brand,
  category_label,
  name,
  description,
  price_cents,
  rating,
  review_count,
  storefront,
  status
)
values
(
  'pro-runner-elite-x',
  'Stridewell',
  'Stridewell Running',
  'ProRunner Elite X',
  'Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.',
  18900,
  4.5,
  247,
  $json$
  {
    "template_key": "standard_pdp",
    "hero_kicker": "Stridewell Running",
    "primary_cta_label": "Add to Cart",
    "sticky_cta_label": "Add to Cart",
    "gallery_items": [
      { "id": "sunrise", "label": "Sunrise orange upper", "accent": "SUNRISE", "panel_class_name": "from-orange-100 via-amber-50 to-white", "orb_class_name": "from-orange-400 to-amber-300" },
      { "id": "glacier", "label": "Glacier blue upper", "accent": "GLACIER", "panel_class_name": "from-sky-100 via-cyan-50 to-white", "orb_class_name": "from-sky-500 to-cyan-300" },
      { "id": "forest", "label": "Forest green upper", "accent": "FOREST", "panel_class_name": "from-emerald-100 via-lime-50 to-white", "orb_class_name": "from-emerald-500 to-lime-300" },
      { "id": "graphite", "label": "Graphite black upper", "accent": "GRAPHITE", "panel_class_name": "from-slate-300 via-slate-100 to-white", "orb_class_name": "from-slate-800 to-slate-500" }
    ],
    "option_groups": [
      { "id": "size", "label": "Size", "values": ["8", "9", "10", "11"], "selected_value": "9", "helper_text": "Selected" }
    ],
    "quantity_selector": { "label": "Quantity", "helper_text": "Max 10", "min": 1, "max": 10 },
    "trust_items": [
      { "title": "Free shipping over $150" },
      { "title": "30-day returns" },
      { "title": "Secure checkout" }
    ],
    "reviews_heading": "Runner reviews",
    "reviews_subheading": "Feedback from customers using the ProRunner Elite X for training and race day.",
    "reviews": [
      { "name": "Alex M.", "rating_label": "★★★★★", "body": "Light on foot, surprisingly stable through longer tempo runs, and the fit feels secure without being tight." },
      { "name": "Jordan R.", "rating_label": "★★★★☆", "body": "The ride feels fast and springy. I'd buy again for race week and hard workout days." },
      { "name": "Taylor S.", "rating_label": "★★★★★", "body": "Comfortable out of the box with enough cushion for distance while still feeling quick at toe-off." }
    ],
    "recommendations_heading": "Frequently bought together",
    "recommendations_subheading": "Common add-ons runners pair with the ProRunner Elite X.",
    "recommendations": [
      { "name": "StrideLock Performance Socks", "description": "Cushioned arch support with breathable knit zones.", "price_cents": 2400, "panel_class_name": "from-orange-100 via-amber-50 to-white" },
      { "name": "AeroFit Running Cap", "description": "Lightweight visor with moisture-wicking interior band.", "price_cents": 3200, "panel_class_name": "from-sky-100 via-cyan-50 to-white" }
    ]
  }
  $json$::jsonb,
  'active'
),
(
  'aurora-desk-lamp',
  'Northline',
  'Northline Lighting',
  'Aurora Desk Lamp',
  'Adjustable ambient lighting with focused task mode, warm evening presets, and a compact anodized base.',
  12900,
  4.7,
  89,
  $json$
  {
    "template_key": "standard_pdp",
    "hero_kicker": "Northline Lighting",
    "primary_cta_label": "Add to Cart",
    "sticky_cta_label": "Choose finish",
    "gallery_items": [
      { "id": "linen", "label": "Soft linen finish", "accent": "LINEN", "panel_class_name": "from-stone-100 via-amber-50 to-white", "orb_class_name": "from-stone-300 to-amber-200" },
      { "id": "mist", "label": "Cool mist finish", "accent": "MIST", "panel_class_name": "from-slate-100 via-sky-50 to-white", "orb_class_name": "from-slate-400 to-sky-200" },
      { "id": "sage", "label": "Muted sage finish", "accent": "SAGE", "panel_class_name": "from-emerald-100 via-lime-50 to-white", "orb_class_name": "from-emerald-400 to-lime-200" },
      { "id": "onyx", "label": "Onyx matte finish", "accent": "ONYX", "panel_class_name": "from-slate-300 via-slate-100 to-white", "orb_class_name": "from-slate-800 to-slate-500" }
    ],
    "option_groups": [
      { "id": "finish", "label": "Finish", "values": ["Linen", "Mist", "Sage", "Onyx"], "selected_value": "Mist", "helper_text": "Selected" }
    ],
    "quantity_selector": { "label": "Quantity", "helper_text": "Max 6", "min": 1, "max": 6 },
    "trust_items": [
      { "title": "Free 2-day shipping", "detail": "On orders over $100" },
      { "title": "3-year warranty" },
      { "title": "Secure checkout" }
    ],
    "reviews_heading": "Designer reviews",
    "reviews_subheading": "Feedback from customers using the Aurora Desk Lamp in home offices and studios.",
    "reviews": [
      { "name": "Mia T.", "rating_label": "★★★★★", "body": "The light feels premium and the dimming range is much better than most task lamps." },
      { "name": "Chris D.", "rating_label": "★★★★★", "body": "Looks clean on a desk, sets up fast, and the warm preset is excellent for evening work." },
      { "name": "Priya S.", "rating_label": "★★★★☆", "body": "Compact footprint, strong brightness, and the matte finish hides fingerprints well." }
    ],
    "recommendations_heading": "Pair it with",
    "recommendations_subheading": "Helpful extras customers add when buying the Aurora Desk Lamp.",
    "recommendations": [
      { "name": "Cable Management Clip Set", "description": "Minimal adhesive clips to keep charging and power cords aligned.", "price_cents": 1800, "panel_class_name": "from-orange-100 via-amber-50 to-white" },
      { "name": "Felt Desk Pad", "description": "Soft graphite mat for keyboards, notebooks, and accessories.", "price_cents": 3600, "panel_class_name": "from-sky-100 via-cyan-50 to-white" }
    ]
  }
  $json$::jsonb,
  'active'
)
on conflict (slug) do update
set
  brand = excluded.brand,
  category_label = excluded.category_label,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  rating = excluded.rating,
  review_count = excluded.review_count,
  storefront = excluded.storefront,
  status = excluded.status;

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  product_id uuid references public.products not null,
  name text not null,
  hypothesis text not null,
  product_context text,
  success_metric text not null default 'conversion_rate',
  status text not null default 'draft' check (status in ('draft', 'live', 'concluded')),
  winner text check (winner in ('control', 'treatment') or winner is null),
  created_at timestamptz not null default now()
);

create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments on delete cascade,
  type text not null check (type in ('control', 'treatment')),
  target_region text not null default 'purchase',
  html text not null,
  rationale text,
  created_at timestamptz not null default now()
);

create unique index if not exists variants_one_row_per_type_idx
on public.variants (experiment_id, type);

alter table public.variants
drop column if exists component_code;

alter table public.variants
drop column if exists scope;

alter table public.variants
drop column if exists section_hint;

alter table public.variants
drop column if exists section;

alter table public.variants
drop column if exists overrides;

alter table public.variants
drop column if exists scope_description;

alter table public.variants
add column if not exists target_region text not null default 'purchase';

alter table public.variants
add column if not exists html text not null default '';

alter table public.variants
add column if not exists created_at timestamptz not null default now();

alter table public.experiments
add column if not exists product_id uuid references public.products;

update public.experiments
set product_id = (
  select id from public.products where slug = 'pro-runner-elite-x'
)
where product_id is null;

alter table public.experiments
alter column product_id set not null;

create unique index if not exists experiments_one_live_per_product_idx
on public.experiments (product_id)
where status = 'live';

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments on delete cascade,
  variant_type text not null check (variant_type in ('control', 'treatment')),
  visitor_id text not null,
  converted boolean not null default false,
  created_at timestamptz not null default now()
);
