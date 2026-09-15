"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { getProducts } from "@/lib/api/products";
import { ProductCard } from "@/components/product/product-card";
export default function SearchPage() { const [term,setTerm]=useState(""); const query=useQuery({queryKey:["products","search",term],queryFn:()=>getProducts({search:term,pageSize:30}),enabled:term.trim().length>=2}); return <main className="simple-page"><h1>Search the market</h1><label className="search-field"><Search size={20}/><input autoFocus value={term} onChange={e=>setTerm(e.target.value)} placeholder="Try tomato, spinach, banana..."/>{term&&<button onClick={()=>setTerm("")} aria-label="Clear"><X size={18}/></button>}</label>{term.length<2?<p className="helper">Type at least 2 characters to search current Vegito listings.</p>:query.isLoading?<p className="helper">Looking in today’s market…</p>:query.isError?<p className="inline-message">Search is unavailable right now.</p>:query.data?.items.length?<div className="product-grid results-grid">{query.data.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-inline"><b>No vegetables matched “{term}”.</b><span>Try a broader search.</span></div>}</main>; }
