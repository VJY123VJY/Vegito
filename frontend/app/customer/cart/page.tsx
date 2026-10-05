"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Truck, ShieldCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/api/client";
import { getCart, removeCartItem, updateCartItem } from "@/lib/api/cart";

export default function CartPage() {
  const client = useQueryClient();

  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      quantity,
    }: {
      id: number;
      quantity: number;
    }) =>
      quantity > 0
        ? updateCartItem(id, quantity)
        : removeCartItem(id),

    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  if (cart.isLoading) {
    return (
      <main className="simple-page">
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              height: "32px",
              width: "180px",
              background: "#e8eee9",
              borderRadius: "8px",
              marginBottom: "24px",
              animation: "pulse 1.5s infinite",
            }}
          />

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                height: "90px",
                background: "#ffffff",
                border: "1px solid #e1e8e2",
                borderRadius: "14px",
                marginBottom: "12px",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      </main>
    );
  }

  if (cart.isError) {
    return (
      <main className="simple-page">
        <div
          style={{
            maxWidth: "700px",
            margin: "60px auto",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>🛒</div>

          <h1
            style={{
              margin: "0 0 8px",
              color: "#063c32",
              fontSize: "24px",
            }}
          >
            Unable to load your basket
          </h1>

          <p
            style={{
              color: "#62746a",
              marginBottom: "20px",
            }}
          >
            {getErrorMessage(cart.error)}
          </p>

          <Link
            className="primary-action"
            href="/auth/customer"
            style={{
              display: "inline-flex",
              textDecoration: "none",
            }}
          >
            Log in to continue
          </Link>
        </div>
      </main>
    );
  }

  if (!cart.data) {
    return (
      <main className="simple-page">
        <div
          style={{
            maxWidth: "700px",
            margin: "60px auto",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <ShoppingBag
            size={42}
            color="#16835b"
            style={{ marginBottom: "12px" }}
          />

          <h1 style={{ color: "#063c32" }}>
            Your basket is unavailable
          </h1>

          <p style={{ color: "#62746a" }}>
            Please try again in a moment.
          </p>
        </div>
      </main>
    );
  }

  const data = cart.data;
  const items = data.items ?? [];

  const itemCount = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  return (
    <main className="simple-page">
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "28px 20px 60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          <div>
            <Link
              href="/customer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#16835b",
                fontSize: "12.5px",
                fontWeight: 700,
                textDecoration: "none",
                marginBottom: "10px",
              }}
            >
              <ArrowLeft size={14} />
              Continue shopping
            </Link>

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
                color: "#063c32",
              }}
            >
              Your Basket
            </h1>

            {items.length > 0 && (
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: "13px",
                  color: "#62746a",
                }}
              >
                {itemCount} {itemCount === 1 ? "item" : "items"} ready
                for checkout
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#ecfdf5",
                color: "#16835b",
                border: "1px solid #c4e8d3",
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={15} />
              Secure checkout
            </div>
          )}
        </div>

        {/* Empty Cart */}
        {items.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e1e8e2",
              borderRadius: "20px",
              padding: "60px 24px",
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(6,60,50,0.04)",
            }}
          >
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: "#e9f6ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <ShoppingBag size={34} color="#16835b" />
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "20px",
                color: "#063c32",
              }}
            >
              Your basket is empty
            </h2>

            <p
              style={{
                margin: "0 auto 20px",
                maxWidth: "420px",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "#62746a",
              }}
            >
              Fresh vegetables are waiting for you. Add your favourites
              and continue to checkout.
            </p>

            <Link
              href="/customer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "11px 22px",
                borderRadius: "10px",
                background: "#16835b",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              <ShoppingBag size={16} />
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 340px",
                gap: "24px",
                alignItems: "start",
              }}
              className="improved-cart-layout"
            >
              {/* Cart Items */}
              <section>
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e1e8e2",
                    borderRadius: "18px",
                    padding: "18px",
                    boxShadow: "0 3px 12px rgba(6,60,50,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#063c32",
                      }}
                    >
                      Basket Items
                    </h2>

                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "#62746a",
                        fontWeight: 600,
                      }}
                    >
                      {items.length} products
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {items.map((item) => (
                      <div
                        className="improved-cart-item"
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "14px",
                          borderRadius: "14px",
                          background: "#fafcf9",
                          border: "1px solid #edf2ee",
                        }}
                      >
                        {/* Product Art */}
                        <div
                          style={{
                            width: "68px",
                            height: "68px",
                            flexShrink: 0,
                            borderRadius: "12px",
                            background: "#e9f6ee",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "34px",
                          }}
                        >
                          🥕
                        </div>

                        {/* Product Info */}
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "#063c32",
                              marginBottom: "4px",
                            }}
                          >
                            {item.product_name}
                          </strong>

                          <span
                            style={{
                              display: "block",
                              fontSize: "11.5px",
                              color: "#62746a",
                              marginBottom: "4px",
                            }}
                          >
                            {item.unit} · ₹
                            {Number(item.price_per_unit).toFixed(2)} each
                          </span>

                          <span
                            style={{
                              fontSize: "12px",
                              color: "#16835b",
                              fontWeight: 700,
                            }}
                          >
                            ₹
                            {(
                              Number(item.price_per_unit) *
                              Number(item.quantity)
                            ).toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                id: item.id,
                                quantity: item.quantity - 1,
                              })
                            }
                            aria-label={`Decrease ${item.product_name}`}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid #d8e5dc",
                              background: "#ffffff",
                              color: "#063c32",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: mutation.isPending
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            <Minus size={15} />
                          </button>

                          <span
                            style={{
                              minWidth: "24px",
                              textAlign: "center",
                              fontSize: "13px",
                              fontWeight: 800,
                              color: "#063c32",
                            }}
                          >
                            {item.quantity}
                          </span>

                          <button
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                id: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            aria-label={`Increase ${item.product_name}`}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid #c4e8d3",
                              background: "#e9f6ee",
                              color: "#16835b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: mutation.isPending
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            <Plus size={15} />
                          </button>

                          <button
                            disabled={mutation.isPending}
                            className="remove"
                            onClick={() =>
                              mutation.mutate({
                                id: item.id,
                                quantity: 0,
                              })
                            }
                            aria-label={`Remove ${item.product_name}`}
                            title="Remove item"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "8px",
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: mutation.isPending
                                ? "not-allowed"
                                : "pointer",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {mutation.isError && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "10px 12px",
                        borderRadius: "9px",
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#be123c",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {getErrorMessage(mutation.error)}
                    </div>
                  )}
                </div>

                {/* Delivery Information */}
                <div
                  style={{
                    marginTop: "14px",
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e1e8e2",
                      borderRadius: "14px",
                      padding: "14px",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <Truck size={19} color="#16835b" />

                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "#063c32",
                        }}
                      >
                        Farm delivery
                      </strong>

                      <span
                        style={{
                          fontSize: "11px",
                          color: "#62746a",
                        }}
                      >
                        Fresh vegetables to your door
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e1e8e2",
                      borderRadius: "14px",
                      padding: "14px",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <ShieldCheck size={19} color="#16835b" />

                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "#063c32",
                        }}
                      >
                        Secure ordering
                      </strong>

                      <span
                        style={{
                          fontSize: "11px",
                          color: "#62746a",
                        }}
                      >
                        Review everything before placing
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Order Summary */}
              <aside
                style={{
                  background: "#ffffff",
                  border: "1px solid #d8e5dc",
                  borderRadius: "18px",
                  padding: "20px",
                  boxShadow: "0 5px 18px rgba(6,60,50,0.06)",
                  position: "sticky",
                  top: "20px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 18px",
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "#063c32",
                  }}
                >
                  Order Summary
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "11px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid #edf2ee",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      fontSize: "13px",
                      color: "#62746a",
                    }}
                  >
                    <span>Subtotal</span>
                    <strong style={{ color: "#063c32" }}>
                      ₹{Number(data.subtotal).toFixed(2)}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      fontSize: "13px",
                      color: "#62746a",
                    }}
                  >
                    <span>Delivery</span>
                    <strong style={{ color: "#063c32" }}>
                      ₹{Number(data.delivery_charge).toFixed(2)}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      fontSize: "13px",
                      color: "#62746a",
                    }}
                  >
                    <span>Discount</span>
                    <strong style={{ color: "#16835b" }}>
                      −₹{Number(data.discount_amount).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    padding: "16px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#063c32",
                    }}
                  >
                    Total
                  </span>

                  <strong
                    style={{
                      fontSize: "22px",
                      fontWeight: 900,
                      color: "#063c32",
                    }}
                  >
                    ₹{Number(data.total_amount).toFixed(2)}
                  </strong>
                </div>

                {Number(data.total_amount) >= 199 && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "9px 11px",
                      borderRadius: "9px",
                      background: "#ecfdf5",
                      color: "#16835b",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    🎉 You qualify for free farm delivery!
                  </div>
                )}

                <Link
                  href="/customer/checkout"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "#16835b",
                    color: "#ffffff",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    textDecoration: "none",
                    boxShadow: "0 3px 10px rgba(22,131,91,0.2)",
                  }}
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/customer"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "9px",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    background: "#f4f7f3",
                    color: "#063c32",
                    border: "1px solid #d8e5dc",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Continue Shopping
                </Link>

                <p
                  style={{
                    margin: "14px 0 0",
                    textAlign: "center",
                    fontSize: "10.5px",
                    lineHeight: 1.5,
                    color: "#8b9c92",
                  }}
                >
                  You can review your delivery address and order details
                  before placing the order.
                </p>
              </aside>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.55;
          }
        }

        @media (max-width: 850px) {
          .improved-cart-layout {
            grid-template-columns: 1fr !important;
          }

          .improved-cart-layout aside {
            position: static !important;
          }
        }

        @media (max-width: 600px) {
          .improved-cart-item {
            align-items: flex-start !important;
            flex-wrap: wrap;
          }

          .improved-cart-item > div:last-child {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </main>
  );
}