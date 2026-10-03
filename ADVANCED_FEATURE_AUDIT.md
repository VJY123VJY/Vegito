# Vegito advanced-feature audit

This audit is based on the current FastAPI, SQLAlchemy, Next.js, and Capacitor
application. It is a rollout plan, not a claim that unsupported features are
available.

## Already connected to real backend data

| Capability | Current implementation |
| --- | --- |
| Customer discovery | `GET /api/v1/products` returns active master products and seller-specific offers. Customer UI filters customer-visible available offers. |
| Seller listings and stock | Seller product creation/update writes `products`, `seller_products`, and `inventory`; price and available inventory are revalidated server-side. |
| Customer behavior signals | Orders, order items, favorites, cart, reorder, and categories are persisted and customer-scoped. |
| Smart basket | Existing customer Smart Basket works from supplied real catalog offers; it does not place an order automatically. |
| Delivery | Delivery tasks, batches, pickup/delivery OTP, real-location endpoints, WebSockets, and Mapbox-backed tracking already exist. |
| Support and ratings | Complaints and reviews are existing authenticated workflows. |
| Promotions | Platform coupons and coupon usage exist; the backend validates active period, limits, and minimum order amount. |
| Android shell | Capacitor Android package, permissions, theme/i18n web experience, native back handling, and real API client already exist. |

## Phase 1 — core customer experience (no schema migration)

1. Add a backend-authorized customer-home feed derived only from the customer’s
   completed orders, favorites, and current active seller offers.
2. Surface Buy Again using current offer price and available inventory. Existing
   reorder already revalidates available items; retain that behavior.
3. Add limited-stock labels from `inventory.quantity - reserved_quantity`.
4. Add an honest empty state when no order/favorite history exists. Do not claim
   personalization when the source signal is absent.
5. Continue cache invalidation after seller price, stock, or availability updates.

## Phase 2 — seller and delivery intelligence (partially schema-supported)

Existing order, order-item, delivery task, batch, inventory transaction, and
seller listing records support real historical sales and stock reports. They can
power top/slow products, completed deliveries, and order-frequency aggregates.

Demand forecasts, traffic-aware ETA, and AI grocery recommendations must return
`NOT_CONFIGURED` until a configured forecast/routing provider is available.

## Schema-gated capabilities — do not implement until migration approval

| Capability | Existing limitation | Minimum backward-compatible addition |
| --- | --- | --- |
| Seller price history / price-drop alerts | `seller_products` keeps only current price. | `seller_product_price_history` with seller product, old/new price, actor, timestamp, reason. |
| Recently viewed and recommendation telemetry | No customer product-view event is persisted. | `customer_product_events` with user, product, event type, timestamp. |
| Seller offers / fixed-price baskets | `coupons` are platform-wide flat/percentage discounts and contain no seller, products, bundle, or eligibility rule. | Offer, offer-item, and offer-eligibility-rule tables; checkout must validate all of them transactionally. |
| Repeat-customer promotions | Coupon usage tracks use but coupon has no seller or qualification rules. | The offer eligibility rule above, including seller, order count, period, minimum value, per-customer limit. |
| Recurring orders / saved lists | No schedule or list ownership/item tables exist. | Shopping-list, shopping-list-item, and recurring-order-schedule tables; scheduled order always needs price/stock confirmation. |
| Referrals / rewards | No referral ownership, reward ledger, or anti-abuse state exists. | Referral and reward-ledger tables with unique/referrer constraints and review state. |
| KYC | No private-document metadata or authorization model exists. | KYC submission/document tables with private object-store key, status, reviewer, timestamps. |
| Risk monitoring | No risk event/audit model exists. | Risk-event table with subject, category, score, evidence reference, review status, and actor audit fields. |

## Security and data rules

- Backend keeps authority over roles, prices, inventory, coupons, OTP, delivery
  assignment, location access, and order states.
- Customer-specific feeds must use `require_customer` and the authenticated
  user ID, never a client-provided customer ID.
- Seller-private analysis must never be returned from public product, offer, or
  customer endpoints.
- Current checkout must remain the final price and stock validation boundary.
- No migrations, seed data, mock offers, mock GPS, or synthetic analytics are
  included in this phase.

## Recommended next implementation

Approve Phase 1 customer-home feed first. It has a complete source of truth in
the current schema and produces useful personalization without a database
migration. Approve the listed offer/price-history migration as the next step
only if seller promotions and price alerts are required.
