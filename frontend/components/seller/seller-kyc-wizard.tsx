"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Camera,
  FileText,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  X,
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-stone-500">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Seller Shop Proof & KYC Verification
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Required for the Vegito Verified Seller badge and active delivery dispatch
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Current Status Pill */}
      {currentKyc && (
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 dark:bg-stone-800/50 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Current KYC Status:</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                currentKyc.status === "VERIFIED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                  : currentKyc.status === "UNDER_REVIEW" || currentKyc.status === "SUBMITTED"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                  : currentKyc.status === "REUPLOAD_REQUIRED"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                  : "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-300"
              }`}
            >
              {currentKyc.status.replace("_", " ")}
            </span>
          </div>

          {currentKyc.reupload_notes && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              ⚠️ Note: {currentKyc.reupload_notes}
            </p>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { num: 1, label: "Business Type", icon: Building2 },
          { num: 2, label: "Shop Photos", icon: Camera },
          { num: 3, label: "Identity & Selfie", icon: UserCheck },
          { num: 4, label: "Bank & Review", icon: CreditCard },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
              step === s.num
                ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold"
                : "border-stone-200 text-stone-500 dark:border-stone-800 dark:text-stone-400 font-medium"
            }`}
          >
            <s.icon className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: Business Details & Shop Proof */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Select Business Operating Model
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
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
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Shop / Business Proof Document Type
            </label>
            <select
              value={proofType}
              onChange={(e) => setProofType(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
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
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Registration / Certificate Number
            </label>
            <input
              type="text"
              value={proofNumber}
              onChange={(e) => setProofNumber(e.target.value)}
              placeholder="e.g. MH/SOL/123456 or GSTIN"
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Upload Business Proof Document (PDF, JPG, PNG)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Upload className="h-4 w-4" />
                <span>{uploadingField === "proofFile" ? "Uploading..." : "Choose File"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.webp"
                  onChange={(e) => handleFileUpload(e, "proofFile", "business_proof")}
                  className="hidden"
                />
              </label>
              {proofFile && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Document uploaded securely
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Shop Photographs */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-stone-500">
            Real photos of your physical storefront and storage area are required for operational verification.
          </p>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Shop Front Photo (Required)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Camera className="h-4 w-4" />
                <span>{uploadingField === "shopFrontPhoto" ? "Uploading..." : "Upload Front Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "shopFrontPhoto", "shop_front")}
                  className="hidden"
                />
              </label>
              {shopFrontPhoto && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Store / Storage Interior Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Camera className="h-4 w-4" />
                <span>{uploadingField === "shopInteriorPhoto" ? "Uploading..." : "Upload Interior Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "shopInteriorPhoto", "shop_interior")}
                  className="hidden"
                />
              </label>
              {shopInteriorPhoto && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Shop Signage / Board Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Camera className="h-4 w-4" />
                <span>{uploadingField === "shopSignagePhoto" ? "Uploading..." : "Upload Signage Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "shopSignagePhoto", "shop_signage")}
                  className="hidden"
                />
              </label>
              {shopSignagePhoto && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Identity & Liveness */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Owner Identity Document Type
            </label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              <option value="PAN">PAN Card</option>
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="DRIVING_LICENSE">Driving Licence</option>
              <option value="VOTER_ID">Voter ID</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              ID Document Number
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. ABCDE1234F or XXXX-XXXX-1234"
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Upload Identity Document
            </label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Upload className="h-4 w-4" />
                <span>{uploadingField === "idFile" ? "Uploading..." : "Upload ID File"}</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, "idFile", "identity_proof")}
                  className="hidden"
                />
              </label>
              {idFile && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> ID Uploaded
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Seller Live Selfie / Liveness Photo (Section 12)
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
              Prove that a real person is managing this shop account. Document status remains PENDING_VERIFICATION until confirmed.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Camera className="h-4 w-4" />
                <span>{uploadingField === "selfieFile" ? "Uploading..." : "Take / Upload Selfie"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleFileUpload(e, "selfieFile", "selfie")}
                  className="hidden"
                />
              </label>
              {selfieFile && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Selfie Uploaded
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Bank Details & Submission */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Bank Account Holder Name
            </label>
            <input
              type="text"
              value={bankHolder}
              onChange={(e) => setBankHolder(e.target.value)}
              placeholder="e.g. Ramesh Agro Mandi"
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="10–18 digit account number"
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Payout UPI ID (Optional)
            </label>
            <input
              type="text"
              value={bankUpi}
              onChange={(e) => setBankUpi(e.target.value)}
              placeholder="e.g. ramesh@okaxis"
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/20">
            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              Admin Review Acknowledgement
            </h4>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              By submitting, your documents will be submitted to the Vegito Operations Admin team for review. Your shop will receive the verified badge upon approval. Sensitive document numbers and images are stored in protected private storage.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-800">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-emerald-600 dark:hover:text-white"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitAll}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting for Review...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Submit for Verification</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
