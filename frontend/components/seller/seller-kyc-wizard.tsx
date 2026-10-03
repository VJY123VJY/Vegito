"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Camera,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  X,
  FileCheck,
} from "lucide-react";
import {
  getSellerKyc,
  submitSellerKyc,
  uploadKycDocument,
  type SellerKycData,
  type SellerKycPayload,
} from "@/lib/api/kyc";

interface SellerKycWizardProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function SellerKycWizard({ onClose, onSuccess }: SellerKycWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentKyc, setCurrentKyc] = useState<SellerKycData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [businessType, setBusinessType] = useState<string>("RETAIL_STORE");
  const [proofType, setProofType] = useState<string>("SHOP_ESTABLISHMENT_LICENSE");
  const [proofNumber, setProofNumber] = useState<string>("");
  const [proofFile, setProofFile] = useState<string>("");

  const [shopFrontPhoto, setShopFrontPhoto] = useState<string>("");
  const [shopInteriorPhoto, setShopInteriorPhoto] = useState<string>("");
  const [shopSignagePhoto, setShopSignagePhoto] = useState<string>("");

  const [idType, setIdType] = useState<string>("PAN");
  const [idNumber, setIdNumber] = useState<string>("");
  const [idFile, setIdFile] = useState<string>("");

  const [selfieFile, setSelfieFile] = useState<string>("");

  const [bankHolder, setBankHolder] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankIfsc, setBankIfsc] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [bankUpi, setBankUpi] = useState<string>("");

  // Uploading state
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    getSellerKyc()
      .then((data) => {
        setCurrentKyc(data);
        if (data) {
          if (data.business_type) setBusinessType(data.business_type);
          if (data.business_proof_type) setProofType(data.business_proof_type);
          if (data.business_proof_number) setProofNumber(data.business_proof_number);
          if (data.business_proof_file) setProofFile(data.business_proof_file);
          if (data.shop_front_photo) setShopFrontPhoto(data.shop_front_photo);
          if (data.shop_interior_photo) setShopInteriorPhoto(data.shop_interior_photo);
          if (data.shop_signage_photo) setShopSignagePhoto(data.shop_signage_photo);
          if (data.id_proof_type) setIdType(data.id_proof_type);
          if (data.id_proof_file) setIdFile(data.id_proof_file);
          if (data.selfie_file) setSelfieFile(data.selfie_file);
          if (data.bank_account_holder) setBankHolder(data.bank_account_holder);
          if (data.bank_ifsc) setBankIfsc(data.bank_ifsc);
          if (data.bank_name) setBankName(data.bank_name);
          if (data.bank_upi_id) setBankUpi(data.bank_upi_id);
        }
      })
      .catch((err) => {
        console.error("Could not fetch seller KYC", err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingField(fieldName);
      setErrorMsg(null);
      const res = await uploadKycDocument(file, docType);
      const key = res.document_key;

      if (fieldName === "proofFile") setProofFile(key);
      else if (fieldName === "shopFrontPhoto") setShopFrontPhoto(key);
      else if (fieldName === "shopInteriorPhoto") setShopInteriorPhoto(key);
      else if (fieldName === "shopSignagePhoto") setShopSignagePhoto(key);
      else if (fieldName === "idFile") setIdFile(key);
      else if (fieldName === "selfieFile") setSelfieFile(key);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload document");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitAll = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: SellerKycPayload = {
      business_type: businessType,
      business_proof_type: proofType,
      business_proof_number: proofNumber,
      business_proof_file: proofFile,
      shop_front_photo: shopFrontPhoto,
      shop_interior_photo: shopInteriorPhoto,
      shop_signage_photo: shopSignagePhoto,
      id_proof_type: idType,
      id_proof_number: idNumber,
      id_proof_file: idFile,
      selfie_file: selfieFile,
      bank_account_holder: bankHolder,
      bank_account_number: bankAccount,
      bank_ifsc: bankIfsc,
      bank_name: bankName,
      bank_upi_id: bankUpi,
    };

    try {
      const res = await submitSellerKyc(payload);
      setCurrentKyc(res);
      setSuccessMsg("Shop verification documents submitted successfully! Admin review is in progress.");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit KYC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Business Type", icon: Building2 },
    { num: 2, label: "Shop Photos", icon: Camera },
    { num: 3, label: "Identity & Selfie", icon: UserCheck },
    { num: 4, label: "Bank & Review", icon: CreditCard },
  ];

  if (isLoading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(6, 60, 50, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "12px", color: "#063c32", fontWeight: 700 }}>
          <Loader2 className="animate-spin" size={24} color="#16835b" />
          <span>Loading KYC Details...</span>
        </div>
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#063c32",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "12px",
    border: "1.5px solid #d8e5dc",
    fontSize: "13.5px",
    color: "#1e293b",
    backgroundColor: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const uploadBoxStyle: React.CSSProperties = {
    border: "2px dashed #bbf7d0",
    backgroundColor: "#f9fcf9",
    borderRadius: "14px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 60, 50, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(6, 60, 50, 0.25)",
          border: "1px solid #e1e8e2",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #eef3ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fcfdfc",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#063c32" }}>
                Seller Shop Proof & KYC Verification
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#62746a" }}>
                Required for the Vegito Verified Seller badge and active delivery dispatch
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "10px",
                color: "#62746a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Current Status Banner */}
          {currentKyc && (
            <div
              style={{
                padding: "12px 18px",
                borderRadius: "14px",
                backgroundColor:
                  currentKyc.status === "VERIFIED"
                    ? "#f0fdf4"
                    : currentKyc.status === "UNDER_REVIEW" || currentKyc.status === "SUBMITTED"
                    ? "#eff6ff"
                    : currentKyc.status === "REUPLOAD_REQUIRED"
                    ? "#fff7ed"
                    : "#f8fafc",
                border:
                  currentKyc.status === "VERIFIED"
                    ? "1px solid #bbf7d0"
                    : currentKyc.status === "UNDER_REVIEW" || currentKyc.status === "SUBMITTED"
                    ? "1px solid #bfdbfe"
                    : currentKyc.status === "REUPLOAD_REQUIRED"
                    ? "1px solid #fed7aa"
                    : "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Status:</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    backgroundColor:
                      currentKyc.status === "VERIFIED"
                        ? "#dcfce7"
                        : currentKyc.status === "UNDER_REVIEW" || currentKyc.status === "SUBMITTED"
                        ? "#dbeafe"
                        : currentKyc.status === "REUPLOAD_REQUIRED"
                        ? "#ffedd5"
                        : "#f1f5f9",
                    color:
                      currentKyc.status === "VERIFIED"
                        ? "#15803d"
                        : currentKyc.status === "UNDER_REVIEW" || currentKyc.status === "SUBMITTED"
                        ? "#1d4ed8"
                        : currentKyc.status === "REUPLOAD_REQUIRED"
                        ? "#c2410c"
                        : "#334155",
                  }}
                >
                  {currentKyc.status.replace("_", " ")}
                </span>
              </div>
              {currentKyc.reupload_notes && (
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#c2410c" }}>
                  ⚠️ Note: {currentKyc.reupload_notes}
                </span>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: "#fef2f2",
                border: "1.5px solid #fecaca",
                color: "#dc2626",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                backgroundColor: "#f0fdf4",
                border: "1.5px solid #bbf7d0",
                color: "#15803d",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step Indicator Pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "8px",
            }}
          >
            {stepsList.map((s) => {
              const isActive = step === s.num;
              const IconComp = s.icon;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: isActive ? "2px solid #063c32" : "1px solid #e1e8e2",
                    backgroundColor: isActive ? "#063c32" : "#fbfdfc",
                    color: isActive ? "#ffffff" : "#475569",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease-in-out",
                    boxShadow: isActive ? "0 4px 12px rgba(6, 60, 50, 0.15)" : "none",
                  }}
                >
                  <IconComp size={16} color={isActive ? "#34d399" : "#64748b"} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* STEP 1: Business Details & Shop Proof */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Select Business Operating Model</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="RETAIL_STORE">Retail Vegetable / Fruit Stall</option>
                  <option value="WHOLESALE_MANDI">Wholesale APMC Mandi Trader</option>
                  <option value="FARMER_PRODUCER">Direct Farmer / Farmer Producer (FPO)</option>
                  <option value="ORGANIC_FARM">Certified Organic Grower</option>
                  <option value="HOME_KITCHEN">Home Kitchen / Local Micro Enterprise</option>
                  <option value="OTHER">Other Local Commerce Business</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Shop / Business Proof Document Type</label>
                <select
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="SHOP_ESTABLISHMENT_LICENSE">Shop & Establishment (Gumasta) License</option>
                  <option value="APMC_MANDI_LICENSE">APMC Mandi License / Stall Slip</option>
                  <option value="GST_CERTIFICATE">GST Registration Certificate (Where applicable)</option>
                  <option value="TRADE_LICENSE">Municipal Trade License</option>
                  <option value="ELECTRICITY_BILL_PREMISES">Premises Electricity Bill / Utility Proof</option>
                  <option value="RENT_AGREEMENT">Commercial Rent / Lease Agreement</option>
                  <option value="BUSINESS_ADDRESS_PROOF">Business Address Proof</option>
                  <option value="OTHER">Other Admin-Approved Document</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Registration / Certificate Number</label>
                <input
                  type="text"
                  value={proofNumber}
                  onChange={(e) => setProofNumber(e.target.value)}
                  placeholder="e.g. MH/SOL/123456 or GSTIN"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Upload Business Proof Document (PDF, JPG, PNG)</label>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    <Upload size={16} />
                    <span>{uploadingField === "proofFile" ? "Uploading..." : "Choose File"}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.webp"
                      onChange={(e) => handleFileUpload(e, "proofFile", "business_proof")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {proofFile ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> Document uploaded securely
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>PDF, JPG, or PNG up to 10MB</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Shop Photographs */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "12.5px", color: "#166534" }}>
                📸 Real photos of your physical storefront and produce storage ensure customer trust and verify delivery dispatch readiness.
              </div>

              <div>
                <label style={labelStyle}>Shop Front Photo (Required)</label>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={16} />
                    <span>{uploadingField === "shopFrontPhoto" ? "Uploading..." : "Upload Front Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "shopFrontPhoto", "shop_front")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {shopFrontPhoto ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> Front Photo Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Clear storefront view with shop entrance</span>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Store / Storage Interior Photo (Optional)</label>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#f4f7f3",
                      border: "1px solid #d8e5dc",
                      color: "#063c32",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={16} />
                    <span>{uploadingField === "shopInteriorPhoto" ? "Uploading..." : "Upload Interior Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "shopInteriorPhoto", "shop_interior")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {shopInteriorPhoto ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> Interior Photo Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Vegetable racks, weighing scales, or storage area</span>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Shop Signage / Board Photo (Optional)</label>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#f4f7f3",
                      border: "1px solid #d8e5dc",
                      color: "#063c32",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={16} />
                    <span>{uploadingField === "shopSignagePhoto" ? "Uploading..." : "Upload Signage Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "shopSignagePhoto", "shop_signage")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {shopSignagePhoto ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> Signage Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Shop name board or banner photo</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Identity & Liveness */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Owner Identity Document Type</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="PAN">PAN Card</option>
                  <option value="AADHAAR">Aadhaar Card</option>
                  <option value="DRIVING_LICENSE">Driving Licence</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>ID Document Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. ABCDE1234F or 12-digit Aadhaar"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Upload Identity Document</label>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#16835b",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={16} />
                    <span>{uploadingField === "idFile" ? "Uploading..." : "Upload ID File"}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileUpload(e, "idFile", "identity_proof")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {idFile ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> ID Document Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Clear front & back image or PDF</span>
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Seller Live Selfie / Liveness Photo</label>
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#64748b" }}>
                  Proves that a real person manages this shop account. Handled with strict data privacy.
                </p>
                <div style={uploadBoxStyle}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      backgroundColor: "#063c32",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={16} />
                    <span>{uploadingField === "selfieFile" ? "Uploading..." : "Take / Upload Selfie"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => handleFileUpload(e, "selfieFile", "selfie")}
                      style={{ display: "none" }}
                    />
                  </label>
                  {selfieFile ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 700, color: "#16835b" }}>
                      <CheckCircle2 size={16} /> Selfie Uploaded
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Hold camera in front of your face in good light</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Bank Details & Submission */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Bank Account Holder Name</label>
                <input
                  type="text"
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="e.g. Ramesh Agro Mandi"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Bank Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="9–18 digit account number"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Payout UPI ID (Optional)</label>
                <input
                  type="text"
                  value={bankUpi}
                  onChange={(e) => setBankUpi(e.target.value)}
                  placeholder="e.g. shopname@okaxis"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  padding: "16px",
                  borderRadius: "14px",
                  backgroundColor: "#e9f6ee",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <FileCheck size={18} color="#16835b" />
                  <strong style={{ fontSize: "13px", color: "#063c32" }}>
                    Admin Review Acknowledgement
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#166534", lineHeight: 1.5 }}>
                  By submitting, your documents will be securely transferred to the Vegito Operations team for review. Your shop will receive the verified badge upon approval, enabling instant customer trust and uninterrupted delivery dispatches.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div
          style={{
            padding: "18px 24px",
            borderTop: "1px solid #eef3ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fcfdfc",
            borderBottomLeftRadius: "24px",
            borderBottomRightRadius: "24px",
          }}
        >
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              borderRadius: "12px",
              border: "1px solid #d8e5dc",
              backgroundColor: "#ffffff",
              color: step === 1 ? "#94a3b8" : "#063c32",
              fontSize: "13px",
              fontWeight: 700,
              cursor: step === 1 ? "not-allowed" : "pointer",
            }}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 22px",
                borderRadius: "12px",
                backgroundColor: "#063c32",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(6, 60, 50, 0.2)",
              }}
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 24px",
                borderRadius: "12px",
                backgroundColor: "#16835b",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(22, 131, 91, 0.25)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Submitting for Review...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
