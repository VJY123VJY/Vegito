"use client";
import Link from "next/link";
import { House, Search, ShoppingBasket, Package, UserRound } from "lucide-react";
const items = [[House, "Home", "/customer"], [Search, "Explore", "/search"], [ShoppingBasket, "Basket", "/customer/cart"], [Package, "Orders", "/customer/orders"], [UserRound, "Account", "/customer/profile"]] as const;
export function BottomNavigation({ basketCount }: { basketCount: number }) { return <nav className="bottom-nav" aria-label="Main navigation">{items.map(([Icon, label, href], index) => <Link href={href} key={label} className={index === 0 ? "active" : ""}><span className="nav-icon"><Icon size={21} />{label === "Basket" && basketCount > 0 ? <em>{basketCount}</em> : null}</span><small>{label}</small></Link>)}</nav>; }
