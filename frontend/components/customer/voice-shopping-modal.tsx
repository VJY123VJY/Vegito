"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Plus, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import type { ApiProduct } from "@/lib/api/products";
import { addCartItem } from "@/lib/api/cart";
import { useQueryClient } from "@tanstack/react-query";
import { isLoggedIn } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

interface VoiceShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ApiProduct[];
  onSuccess?: (msg: string) => void;
}

export function VoiceShoppingModal({
  isOpen,
  onClose,
  products,
  onSuccess,
}: VoiceShoppingModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore */ }
      }
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Voice recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (India) with support for Hindi/Marathi loanwords

      recognition.onstart = () => {
        setListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone access was denied. Please allow microphone permissions.");
        } else {
          setErrorMsg(`Voice input: ${event.error}`);
        }
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setErrorMsg("Failed to start voice listener.");
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore */ }
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Match recognized words with existing backend catalog
  const matchedProducts = products.filter((p) => {
    if (!transcript) return false;
    const lower = transcript.toLowerCase();
    const nameMatch = lower.includes(p.name.toLowerCase());
    return nameMatch && p.is_in_stock && p.seller_products?.length > 0;
  });

  const handleAddItems = async () => {
    if (!isLoggedIn()) {
      router.push("/auth/login");
      return;
    }
    for (const p of matchedProducts) {
      const sellerProd = p.seller_products?.[0];
      if (sellerProd?.seller_product_id) {
        await addCartItem(sellerProd.seller_product_id, 1).catch(() => {});
      }
    }
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    onSuccess?.(`Added ${matchedProducts.length} voice-recognized items to your basket!`);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 40, 32, 0.7)",
          backdropFilter: "blur(6px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "440px",
          padding: "26px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          border: "1px solid #dce8df",
          textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#f1f5f2",
            color: "#62746a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#16835b", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", marginBottom: "6px" }}>
            <Sparkles size={14} />
            <span>Voice Grocery Shopping</span>
          </div>
          <h3 style={{ margin: "0 0 4px", fontSize: "19px", fontWeight: 800, color: "#063c32" }}>
            Tell Vegito What You Need
          </h3>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#62746a" }}>
            Speak naturally: &ldquo;Tomato, onion, potato and fresh spinach&rdquo;
          </p>
        </div>

        {/* Pulsing Mic Button */}
        <div style={{ margin: "24px 0" }}>
          <button
            onClick={() => {
              if (listening) {
                recognitionRef.current?.stop();
              } else {
                recognitionRef.current?.start();
              }
            }}
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              backgroundColor: listening ? "#16835b" : "#f1f5f2",
              color: listening ? "#ffffff" : "#62746a",
              border: listening ? "4px solid #a7f3d0" : "2px solid #dce8df",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: listening ? "0 0 30px rgba(22, 131, 91, 0.45)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {listening ? <Mic size={32} /> : <MicOff size={32} />}
          </button>
          <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 700, color: listening ? "#16835b" : "#64748b" }}>
            {listening ? "Listening to your voice..." : "Click microphone to start speaking"}
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "12px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Transcribed speech output */}
        {transcript && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              backgroundColor: "#f4f8f5",
              border: "1px solid #dce8df",
              fontSize: "14px",
              fontWeight: 600,
              color: "#063c32",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#16835b", display: "block", textTransform: "uppercase" }}>
              Recognized:
            </span>
            &ldquo;{transcript}&rdquo;
          </div>
        )}

        {/* Matched backend items */}
        {matchedProducts.length > 0 && (
          <div style={{ marginBottom: "16px", textAlign: "left" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#62746a", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Matching Available Mandi Produce ({matchedProducts.length}):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {matchedProducts.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "10px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#065f46",
                  }}
                >
                  ✓ {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {matchedProducts.length > 0 && (
          <button
            onClick={handleAddItems}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "14px",
              backgroundColor: "#063c32",
              color: "#ffffff",
              border: "none",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(6, 60, 50, 0.2)",
            }}
          >
            <Plus size={16} />
            <span>Add Available Items ({matchedProducts.length})</span>
          </button>
        )}

        {/* Clear architecture disclaimer */}
        <p style={{ margin: "14px 0 0", fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
          ℹ️ Voice transcribed locally via browser Speech API. Advanced semantic NLP and automatic weight parsing requires additional backend/AI integration.
        </p>
      </div>
    </div>
  );
}
