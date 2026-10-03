"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ExternalLink, Heart, MapPin, Package, ShoppingBasket, Sparkles, Truck, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "@/lib/api/categories";
import { addCartItem, getCart, removeCartItem, updateCartItem } from "@/lib/api/cart";
import { getOrder, listOrders, Order, reorder } from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { listPromotions } from "@/lib/api/promotions";
import { listFavorites } from "@/lib/api/favorites";
import { getStoredUserName } from "@/lib/api/auth";
import { getCustomerHomeFeed } from "@/lib/api/customers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AddressSelector } from "@/components/customer/address-selector";
import { CustomerInsights } from "@/components/customer/customer-insights";
import { SmartBasket } from "@/components/customer/smart-basket";
import { ProductCard } from "@/components/product/product-card";
import { ZigZagProductSection } from "@/components/product/zigzag-product-section";
import { OfferCarousel } from "@/components/customer/offer-carousel";
import { CustomerLocationMap } from "@/components/map/customer-location-map";
import { OrderComplaintModal } from "@/components/order/order-complaint-modal";
import { DeliveryReviewModal } from "@/components/order/delivery-review-modal";
import { RoleGuard } from "@/components/role/role-guard";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getErrorMessage } from "@/lib/api/client";
import { useTranslation } from "@/context/i18n-context";
import styles from "@/styles/customer-dashboard.module.css";

const ACTIVE_STATUSES = ["PENDING", "NEW", "ACCEPTED", "CONFIRMED", "PACKING", "READY", "OUT_FOR_DELIVERY"];
const ORDER_STEPS = ["Confirmed", "Packing", "Ready", "Out for delivery", "Delivered"];

function getGreeting(name: string) {
  return `Welcome, ${name || "there"}`;
}

function categoryEmoji(name: string) {
  const value = name.toLowerCase();
  if (value.includes("fruit")) return "🍎";
  if (value.includes("leaf")) return "🥬";
  if (value.includes("root")) return "🥕";
  if (value.includes("spice")) return "🌶️";
  return "🥦";
}

function activeStep(status: string) {
  if (["DELIVERED", "COMPLETED"].includes(status)) return 4;
  if (status === "OUT_FOR_DELIVERY") return 3;
  if (status === "READY") return 2;
  if (status === "PACKING") return 1;
  return 0;
}

export function CustomerHome() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [complaintOrder, setComplaintOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  useEffect(() => setUserName(getStoredUserName()), []);

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const cart = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const orders = useQuery({ queryKey: ["customer-orders"], queryFn: () => listOrders() });
  const favorites = useQuery({ queryKey: ["customer-favorites"], queryFn: listFavorites });
  const homeFeed = useQuery({ queryKey: ["customer-home-feed"], queryFn: getCustomerHomeFeed });
  const promotions = useQuery({
    queryKey: ["marketplace-promotions"],
    queryFn: listPromotions,
    staleTime: 60_000,
  });
  const products = useQuery({
    queryKey: ["customer-products", selectedCategoryId, searchQuery],
    queryFn: () => getProducts({ categoryId: selectedCategoryId || undefined, search: searchQuery.trim() || undefined, pageSize: 100 }),
  });

  const orderList = orders.data?.items ?? [];
  const activeOrder = orderList.find((order) => ACTIVE_STATUSES.includes(order.status));
  const cartItems = cart.data?.items ?? [];
  const cartCount = cart.data?.total_items_count ?? cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const favoriteCount = favorites.data?.length ?? 0;

  const cartQuantityByProduct = useMemo(() => {
    const map: Record<number, { qty: number; sellerProductId: number }> = {};
    cartItems.forEach((item) => {
      map[item.product_id] = { qty: item.quantity, sellerProductId: item.seller_product_id };
    });
    return map;
  }, [cartItems]);

  const activeOrderDetail = useQuery({
    queryKey: ["customer-order-detail", activeOrder?.id],
    queryFn: () => getOrder(activeOrder!.id),
    enabled: Boolean(activeOrder?.id && activeOrder.status === "OUT_FOR_DELIVERY"),
    refetchInterval: 10000,
  });

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const addMutation = useMutation({
    mutationFn: (sellerProductId: number) => addCartItem(sellerProductId, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast(t("customer.addedToCart", "Added to your basket"));
    },
    onError: (error) => showToast(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      quantity > 0 ? updateCartItem(itemId, quantity) : removeCartItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (error) => showToast(getErrorMessage(error)),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderId: number) => reorder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast(t("customer.repeatItems", "Available items added to your basket"));
    },
    onError: (error) => showToast(getErrorMessage(error)),
  });

  const availableProducts = useMemo(() => products.data?.items ?? [], [products.data?.items]);

  const productQuantity = (productId: number) => {
    const offerIds = availableProducts.find((p) => p.id === productId)?.seller_products.map((offer) => offer.seller_product_id) ?? [];
    return cartItems.find((item) => offerIds.includes(item.seller_product_id))?.quantity ?? 0;
  };

  const changeProductQuantity = (productId: number, quantity: number) => {
    const offerIds = availableProducts.find((p) => p.id === productId)?.seller_products.map((offer) => offer.seller_product_id) ?? [];
    const item = cartItems.find((cartItem) => offerIds.includes(cartItem.seller_product_id));
    if (item) updateMutation.mutate({ itemId: item.id, quantity });
  };

  const getCategoryTitle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === "vegetables") return t("categories.vegetables", "Vegetables");
    if (lower === "fruits") return t("categories.fruits", "Fruits");
    if (lower.includes("leafy")) return t("categories.leafy", "Leafy Vegetables");
    if (lower.includes("root")) return t("categories.root", "Root Vegetables");
    return name;
  };

  return (
    <RoleGuard allow={["CUSTOMER"]}>
      <DashboardShell
        role="customer"
        userName={userName}
        userRole="Customer"
        greeting={getGreeting(userName)}
        subtitle={t("customer.realStock", "Fresh vegetables, fruits and groceries from local sellers")}
        searchPlaceholder={t("customer.searchVeg", "Search vegetables, fruits & groceries...")}
        onSearchChange={setSearchQuery}
      >
        <div className={styles.dashboard}>
          <div className={styles.shell}>
            <section className={styles.hero} aria-labelledby="customer-hero-title">
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>
                  <Sparkles size={14} /> {t("customer.farmToKitchen", "Farm to kitchen, with care")}
                </p>
                <h1 id="customer-hero-title">
                  {t("customer.heroHeading", "Fresh choices for the way you cook.")}
                </h1>
                <p>
                  {t("customer.heroSub", "Browse today's real stock from local sellers, then let Vegito bring it home.")}
                </p>
              </div>
              <div className={styles.heroArt} aria-hidden="true">🥬🍅</div>
            </section>

            <div className={styles.location}>
              <AddressSelector
                selectedAddressId={selectedAddressId}
                onSelectAddress={(address) => setSelectedAddressId(address.id)}
              />
            </div>

            {/* Quick Actions */}
            <section className={styles.section} aria-labelledby="quick-actions-title">
              <div className={styles.sectionHead}>
                <div>
                  <h2 id="quick-actions-title">{getGreeting(userName)} 👋</h2>
                  <p>What would you like to do today?</p>
                </div>
              </div>
              <div className={styles.quickGrid}>
                <Link className={styles.quickAction} href="#fresh-today">
                  <span className={styles.quickIcon}><ShoppingBasket size={19} /></span>
                  <strong>{t("customer.shopFresh", "Shop fresh")}</strong>
                  <span>{t("customer.freshVeg", "Farm-fresh vegetables")}</span>
                </Link>

                <Link className={styles.quickAction} href={orderList.length ? `/customer/orders/${orderList[0].id}` : "/customer/orders"}>
                  <span className={styles.quickIcon}><Package size={19} /></span>
                  <strong>{t("customer.buyAgain", "Buy again")}</strong>
                  <span>{orderList.length ? "Your recent order" : t("customer.noOrders", "No orders yet")}</span>
                </Link>

                <Link className={styles.quickAction} href="/customer/orders">
                  <span className={styles.quickIcon}><Truck size={19} /></span>
                  <strong>{t("customer.myOrders", "My orders")}</strong>
                  <span>{orderList.length ? `${orderList.length} order${orderList.length === 1 ? "" : "s"}` : t("customer.noOrders", "No orders yet")}</span>
                </Link>

                <Link className={styles.quickAction} href="/customer/track">
                  <span className={styles.quickIcon}><MapPin size={19} /></span>
                  <strong>{t("customer.trackOrder", "Track order")}</strong>
                  <span>{activeOrder ? "See delivery status" : t("customer.noActiveDeliveries", "No active delivery")}</span>
                </Link>

                <Link className={styles.quickAction} href="/customer/favorites">
                  <span className={styles.quickIcon}><Heart size={19} /></span>
                  <strong>{t("customer.favorites", "Favorites")}</strong>
                  <span>{favoriteCount ? `${favoriteCount} saved` : t("customer.noFavorites", "Save produce you love")}</span>
                </Link>

                <Link className={styles.quickAction} href="/customer/b2b">
                  <span className={styles.quickIcon}><Building2 size={19} /></span>
                  <strong>{t("b2b.portalTitle", "B2B Bulk Orders")}</strong>
                  <span>Restaurants & Events</span>
                </Link>
              </div>
            </section>

            {/* Active Delivery Order Tracker */}
            <section className={styles.section} aria-labelledby="delivery-title">
              {activeOrder ? (
                <div className={styles.orderPanel}>
                  <div className={styles.orderTop}>
                    <div>
                      <h3 id="delivery-title">Your order is moving through Vegito</h3>
                      <p>Order #{activeOrder.order_number} · ₹{Number(activeOrder.total_amount).toFixed(0)}</p>
                    </div>
                    <StatusBadge status={activeOrder.status} />
                  </div>
                  <div className={styles.timeline} aria-label={`Order status: ${activeOrder.status}`}>
                    {ORDER_STEPS.map((step, index) => (
                      <div className={`${styles.timelineStep} ${index <= activeStep(activeOrder.status) ? styles.done : ""}`} key={step}>
                        {step}
                      </div>
                    ))}
                  </div>
                  {activeOrder.status === "OUT_FOR_DELIVERY" && activeOrderDetail.data ? (
                    <CustomerLocationMap
                      orderId={activeOrder.id}
                      orderNumber={activeOrder.order_number}
                      orderStatus={activeOrder.status}
                      partnerName={activeOrderDetail.data.delivery_partner_name || undefined}
                      deliveryAddress={activeOrderDetail.data.address?.address_line1}
                      customerLocation={activeOrderDetail.data.customer_latitude != null && activeOrderDetail.data.customer_longitude != null ? { lat: Number(activeOrderDetail.data.customer_latitude), lng: Number(activeOrderDetail.data.customer_longitude) } : null}
                      partnerLocation={activeOrderDetail.data.delivery_latitude != null && activeOrderDetail.data.delivery_longitude != null ? { lat: Number(activeOrderDetail.data.delivery_latitude), lng: Number(activeOrderDetail.data.delivery_longitude) } : null}
                    />
                  ) : null}
                </div>
              ) : (
                <div className={styles.empty}>
                  <strong>{t("customer.noActiveDeliveries", "Your active deliveries will appear here.")}</strong>
                  <span>{t("customer.noOrdersDesc", "Fresh products are waiting when you are ready.")}</span>
                </div>
              )}
            </section>

            <OfferCarousel
              promotions={promotions.data ?? []}
              isLoading={promotions.isLoading}
              isError={promotions.isError}
              onRetry={() => promotions.refetch()}
              onAddToCart={(spId) => addMutation.mutate(spId)}
            />

            {/* Product Catalogue & Category Filter */}
            <section className={styles.section} id="fresh-today" aria-labelledby="fresh-title">
              <div className={styles.sectionHead}>
                <div>
                  <h2 id="fresh-title">{t("customer.freshToday", "Fresh today")}</h2>
                  <p>{t("customer.realStock", "Real availability and freshness indicators from Vegito sellers.")}</p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
                  <a
                    className={styles.textAction}
                    href="https://wa.me/c/918855969612"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("customer.whatsappCatalogue", "WhatsApp catalogue")} <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <Link className={styles.textAction} href="/search">
                    {t("common.all", "Explore all")} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              <div className={styles.catalogLayout}>
                <div>
                  {/* Category Rail: ALL PRODUCE, VEGETABLES, FRUITS, LEAFY VEGETABLES, ROOT VEGETABLES */}
                  <div className={styles.categoryRail} aria-label="Product categories">
                    <button
                      className={styles.categoryButton}
                      aria-pressed={selectedCategoryId === null}
                      onClick={() => setSelectedCategoryId(null)}
                    >
                      <span className={styles.categoryEmoji}>🌱</span>
                      {t("categories.all", "All produce")}
                    </button>
                    {(categories.data ?? []).map((category) => (
                      <button
                        className={styles.categoryButton}
                        aria-pressed={selectedCategoryId === category.id}
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <span className={styles.categoryEmoji}>{categoryEmoji(category.name)}</span>
                        {getCategoryTitle(category.name)}
                      </button>
                    ))}
                  </div>

                  {products.isLoading ? (
                    <div className={styles.productGrid}>
                      {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div className={styles.empty} key={item}>Loading fresh stock...</div>
                      ))}
                    </div>
                  ) : products.isError ? (
                    <div className={styles.empty}>
                      <strong>Fresh products couldn&apos;t be loaded.</strong>
                      <span>Try searching again in a moment.</span>
                    </div>
                  ) : availableProducts.length === 0 ? (
                    <div className={styles.empty}>
                      <strong>No produce matches this search.</strong>
                      <span>Try another category or search term.</span>
                    </div>
                  ) : (
                    <ZigZagProductSection
                      products={availableProducts}
                      cartQuantityByProduct={cartQuantityByProduct}
                      onProductQtyChange={(product, qty) => changeProductQuantity(product.id, qty)}
                      onAddToCart={(sellerProductId) => addMutation.mutate(sellerProductId)}
                      title={t("customer.freshToday", "Fresh today")}
                      subtitle={t("customer.realStock", "Real availability and freshness indicators from Vegito sellers.")}
                    />
                  )}
                </div>

                <aside className={styles.sideStack}>
                  <div className={styles.insightPanel}>
                    <CustomerInsights orders={orderList} />
                  </div>
                  <div className={styles.insightPanel}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h2>{t("customer.yourCart", "Basket")}</h2>
                        <p>{cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} ready` : t("customer.basketEmpty", "Your basket is empty")}</p>
                      </div>
                      <ShoppingBasket size={22} color="var(--dash-accent)" />
                    </div>
                    {cartCount ? (
                      <Link className={styles.primaryButton} href="/customer/cart">
                        Review basket <ArrowRight size={15} />
                      </Link>
                    ) : (
                      <Link className={styles.textAction} href="#fresh-today">
                        {t("customer.startShopping", "Start shopping")}
                      </Link>
                    )}
                  </div>
                </aside>
              </div>
            </section>

            {/* Buy Again (Previous Orders) */}
            {homeFeed.data?.buy_again.length ? (
              <section className={styles.section} aria-labelledby="personalized-buy-again-title">
                <div className={styles.sectionHead}>
                  <div>
                    <h2 id="personalized-buy-again-title">Based on your previous orders</h2>
                    <p>Current prices and stock from available local sellers.</p>
                  </div>
                </div>
                <div className={styles.productGrid}>
                  {homeFeed.data.buy_again.map((product) => {
                    const offer = product.seller_products
                      .filter((sellerOffer) => sellerOffer.is_available && Number(sellerOffer.stock_quantity) > 0)
                      .sort((a, b) => Number(a.price) - Number(b.price))[0];
                    return offer ? (
                      <ProductCard
                        key={product.id}
                        product={{ ...product, seller_products: [offer] }}
                        quantity={productQuantity(product.id)}
                        onChange={(quantity) => changeProductQuantity(product.id, quantity)}
                        onAddToCart={(sellerProductId) => addMutation.mutate(sellerProductId)}
                      />
                    ) : null;
                  })}
                </div>
              </section>
            ) : null}

            {orderList.length > 0 && (
              <section className={styles.section} aria-labelledby="buy-again-title">
                <div className={styles.sectionHead}>
                  <div>
                    <h2 id="buy-again-title">{t("customer.buyAgain", "Buy again")}</h2>
                    <p>Your previous orders are ready to repeat when stock allows.</p>
                  </div>
                  <Link className={styles.textAction} href="/customer/orders">
                    View orders <ArrowRight size={14} />
                  </Link>
                </div>
                <div className={styles.orderPanel}>
                  <div className={styles.orderTop}>
                    <div>
                      <h3>Order #{orderList[0].order_number}</h3>
                      <p>{orderList[0].items_count ?? "Your"} items · ₹{Number(orderList[0].total_amount).toFixed(0)}</p>
                    </div>
                    <button
                      className={styles.primaryButton}
                      onClick={() => reorderMutation.mutate(orderList[0].id)}
                      disabled={reorderMutation.isPending}
                    >
                      {t("customer.repeatItems", "Repeat available items")}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Smart Basket Builder */}
            {availableProducts.length > 0 && (
              <section className={styles.section}>
                <SmartBasket products={availableProducts} onSuccess={showToast} />
              </section>
            )}

            {/* Bulk Ordering Panel */}
            <section className={styles.section}>
              <div className={styles.bulkPanel}>
                <div>
                  <h2>{t("customer.bulkOrder", "Buying for a restaurant, hotel or event?")}</h2>
                  <p>Bulk ordering is available through our support team when your business needs a larger basket.</p>
                </div>
                <Link className={styles.primaryButton} href="/customer/profile">
                  <UserRound size={16} /> {t("customer.contactVegito", "Contact Vegito")}
                </Link>
              </div>
            </section>

            {/* Recent Orders List */}
            {orderList.length > 0 && (
              <section className={styles.section} aria-labelledby="recent-orders-title">
                <div className={styles.sectionHead}>
                  <div>
                    <h2 id="recent-orders-title">{t("customer.myOrders", "Recent orders")}</h2>
                    <p>Your account activity, kept private to you.</p>
                  </div>
                </div>
                <div className={styles.sideStack}>
                  {orderList.slice(0, 3).map((order) => (
                    <div className={styles.orderPanel} key={order.id}>
                      <div className={styles.orderTop}>
                        <div>
                          <h3>#{order.order_number}</h3>
                          <p>{new Date(order.placed_at).toLocaleDateString("en-IN")} · ₹{Number(order.total_amount).toFixed(0)}</p>
                        </div>
                        <div>
                          <StatusBadge status={order.status} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <Link className={styles.textAction} href={`/customer/orders/${order.id}`}>
                              {t("common.viewDetails", "Details")}
                            </Link>
                            {order.status === "DELIVERED" || order.status === "COMPLETED" ? (
                              <button className={styles.textAction} onClick={() => setReviewOrder(order)}>
                                Rate
                              </button>
                            ) : null}
                            <button className={styles.textAction} onClick={() => setComplaintOrder(order)}>
                              Report
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
        {complaintOrder ? (
          <OrderComplaintModal
            orderId={complaintOrder.id}
            orderNumber={complaintOrder.order_number}
            isOpen
            onClose={() => setComplaintOrder(null)}
            onSuccess={() => {
              setComplaintOrder(null);
              showToast("Your report was sent to Vegito support");
            }}
          />
        ) : null}
        {reviewOrder ? (
          <DeliveryReviewModal
            orderId={reviewOrder.id}
            orderNumber={reviewOrder.order_number}
            isOpen
            onClose={() => setReviewOrder(null)}
            onSuccess={() => {
              setReviewOrder(null);
              showToast("Thanks for rating your delivery");
            }}
          />
        ) : null}
      </DashboardShell>
    </RoleGuard>
  );
}
