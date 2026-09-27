# VEGITO SYSTEM AUDIT — Phase 0

## 1. Current Architecture
- **Backend**: FastAPI (Python), SQLAlchemy 2.0 ORM, PostgreSQL (Neon/Cloud). Standard Layered Architecture: Routers -> Schemas -> Services -> Models.
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query (React Query).
- **Mobile**: Capacitor integration for Android, PWA-ready components.
- **Real-time**: WebSocket integration via `websocket_tracking.py` for dispatching order updates.

## 2. Existing Working Features
- **Auth**: OTP-based login and registration for all roles (Customer, Seller, Delivery Partner, Admin). JWT token management.
- **Product Discovery**: Category listing, product search (basic), and product details.
- **Marketplace Logic**: Master `Product` table linked to `SellerProduct` (listings) with price and stock overrides.
- **Inventory**: Transaction-aware inventory tracking (`inventory` + `inventory_transactions`).
- **Cart**: CRUD operations on cart items linked to specific seller listings.
- **Orders**: Basic checkout flow implemented in `OrderService` with subtotal calculation, delivery fee logic, and inventory deduction.
- **Layout**: `DashboardShell` and `DashboardSidebar` for consistent role-based navigation.

## 3. Existing APIs (Core)
- `/auth`: Login, Register, OTP Verify.
- `/products`: Global catalog and details.
- `/seller/products`: Seller-specific listing management.
- `/cart`: Item management.
- `/orders`: Checkout and order history.
- `/delivery`: Task assignment and status updates.

## 4. Missing Production Features
- **Order State Machine Enforcement**: Transitions need stricter validation in `OrderService`.
- **Delivery Safety**: OTP verification at customer doorstep is partially implemented but needs end-to-end wiring.
- **Real-time UI updates**: Dashboards need to react to WebSocket events (currently depends mostly on polling).
- **Payment Gateway**: Currently uses `mock` provider; needs real Razorpay/Stripe integration.
- **Admin Visibility**: Operational dashboard with live metrics is mostly boilerplate.
- **PWA Polish**: Manifest and service worker for offline-safe behavior.

## 5. Security Risks
- **RBAC Enforcement**: `RoleGuard` exists on the frontend, but backend dependencies (`require_seller`, `require_admin`) need verification across all sensitive routes to prevent IDOR.
- **Data Leakage**: Ensure seller-private data (like reference market analysis) doesn't leak through generic product APIs.

## 6. Performance Risks
- **N+1 Queries**: Several `joinedload` are present, but complex dashboards may still trigger multiple DB hits.
- **Connection Management**: Vercel serverless environment uses `NullPool` to avoid leaks, but local/Railway deployments need careful pool sizing.

## 7. Recommended Implementation Order
1. **Phase 1: Backend Integrity**: Standardize error responses and strictly enforce Order State Machine transitions.
2. **Phase 2: Customer Flow**: Complete the checkout-to-order-tracking loop with real-time status updates.
3. **Phase 3: Seller Operations**: Implement real-time "New Order" alerts and streamlined packing/ready flow.
4. **Phase 4: Delivery Partner**: Solidify the OTP-verified delivery completion and live GPS tracking.
5. **Phase 5: Admin Operations**: Build the live metrics dashboard.
6. **Phase 6: Security & Polish**: Final RBAC audit and PWA integration.
