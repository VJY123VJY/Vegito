"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  User,
  Phone,
  Camera,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  X,
  Truck,
  MapPin,
  HeartHandshake,
} from "lucide-react";
import {
  getDeliveryKyc,
  submitDeliveryKyc,
  uploadKycDocument,
  type DeliveryPartnerKycData,
  type DeliveryPartnerKycPayload,
} from "@/lib/api/kyc";

interface DeliveryKycWizardProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function DeliveryKycWizard({ onClose, onSuccess }: DeliveryKycWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentKyc, setCurrentKyc] = useState<DeliveryPartnerKycData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [emergencyName, setEmergencyName] = useState<string>("");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");

  const [selfieFile, setSelfieFile] = useState<string>("");
  const [profilePhoto, setProfilePhoto] = useState<string>("");

  const [idType, setIdType] = useState<string>("AADHAAR");
  const [idNumber, setIdNumber] = useState<string>("");
  const [idFile, setIdFile] = useState<string>("");

  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [licenseExpiry, setLicenseExpiry] = useState<string>("");
  const [licenseFile, setLicenseFile] = useState<string>("");

  const [vehicleType, setVehicleType] = useState<string>("MOTORCYCLE");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [rcFile, setRcFile] = useState<string>("");
  const [insuranceFile, setInsuranceFile] = useState<string>("");

  const [operatingCity, setOperatingCity] = useState<string>("Solapur");
  const [operatingZone, setOperatingZone] = useState<string>("Central Mandi");

  const [bankHolder, setBankHolder] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankIfsc, setBankIfsc] = useState<string>("");
  const [bankUpi, setBankUpi] = useState<string>("");

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    getDeliveryKyc()
      .then((data) => {
        setCurrentKyc(data);
        if (data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.dob) setDob(data.dob);
          if (data.emergency_contact_name) setEmergencyName(data.emergency_contact_name);
          if (data.emergency_contact_phone) setEmergencyPhone(data.emergency_contact_phone);
          if (data.selfie_file) setSelfieFile(data.selfie_file);
          if (data.profile_photo) setProfilePhoto(data.profile_photo);
          if (data.id_proof_type) setIdType(data.id_proof_type);
          if (data.id_proof_file) setIdFile(data.id_proof_file);
          if (data.driving_license_number) setLicenseNumber(data.driving_license_number);
          if (data.driving_license_expiry) setLicenseExpiry(data.driving_license_expiry);
          if (data.driving_license_file) setLicenseFile(data.driving_license_file);
          if (data.vehicle_type) setVehicleType(data.vehicle_type);
          if (data.vehicle_number) setVehicleNumber(data.vehicle_number);
          if (data.rc_book_file) setRcFile(data.rc_book_file);
          if (data.insurance_file) setInsuranceFile(data.insurance_file);
          if (data.operating_city) setOperatingCity(data.operating_city);
          if (data.operating_zone) setOperatingZone(data.operating_zone);
          if (data.bank_account_holder) setBankHolder(data.bank_account_holder);
          if (data.bank_ifsc) setBankIfsc(data.bank_ifsc);
          if (data.bank_upi_id) setBankUpi(data.bank_upi_id);
        }
      })
      .catch((err) => console.warn("Failed to load delivery KYC:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fieldKey);
    setErrorMsg(null);
    try {
      const res = await uploadKycDocument(file, fieldKey);
      setter(res.document_key || res.url);
    } catch (err: any) {
      setErrorMsg(`Failed to upload ${fieldKey}: ${err.message || "File upload error"}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: DeliveryPartnerKycPayload = {
      full_name: fullName.trim() || undefined,
      dob: dob.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      profile_photo: profilePhoto || undefined,
      selfie_file: selfieFile || undefined,
      id_proof_type: idType,
      id_proof_number: idNumber.trim() || undefined,
      id_proof_file: idFile || undefined,
      driving_license_number: licenseNumber.trim() || undefined,
      driving_license_expiry: licenseExpiry.trim() || undefined,
      driving_license_file: licenseFile || undefined,
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber.trim() || undefined,
      rc_book_file: rcFile || undefined,
      insurance_file: insuranceFile || undefined,
      operating_city: operatingCity.trim() || "Solapur",
      operating_zone: operatingZone.trim() || "Central Mandi",
      bank_account_holder: bankHolder.trim() || undefined,
      bank_account_number: bankAccount.trim() || undefined,
      bank_ifsc: bankIfsc.trim() || undefined,
      bank_upi_id: bankUpi.trim() || undefined,
    };

    try {
      const updated = await submitDeliveryKyc(payload);
      setCurrentKyc(updated);
      setSuccessMsg("Delivery Partner KYC submitted successfully! Our verification team will review your credentials within 24-48 hours.");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || "Failed to submit KYC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Personal Details" },
    { num: 2, label: "Live Selfie" },
    { num: 3, label: "ID Verification" },
    { num: 4, label: "Driving License" },
    { num: 5, label: "Vehicle & RC" },
    { num: 6, label: "Operating Area" },
    { num: 7, label: "Payout Bank / UPI" },
    { num: 8, label: "Review & Submit" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
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
          borderRadius: "20px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Delivery Partner Verification (KYC)
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Solapur Vegito Delivery Fleet · Secure Document Check
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Status banner if already submitted */}
        {currentKyc && currentKyc.status !== "DRAFT" && currentKyc.status !== "PENDING_DOCUMENTS" && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor:
                currentKyc.status === "VERIFIED"
                  ? "#ecfdf5"
                  : currentKyc.status === "REUPLOAD_REQUIRED"
                  ? "#fff7ed"
                  : currentKyc.status === "REJECTED"
                  ? "#fef2f2"
                  : "#eff6ff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {currentKyc.status === "VERIFIED" ? (
                <CheckCircle2 size={18} color="#059669" />
              ) : currentKyc.status === "REUPLOAD_REQUIRED" ? (
                <AlertCircle size={18} color="#ea580c" />
              ) : currentKyc.status === "REJECTED" ? (
                <AlertCircle size={18} color="#dc2626" />
              ) : (
                <Clock size={18} color="#2563eb" />
              )}
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                Status: <b>{currentKyc.status.replace(/_/g, " ")}</b>
              </span>
            </div>
            {currentKyc.reupload_notes && (
              <span style={{ fontSize: "12px", color: "#c2410c", fontWeight: 600 }}>
                Note: {currentKyc.reupload_notes}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar & Steps Tabs */}
        <div style={{ padding: "16px 24px", backgroundColor: "#ffffff", borderBottom: "1px solid #f1f5f9" }}>
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {stepsList.map((s) => (
              <button
                key={s.num}
                onClick={() => setStep(s.num)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: step === s.num ? "#059669" : step > s.num ? "#d1fae5" : "#f1f5f9",
                  color: step === s.num ? "#ffffff" : step > s.num ? "#065f46" : "#64748b",
                  transition: "all 0.15s ease",
                }}
              >
                {s.num}. {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: "24px", flex: 1 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
              <Loader2 className="animate-spin" size={32} color="#059669" />
            </div>
          ) : (
            <div>
              {/* STEP 1: Personal Details & Emergency Contact */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Personal Information & Emergency Contact
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Provide your full legal name as it appears on your government identification and emergency contact details for rider safety.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Full Legal Name:
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Shankar Patil"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Date of Birth:
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Emergency Contact Person:
                      </label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="e.g. Suresh Patil (Brother)"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Emergency Contact Phone:
                      </label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Live Selfie / Liveness Photo */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Live Rider Photo / Selfie
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Take a clear front-facing photo in good lighting without sunglasses or mask. Used for rider identification and customer security.
                  </p>

                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "14px",
                      padding: "24px",
                      textAlign: "center",
                      backgroundColor: selfieFile ? "#f0fdf4" : "#fafafa",
                    }}
                  >
                    <Camera size={36} color={selfieFile ? "#16a34a" : "#94a3b8"} style={{ margin: "0 auto 12px" }} />
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      {selfieFile ? "✓ Live Rider Selfie Uploaded" : "Upload Live Selfie / Profile Photo"}
                    </div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 18px",
                        borderRadius: "10px",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Upload size={16} />
                      {uploadingField === "selfie" ? "Uploading..." : selfieFile ? "Replace Selfie" : "Take / Choose Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, "selfie", setSelfieFile)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: ID Verification */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Government ID Proof
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Upload Aadhaar Card or Voter ID card. Document numbers are masked and securely stored under Section 47 protocols.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      ID Proof Type:
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="VOTER_ID">Voter ID Card</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      ID Number:
                    </label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder={idType === "AADHAAR" ? "XXXX XXXX 1234" : "ID Card Number"}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "14px",
                      padding: "20px",
                      textAlign: "center",
                      backgroundColor: idFile ? "#f0fdf4" : "#fafafa",
                    }}
                  >
                    <FileText size={32} color={idFile ? "#16a34a" : "#94a3b8"} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      {idFile ? "✓ ID Document Uploaded" : "Upload Front / Back Scan of ID"}
                    </div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Upload size={14} />
                      {uploadingField === "id_proof" ? "Uploading..." : idFile ? "Replace File" : "Select Document"}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, "id_proof", setIdFile)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: Driving License */}
              {step === 4 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Driving License Verification
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Enter valid Indian Driving License number for 2-wheeler or relevant commercial transport.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        License Number:
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                        placeholder="MH-13-20210001234"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        License Expiry Date:
                      </label>
                      <input
                        type="date"
                        value={licenseExpiry}
                        onChange={(e) => setLicenseExpiry(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "14px",
                      padding: "20px",
                      textAlign: "center",
                      backgroundColor: licenseFile ? "#f0fdf4" : "#fafafa",
                    }}
                  >
                    <FileText size={32} color={licenseFile ? "#16a34a" : "#94a3b8"} style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      {licenseFile ? "✓ Driving License Uploaded" : "Upload Driving License (Front Photo)"}
                    </div>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Upload size={14} />
                      {uploadingField === "license" ? "Uploading..." : licenseFile ? "Replace File" : "Select Document"}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, "license", setLicenseFile)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5: Vehicle & RC Book */}
              {step === 5 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Vehicle Details & Registration (RC)
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Register the motorcycle, scooter, or EV used for delivering produce within the 15 KM boundary.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Vehicle Type:
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="MOTORCYCLE">Motorcycle / Bike</option>
                        <option value="SCOOTER">Scooter / Moped</option>
                        <option value="ELECTRIC_2W">Electric 2-Wheeler (EV)</option>
                        <option value="BICYCLE">Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Vehicle Registration Number:
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="MH 13 AB 1234"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div
                      style={{
                        border: "2px dashed #cbd5e1",
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center",
                        backgroundColor: rcFile ? "#f0fdf4" : "#fafafa",
                      }}
                    >
                      <Truck size={28} color={rcFile ? "#16a34a" : "#94a3b8"} style={{ margin: "0 auto 6px" }} />
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                        {rcFile ? "✓ RC Book Uploaded" : "Upload Vehicle RC"}
                      </div>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={12} />
                        {uploadingField === "rc_book" ? "..." : rcFile ? "Change" : "Upload"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileUpload(e, "rc_book", setRcFile)}
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        border: "2px dashed #cbd5e1",
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center",
                        backgroundColor: insuranceFile ? "#f0fdf4" : "#fafafa",
                      }}
                    >
                      <FileText size={28} color={insuranceFile ? "#16a34a" : "#94a3b8"} style={{ margin: "0 auto 6px" }} />
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                        {insuranceFile ? "✓ Insurance Uploaded" : "Upload Vehicle Insurance"}
                      </div>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Upload size={12} />
                        {uploadingField === "insurance" ? "..." : insuranceFile ? "Change" : "Upload"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileUpload(e, "insurance", setInsuranceFile)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Operating Area */}
              {step === 6 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Operating City & Delivery Zone
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Vegito operates hyper-local delivery clusters up to 15 KM around Solapur mandi centers.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Operating City:
                    </label>
                    <input
                      type="text"
                      value={operatingCity}
                      onChange={(e) => setOperatingCity(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Preferred Hub / Zone:
                    </label>
                    <select
                      value={operatingZone}
                      onChange={(e) => setOperatingZone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="Central Mandi">Central Mandi (Solapur APMC)</option>
                      <option value="Saat Rasta">Saat Rasta & Ashok Chowk</option>
                      <option value="Jule Solapur">Jule Solapur</option>
                      <option value="Hotgi Road">Hotgi Road Zone</option>
                      <option value="MIDC / All Solapur">All Solapur Mandi Zone (15 KM)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 7: Payout Bank / UPI */}
              {step === 7 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Daily Payout Bank & UPI Details
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Delivery earnings (₹35 per delivery + surge bonuses) are settled directly to your verified bank account or UPI ID.
                  </p>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Account Holder Name:
                    </label>
                    <input
                      type="text"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      placeholder="Name as registered with bank"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Bank Account Number:
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="e.g. 01234567890123"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                        Bank IFSC Code:
                      </label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #cbd5e1",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                      Instant UPI ID (Optional for fast payouts):
                    </label>
                    <input
                      type="text"
                      value={bankUpi}
                      onChange={(e) => setBankUpi(e.target.value)}
                      placeholder="e.g. 9876543210@paytm or name@okaxis"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 8: Review & Submit */}
              {step === 8 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Review & Complete Submission
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    Please review all details before sending to the Vegito verification team.
                  </p>

                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                      <div><b>Rider Name:</b> {fullName || "Not specified"}</div>
                      <div><b>Date of Birth:</b> {dob || "Not specified"}</div>
                      <div><b>ID Type:</b> {idType}</div>
                      <div><b>Driving License:</b> {licenseNumber || "Not specified"}</div>
                      <div><b>Vehicle:</b> {vehicleType} ({vehicleNumber || "No RC"})</div>
                      <div><b>Operating City:</b> {operatingCity} ({operatingZone})</div>
                      <div><b>Bank IFSC:</b> {bankIfsc || "Not provided"}</div>
                      <div><b>UPI ID:</b> {bankUpi || "Not provided"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "10px" }}>
                    <ShieldCheck size={20} color="#059669" />
                    <span style={{ fontSize: "12.5px", color: "#065f46", fontWeight: 600 }}>
                      I certify that all documents submitted are authentic and correspond to my legal identity.
                    </span>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {errorMsg && (
                <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#b91c1c", fontSize: "13px", fontWeight: 600 }}>
                  ⚠️ {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#15803d", fontSize: "13px", fontWeight: 600 }}>
                  ✓ {successMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            borderBottomLeftRadius: "20px",
            borderBottomRightRadius: "20px",
          }}
        >
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 18px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 700,
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.5 : 1,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {step < 8 ? (
            <button
              onClick={() => setStep((s) => Math.min(8, s + 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 800,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
              }}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {isSubmitting ? "Submitting Application..." : "Submit KYC Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
