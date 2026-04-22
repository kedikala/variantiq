-- Usage:
--   select public.seed_demo_experiments_for_email('merchant@example.com');

create or replace function public.seed_demo_experiments_for_email(target_email text)
returns void
language plpgsql
as $$
declare
  normalized_email text := lower(trim(target_email));
  demo_user_id uuid;
  shoe_product_id uuid;
  urgency_experiment_id uuid;
  shipping_experiment_id uuid;
  hero_experiment_id uuid;
begin
  if normalized_email is null or normalized_email = '' then
    raise exception 'A merchant email is required.';
  end if;

  select id
  into demo_user_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if demo_user_id is null then
    raise exception 'Demo user % does not exist in auth.users. Create it first, then rerun this seed.', normalized_email;
  end if;

  select id
  into shoe_product_id
  from public.products
  where slug = 'pro-runner-elite-x'
  limit 1;

  if shoe_product_id is null then
    raise exception 'Product pro-runner-elite-x is missing. Run lib/db/schema.sql first.';
  end if;

  delete from public.experiments
  where user_id = demo_user_id
    and product_id = shoe_product_id
    and name in (
      'Urgency Under The CTA',
      'Shipping Confidence In Trust Band',
      'Premium Hero Performance Angle'
    );

  insert into public.experiments (
    user_id,
    product_id,
    name,
    hypothesis,
    success_metric,
    status,
    winner,
    created_at
  )
  values (
    demo_user_id,
    shoe_product_id,
    'Urgency Under The CTA',
    'If we add a low-stock urgency message directly beneath the add-to-cart button, more shoppers will purchase because the product will feel more time-sensitive.',
    'conversion_rate',
    'concluded',
    'treatment',
    '2026-03-20T14:00:00.000Z'
  )
  returning id into urgency_experiment_id;

  insert into public.experiments (
    user_id,
    product_id,
    name,
    hypothesis,
    success_metric,
    status,
    winner,
    created_at
  )
  values (
    demo_user_id,
    shoe_product_id,
    'Shipping Confidence In Trust Band',
    'If we emphasize free 2-day shipping and easy returns in the trust band below the purchase controls, conversion rate will increase because shoppers will feel less delivery and return risk.',
    'conversion_rate',
    'concluded',
    null,
    '2026-03-17T15:30:00.000Z'
  )
  returning id into shipping_experiment_id;

  insert into public.experiments (
    user_id,
    product_id,
    name,
    hypothesis,
    success_metric,
    status,
    winner,
    created_at
  )
  values (
    demo_user_id,
    shoe_product_id,
    'Premium Hero Performance Angle',
    'If we lead with a premium race-day performance message in the hero instead of a comfort-first framing, more ambitious runners will convert because the product will feel more elite and differentiated.',
    'conversion_rate',
    'concluded',
    null,
    '2026-03-13T12:15:00.000Z'
  )
  returning id into hero_experiment_id;

  insert into public.variants (
    experiment_id,
    type,
    target_region,
    html,
    rationale,
    created_at
  )
  values
    (
      urgency_experiment_id,
      'control',
      'purchase',
      '<div class="space-y-4"><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Size</span><span class="text-xs text-slate-500">Selected: <span data-selected-size>9</span></span></div><div class="grid grid-cols-4 gap-2"><button data-size-option="8" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">8</button><button data-size-option="9" data-selected="true" class="rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white">9</button><button data-size-option="10" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">10</button><button data-size-option="11" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">11</button></div><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quantity</span><span class="text-xs text-slate-500">Max 10</span></div><div class="flex items-center gap-3"><button data-quantity-action="decrease" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">-</button><span data-quantity-value class="min-w-[2rem] text-center text-base font-semibold text-slate-900">1</span><button data-quantity-action="increase" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">+</button></div><button data-primary-cta="true" class="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Add to Cart</button></div>',
      'Baseline purchase module with the standard CTA and no urgency copy.',
      '2026-03-20T14:00:00.000Z'
    ),
    (
      urgency_experiment_id,
      'treatment',
      'purchase',
      '<div class="space-y-4"><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Size</span><span class="text-xs text-slate-500">Selected: <span data-selected-size>9</span></span></div><div class="grid grid-cols-4 gap-2"><button data-size-option="8" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">8</button><button data-size-option="9" data-selected="true" class="rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white">9</button><button data-size-option="10" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">10</button><button data-size-option="11" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">11</button></div><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quantity</span><span class="text-xs text-slate-500">Max 10</span></div><div class="flex items-center gap-3"><button data-quantity-action="decrease" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">-</button><span data-quantity-value class="min-w-[2rem] text-center text-base font-semibold text-slate-900">1</span><button data-quantity-action="increase" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">+</button></div><button data-primary-cta="true" class="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Add to Cart</button><div class="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Only 12 left in your size. Popular sizes sell out before race weekend.</div></div>',
      'Adds credible scarcity directly under the CTA while preserving the existing purchase interaction flow.',
      '2026-03-20T14:00:00.000Z'
    ),
    (
      shipping_experiment_id,
      'control',
      'trust',
      '<div class="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3"><div class="rounded-2xl bg-white px-4 py-3">Free shipping over $150</div><div class="rounded-2xl bg-white px-4 py-3">30-day returns</div><div class="rounded-2xl bg-white px-4 py-3">Secure checkout</div></div>',
      'Baseline reassurance row with generic shipping and returns messaging.',
      '2026-03-17T15:30:00.000Z'
    ),
    (
      shipping_experiment_id,
      'treatment',
      'trust',
      '<div class="grid gap-3 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800 sm:grid-cols-3"><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">Free 2-day shipping</span><div class="mt-1 text-xs text-slate-500">On this order today</div></div><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">30-day free returns</span><div class="mt-1 text-xs text-slate-500">Try the fit at home</div></div><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">Secure checkout</span><div class="mt-1 text-xs text-slate-500">Encrypted card processing</div></div></div>',
      'Makes fulfillment confidence more explicit, but keeps the layout and purchase flow unchanged.',
      '2026-03-17T15:30:00.000Z'
    ),
    (
      hero_experiment_id,
      'control',
      'hero',
      '<div class="space-y-4"><p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Stridewell Running</p><h1 class="text-4xl font-semibold tracking-tight text-slate-950">ProRunner Elite X</h1><div class="flex items-center gap-2 text-sm text-slate-600"><span class="text-amber-500">★★★★★</span><span>4.5 stars · 247 reviews</span></div><p class="text-3xl font-semibold text-emerald-900">$189.00</p><p class="max-w-xl text-base leading-7 text-slate-600">Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.</p></div>',
      'Baseline hero balances speed and comfort without over-indexing on elite performance.',
      '2026-03-13T12:15:00.000Z'
    ),
    (
      hero_experiment_id,
      'treatment',
      'hero',
      '<div class="space-y-4"><p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Stridewell Running</p><h1 class="text-4xl font-semibold tracking-tight text-slate-950">Built For Your Fastest Race Day</h1><div class="flex items-center gap-2 text-sm text-slate-600"><span class="text-amber-500">★★★★★</span><span>4.5 stars · 247 reviews</span></div><p class="text-3xl font-semibold text-emerald-900">$189.00</p><p class="max-w-xl text-base leading-7 text-slate-600">Ultra-responsive propulsion, elite race geometry, and an aggressive feel designed to shave seconds when every split matters.</p></div>',
      'Pushes a more elite and aggressive hero message to test whether ambition beats comfort-first framing.',
      '2026-03-13T12:15:00.000Z'
    );

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    urgency_experiment_id,
    'control',
    'demo-exp-1-control-' || series_index,
    series_index <= 47,
    '2026-03-20T14:00:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 640) as series_index;

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    urgency_experiment_id,
    'treatment',
    'demo-exp-1-treatment-' || series_index,
    series_index <= 76,
    '2026-03-20T14:00:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 645) as series_index;

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    shipping_experiment_id,
    'control',
    'demo-exp-2-control-' || series_index,
    series_index <= 38,
    '2026-03-17T15:30:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 420) as series_index;

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    shipping_experiment_id,
    'treatment',
    'demo-exp-2-treatment-' || series_index,
    series_index <= 41,
    '2026-03-17T15:30:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 418) as series_index;

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    hero_experiment_id,
    'control',
    'demo-exp-3-control-' || series_index,
    series_index <= 62,
    '2026-03-13T12:15:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 560) as series_index;

  insert into public.visits (experiment_id, variant_type, visitor_id, converted, created_at)
  select
    hero_experiment_id,
    'treatment',
    'demo-exp-3-treatment-' || series_index,
    series_index <= 48,
    '2026-03-13T12:15:00.000Z'::timestamptz + (series_index || ' minutes')::interval
  from generate_series(1, 558) as series_index;
end;
$$;
