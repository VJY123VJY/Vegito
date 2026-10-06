import { api, type ApiEnvelope } from "./client";
import { getAuthToken } from "./auth";

export type CartItem = {
  id: number;
  seller_product_id: number;
  product_id: number;
  product_name: string;
  unit: string;
  image_url?: string | null;
  price_per_unit: number;
  quantity: number;
  item_total: number;
  is_available: boolean;
  seller_id?: number;
  seller_business_name?: string;
};

export type Cart = {
  id: number;
  items: CartItem[];
  total_items_count: number;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  total_amount: number;
};

const GUEST_CART_KEY = "vegito_guest_cart";

function readGuestCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeGuestCartItems(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("vegito:cart_updated", { detail: { itemsCount: items.length } }));
  } catch {
    // quota exceeded or private mode
  }
}

export function buildGuestCart(): Cart {
  const items = readGuestCartItems();
  const subtotal = items.reduce((sum, it) => sum + (Number(it.price_per_unit) || 0) * (Number(it.quantity) || 0), 0);
  const delivery_charge = subtotal === 0 || subtotal >= 300 ? 0 : 30;
  const discount_amount = 0;
  const total_amount = subtotal + delivery_charge - discount_amount;

  return {
    id: 0,
    items,
    total_items_count: items.reduce((sum, it) => sum + it.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    delivery_charge,
    discount_amount,
    total_amount: Math.round(total_amount * 100) / 100,
  };
}

export async function getCart(): Promise<Cart> {
  const token = getAuthToken();
  if (!token) {
    return buildGuestCart();
  }
  try {
    const { data } = await api.get<ApiEnvelope<Cart>>("/cart");
    return data.data;
  } catch (err: any) {
    if (err?.response?.status === 401) {
      return buildGuestCart();
    }
    throw err;
  }
}

export async function addCartItem(
  sellerProductId: number,
  quantity: number = 1,
  extraDetails?: {
    productId?: number;
    productName?: string;
    unit?: string;
    price?: number;
    imageUrl?: string | null;
    sellerId?: number;
    sellerName?: string;
  }
): Promise<Cart> {
  const token = getAuthToken();
  if (token) {
    const { data } = await api.post<ApiEnvelope<Cart>>("/cart/items", {
      seller_product_id: sellerProductId,
      quantity,
    });
    return data.data;
  }

  // Guest Cart management
  const items = readGuestCartItems();
  const existingIndex = items.findIndex((it) => it.seller_product_id === sellerProductId);

  if (existingIndex >= 0) {
    items[existingIndex].quantity += quantity;
    items[existingIndex].item_total =
      Math.round(items[existingIndex].quantity * items[existingIndex].price_per_unit * 100) / 100;
  } else {
    // Single-seller cart check for guest: if existing items from another seller
    if (items.length > 0 && extraDetails?.sellerId) {
      const existingSellerId = items[0].seller_id;
      if (existingSellerId && existingSellerId !== extraDetails.sellerId) {
        const storeName = items[0].seller_business_name || "another store";
        throw new Error(
          `Your basket already contains items from "${storeName}". Vegito orders are fulfilled by a single store within 20 KM. Please clear your basket or checkout first.`
        );
      }
    }

    const price = extraDetails?.price ?? 0;
    const newItem: CartItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      seller_product_id: sellerProductId,
      product_id: extraDetails?.productId ?? 0,
      product_name: extraDetails?.productName ?? "Fresh Produce",
      unit: extraDetails?.unit ?? "1 KG",
      image_url: extraDetails?.imageUrl ?? null,
      price_per_unit: price,
      quantity,
      item_total: Math.round(price * quantity * 100) / 100,
      is_available: true,
      seller_id: extraDetails?.sellerId,
      seller_business_name: extraDetails?.sellerName,
    };
    items.push(newItem);
  }

  writeGuestCartItems(items);
  return buildGuestCart();
}

export async function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  const token = getAuthToken();
  if (token) {
    const { data } = await api.patch<ApiEnvelope<Cart>>(`/cart/items/${itemId}`, { quantity });
    return data.data;
  }

  let items = readGuestCartItems();
  if (quantity <= 0) {
    items = items.filter((it) => it.id !== itemId);
  } else {
    const item = items.find((it) => it.id === itemId);
    if (item) {
      item.quantity = quantity;
      item.item_total = Math.round(quantity * item.price_per_unit * 100) / 100;
    }
  }

  writeGuestCartItems(items);
  return buildGuestCart();
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const token = getAuthToken();
  if (token) {
    const { data } = await api.delete<ApiEnvelope<Cart>>(`/cart/items/${itemId}`);
    return data.data;
  }

  const items = readGuestCartItems().filter((it) => it.id !== itemId);
  writeGuestCartItems(items);
  return buildGuestCart();
}

export async function clearGuestCart(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    window.dispatchEvent(new CustomEvent("vegito:cart_updated", { detail: { itemsCount: 0 } }));
  } catch {
    // ignore
  }
}

/**
 * Synchronizes any guest cart items into the backend after successful login/registration.
 */
export async function syncGuestCartToBackend(): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  const guestItems = readGuestCartItems();
  if (!guestItems.length) return;

  for (const item of guestItems) {
    try {
      await api.post("/cart/items", {
        seller_product_id: item.seller_product_id,
        quantity: item.quantity,
      });
    } catch (err) {
      console.warn("Guest cart sync item warning:", err);
    }
  }

  clearGuestCart();
}
