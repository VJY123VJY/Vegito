import { api, getErrorMessage } from "./client";

export interface SellerKycData {
  id: number;
  seller_profile_id: number;
  user_id: number;
  status: "DRAFT" | "PENDING_DOCUMENTS" | "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED" | "SUSPENDED";
  business_type: string;
  business_proof_type?: string;
  business_proof_number?: string;
  business_proof_file?: string;
  shop_front_photo?: string;
  shop_interior_photo?: string;
  shop_signage_photo?: string;
  id_proof_type?: string;
  id_proof_number_masked?: string;
  id_proof_file?: string;
  selfie_file?: string;
  liveness_status: string;
  bank_account_holder?: string;
  bank_account_number_masked?: string;
  bank_ifsc?: string;
  bank_name?: string;
  bank_upi_id?: string;
  rejection_reason?: string;
  reupload_notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SellerKycPayload {
  business_type: string;
  business_proof_type?: string;
  business_proof_number?: string;
  business_proof_file?: string;
  shop_front_photo?: string;
  shop_interior_photo?: string;
  shop_signage_photo?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  id_proof_file?: string;
  selfie_file?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  bank_upi_id?: string;
}

export interface DeliveryPartnerKycData {
  id: number;
  delivery_partner_id: number;
  user_id: number;
  status: "DRAFT" | "PENDING_DOCUMENTS" | "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "REUPLOAD_REQUIRED" | "SUSPENDED" | "ACTIVE" | "INACTIVE";
  full_name?: string;
  dob?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_photo?: string;
  selfie_file?: string;
  liveness_status: string;
  id_proof_type?: string;
  id_proof_number_masked?: string;
  id_proof_file?: string;
  driving_license_number?: string;
  driving_license_expiry?: string;
  driving_license_file?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  rc_book_file?: string;
  insurance_file?: string;
  operating_city: string;
  operating_zone?: string;
  bank_account_holder?: string;
  bank_account_number_masked?: string;
  bank_ifsc?: string;
  bank_upi_id?: string;
  rejection_reason?: string;
  reupload_notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPartnerKycPayload {
  full_name?: string;
  dob?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_photo?: string;
  selfie_file?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  id_proof_file?: string;
  driving_license_number?: string;
  driving_license_expiry?: string;
  driving_license_file?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  rc_book_file?: string;
  insurance_file?: string;
  operating_city?: string;
  operating_zone?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_upi_id?: string;
}

export interface KycAuditRecord {
  id: number;
  kyc_type: string;
  target_id: number;
  user_id: number;
  reviewer_id?: number;
  previous_status?: string;
  new_status: string;
  decision: string;
  reason?: string;
  reupload_notes?: string;
  created_at: string;
}

export interface AdminKycReviewsResponse {
  sellers: any[];
  delivery_partners: any[];
  total_pending: number;
}

export async function getSellerKyc(): Promise<SellerKycData> {
  const res = await api.get<{ message?: string; data: SellerKycData }>("/seller/kyc");
  return res.data.data;
}

export async function submitSellerKyc(payload: SellerKycPayload): Promise<SellerKycData> {
  const res = await api.post<{ message?: string; data: SellerKycData }>("/seller/kyc", payload);
  return res.data.data;
}

export async function getDeliveryKyc(): Promise<DeliveryPartnerKycData> {
  const res = await api.get<{ message?: string; data: DeliveryPartnerKycData }>("/delivery/kyc");
  return res.data.data;
}

export async function submitDeliveryKyc(payload: DeliveryPartnerKycPayload): Promise<DeliveryPartnerKycData> {
  const res = await api.post<{ message?: string; data: DeliveryPartnerKycData }>("/delivery/kyc", payload);
  return res.data.data;
}

export async function uploadKycDocument(file: File, docType: string): Promise<{ document_key: string; url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);

  const res = await api.post<{ message: string; data: { document_key: string; url: string; filename: string } }>(
    "/kyc/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return res.data.data;
}

export async function getAdminKycReviews(kycType?: string, status?: string): Promise<AdminKycReviewsResponse> {
  const params: Record<string, string> = {};
  if (kycType) params.kyc_type = kycType;
  if (status) params.status = status;
  const res = await api.get<{ message?: string; data: AdminKycReviewsResponse }>("/admin/kyc/reviews", { params });
  return res.data.data;
}

export async function reviewSellerKyc(
  sellerProfileId: number,
  action: { decision: string; reason?: string; reupload_notes?: string }
): Promise<SellerKycData> {
  const res = await api.post<{ message?: string; data: SellerKycData }>(
    `/admin/kyc/seller/${sellerProfileId}/review`,
    action
  );
  return res.data.data;
}

export async function reviewDeliveryKyc(
  deliveryPartnerId: number,
  action: { decision: string; reason?: string; reupload_notes?: string }
): Promise<DeliveryPartnerKycData> {
  const res = await api.post<{ message?: string; data: DeliveryPartnerKycData }>(
    `/admin/kyc/delivery/${deliveryPartnerId}/review`,
    action
  );
  return res.data.data;
}

export async function getKycAudits(targetId?: number, kycType?: string): Promise<KycAuditRecord[]> {
  const params: Record<string, string> = {};
  if (targetId) params.target_id = String(targetId);
  if (kycType) params.kyc_type = kycType;
  const res = await api.get<{ message?: string; data: KycAuditRecord[] }>("/admin/kyc/audits", { params });
  return res.data.data;
}
