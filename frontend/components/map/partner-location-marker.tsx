/**
 * partner-location-marker.tsx
 * DOM marker factory functions for Mapbox GL JS map markers.
 */

export function createDeliveryMarkerElement(partnerName?: string): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "vegito-partner-marker";
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    user-select: none;
  `;

  // Pulse wrapper
  const pin = document.createElement("div");
  pin.style.cssText = `
    width: 44px;
    height: 44px;
    background: #063c32;
    border: 3px solid #16835b;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(6, 60, 50, 0.4);
    position: relative;
  `;

  const emoji = document.createElement("div");
  emoji.style.cssText = "transform: rotate(45deg); font-size: 20px; margin-top: -2px;";
  emoji.textContent = "🛵";
  pin.appendChild(emoji);

  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position: absolute;
    inset: -8px;
    border: 2.5px solid rgba(22, 131, 91, 0.6);
    border-radius: 50%;
    animation: vegito-marker-pulse 2s infinite;
  `;
  pin.appendChild(pulse);
  container.appendChild(pin);

  if (partnerName) {
    const label = document.createElement("div");
    label.style.cssText = `
      background: #ffffff;
      color: #063c32;
      border: 1px solid #e1e8e2;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      white-space: nowrap;
    `;
    label.textContent = partnerName;
    container.appendChild(label);
  }

  // Inject keyframe animation once
  if (!document.getElementById("vegito-pulse-style")) {
    const style = document.createElement("style");
    style.id = "vegito-pulse-style";
    style.textContent = `
      @keyframes vegito-marker-pulse {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.7); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  return container;
}

export function createCustomerMarkerElement(customerName?: string): HTMLDivElement {
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  `;

  const pin = document.createElement("div");
  pin.style.cssText = `
    width: 38px;
    height: 38px;
    background: #dc2626;
    border: 3px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
  `;

  const emoji = document.createElement("div");
  emoji.style.cssText = "transform: rotate(45deg); font-size: 16px;";
  emoji.textContent = "🏠";
  pin.appendChild(emoji);
  container.appendChild(pin);

  if (customerName) {
    const label = document.createElement("div");
    label.style.cssText = `
      background: #ffffff;
      color: #991b1b;
      border: 1px solid #fee2e2;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      white-space: nowrap;
    `;
    label.textContent = customerName;
    container.appendChild(label);
  }

  return container;
}

export function createShopMarkerElement(shopName?: string): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "vegito-shop-marker";
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    user-select: none;
  `;

  const pin = document.createElement("div");
  pin.style.cssText = `
    width: 40px;
    height: 40px;
    background: #047857;
    border: 3px solid #ffffff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(4, 120, 87, 0.4);
  `;

  const emoji = document.createElement("div");
  emoji.style.cssText = "transform: rotate(45deg); font-size: 18px;";
  emoji.textContent = "🏪";
  pin.appendChild(emoji);
  container.appendChild(pin);

  if (shopName) {
    const label = document.createElement("div");
    label.style.cssText = `
      background: #ffffff;
      color: #065f46;
      border: 1px solid #d1fae5;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      white-space: nowrap;
    `;
    label.textContent = shopName;
    container.appendChild(label);
  }

  return container;
}
