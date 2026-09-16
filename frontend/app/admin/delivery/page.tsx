"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  UserCheck,
  Search,
  ArrowRight,
  ShieldCheck,
  Navigation,
} from "lucide-react";

import { RoleGuard } from "@/components/role/role-guard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AdminLiveDeliveryMap } from "@/components/map/admin-live-delivery-map";
import {
  getAdminLiveDelivery,
  listAdminDeliveryPartners,
  listAdminDeliveryTasks,
  assignDeliveryTask,
  verifyDeliveryPartner,
} from "@/lib/api/admin";

export default function AdminDeliveryPage() {
  const queryClient = useQueryClient();
  const [partnerSearch, setPartnerSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "unassigned" | "assigned">("unassigned");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const {
    data: liveFleet = [],
    refetch: refetchFleet,
  } = useQuery({
    queryKey: ["admin-live-delivery"],
    queryFn: getAdminLiveDelivery,
    refetchInterval: autoRefresh ? 12000 : false,
  });

  const {
    data: partners = [],
    isLoading: isLoadingPartners,
    refetch: refetchPartners,
  } = useQuery({
    queryKey: ["admin-delivery-partners"],
    queryFn: () => listAdminDeliveryPartners(),
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ["admin-delivery-tasks", taskFilter],
    queryFn: () =>
      listAdminDeliveryTasks({
        unassigned_only: taskFilter === "unassigned",
        status: taskFilter === "assigned" ? "ASSIGNED" : undefined,
      }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ taskId, partnerId }: { taskId: number; partnerId: number }) =>
      assignDeliveryTask(taskId, partnerId),
    onSuccess: () => {
      showNotification("Delivery task assigned successfully");
      setSelectedTaskId(null);
      setSelectedPartnerId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-live-delivery"] });
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-partners"] });
    },
    onError: (err: any) => {
      showNotification(err?.response?.data?.detail || "Failed to assign delivery task");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ partnerId, isVerified }: { partnerId: number; isVerified: boolean }) =>
      verifyDeliveryPartner(partnerId, isVerified),
    onSuccess: () => {
      showNotification("Partner verification updated");
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-live-delivery"] });
    },
    onError: (err: any) => {
      showNotification(err?.response?.data?.detail || "Failed to update partner verification");
    },
  });

  const handleRefreshAll = () => {
    refetchFleet();
    refetchPartners();
    refetchTasks();
    showNotification("Fleet data refreshed");
  };

  const filteredPartners = partners.filter((p: any) => {
    const q = partnerSearch.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const phone = (p.phone || "").toLowerCase();
    const vehicle = (p.vehicle_number || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || vehicle.includes(q);
  });

  const totalPartners = partners.length;
  const verifiedPartners = partners.filter((p: any) => p.is_verified).length;
  const onlinePartners = liveFleet.filter((p: any) => p.is_available).length;
  const activeInTransit = liveFleet.filter((p: any) => p.current_order_id).length;
  const unassignedTasksCount = tasks.filter((t: any) => !t.delivery_partner_id).length;

  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <DashboardShell role="admin">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {notice && (
            <div
              style={{
                backgroundColor: "#e9f6ee",
                color: "#16835b",
                border: "1px solid #16835b",
                borderRadius: "12px",
                padding: "12px 18px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {notice}
            </div>
          )}

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#063c32", margin: 0 }}>
                Delivery Fleet & Dispatch Operations
              </h1>
              <p style={{ fontSize: "14px", color: "#62746a", margin: "4px 0 0" }}>
                Real-time delivery partner tracking, fleet telemetry, and dispatch assignments.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#22352b", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Live GPS Sync (12s)
              </label>
              <button
                onClick={handleRefreshAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#063c32",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e1e8e2",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <StatCard
              label="Total Fleet"
              value={totalPartners}
              icon={<Truck size={20} />}
              trend={{ value: `${verifiedPartners} verified`, isPositive: true }}
            />
            <StatCard
              label="Active In-Transit"
              value={activeInTransit}
              icon={<Navigation size={20} />}
              iconBg="#e0f2fe"
              iconColor="#0284c7"
            />
            <StatCard
              label="Available / Online"
              value={onlinePartners}
              icon={<CheckCircle2 size={20} />}
              iconBg="#e9f6ee"
              iconColor="#16835b"
            />
            <StatCard
              label="Pending Dispatch"
              value={unassignedTasksCount}
              icon={<AlertCircle size={20} />}
              iconBg="#fef3c7"
              iconColor="#d97706"
            />
            <StatCard
              label="Verified Ratio"
              value={totalPartners > 0 ? `${Math.round((verifiedPartners / totalPartners) * 100)}%` : "0%"}
              icon={<ShieldCheck size={20} />}
            />
          </div>

          {/* Live Fleet Map Section */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e1e8e2", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#16835b", display: "inline-block" }} />
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#063c32", margin: 0 }}>Live Delivery Fleet Tracking</h2>
                <span style={{ fontSize: "12px", color: "#8fa296" }}>({liveFleet.length} partners reporting)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "#62746a" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16835b" }} /> In-Transit
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3b82f6" }} /> Available Online
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#9ca3af" }} /> Idle / Offline
                </span>
              </div>
            </div>

            <div style={{ height: "460px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid #e1e8e2" }}>
              <AdminLiveDeliveryMap
                partners={liveFleet}
                height="460px"
                onSelectPartner={(partner) => setSelectedPartnerId(partner.partner_id)}
              />
            </div>
          </div>

          {/* Dispatch Management & Partner Directory Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
            {/* Dispatch Tasks Panel */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e1e8e2", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #e1e8e2" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#063c32", margin: 0 }}>Dispatch Queue</h3>
                  <p style={{ fontSize: "12px", color: "#62746a", margin: "2px 0 0" }}>Assign ready orders to delivery partners</p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setTaskFilter("unassigned")}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "8px",
                      border: "1px solid #e1e8e2",
                      backgroundColor: taskFilter === "unassigned" ? "#16835b" : "#ffffff",
                      color: taskFilter === "unassigned" ? "#ffffff" : "#22352b",
                      cursor: "pointer",
                    }}
                  >
                    Unassigned ({tasks.filter((t: any) => !t.delivery_partner_id).length})
                  </button>
                  <button
                    onClick={() => setTaskFilter("all")}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "8px",
                      border: "1px solid #e1e8e2",
                      backgroundColor: taskFilter === "all" ? "#16835b" : "#ffffff",
                      color: taskFilter === "all" ? "#ffffff" : "#22352b",
                      cursor: "pointer",
                    }}
                  >
                    All Tasks
                  </button>
                </div>
              </div>

              {isLoadingTasks ? (
                <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#8fa296" }}>Loading delivery tasks...</div>
              ) : tasks.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#8fa296" }}>No delivery tasks found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "500px", overflowY: "auto" }}>
                  {tasks.map((task: any) => {
                    const isSelected = selectedTaskId === task.id;
                    const isUnassigned = !task.delivery_partner_id;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #16835b" : "1px solid #e1e8e2",
                          backgroundColor: isSelected ? "#f4f9f6" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "14px", fontWeight: 700, color: "#063c32" }}>{task.order_number}</span>
                              <StatusBadge status={task.task_status} />
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "#16835b" }}>₹{task.total_amount}</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#22352b", margin: "6px 0 2px" }}>
                              <strong>Customer:</strong> {task.customer_name} {task.customer_phone ? `(${task.customer_phone})` : ""}
                            </p>
                            <p style={{ fontSize: "12px", color: "#62746a", margin: "2px 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={12} color="#8fa296" /> {task.delivery_address}
                            </p>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            {isUnassigned ? (
                              <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#fef3c7", color: "#b45309" }}>
                                Unassigned
                              </span>
                            ) : (
                              <div>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: "#063c32", display: "block" }}>
                                  {task.delivery_partner_name || `Partner #${task.delivery_partner_id}`}
                                </span>
                                <span style={{ fontSize: "11px", color: "#8fa296" }}>Assigned</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px solid #e1e8e2",
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={selectedPartnerId || ""}
                              onChange={(e) => setSelectedPartnerId(Number(e.target.value) || null)}
                              style={{
                                flex: 1,
                                minWidth: "180px",
                                fontSize: "12px",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                              }}
                            >
                              <option value="">Select verified delivery partner...</option>
                              {partners
                                .filter((p: any) => p.is_verified)
                                .map((p: any) => (
                                  <option key={p.partner_id || p.id} value={p.partner_id || p.id}>
                                    {p.name} ({p.phone}) {p.is_available ? "• Available" : "• Busy/Offline"}
                                  </option>
                                ))}
                            </select>

                            <button
                              disabled={!selectedPartnerId || assignMutation.isPending}
                              onClick={() => {
                                if (selectedPartnerId) {
                                  assignMutation.mutate({ taskId: task.id, partnerId: selectedPartnerId });
                                }
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#ffffff",
                                backgroundColor: selectedPartnerId ? "#16835b" : "#cbd5e1",
                                border: "none",
                                borderRadius: "8px",
                                cursor: selectedPartnerId ? "pointer" : "not-allowed",
                              }}
                            >
                              <ArrowRight size={14} />
                              {assignMutation.isPending ? "Assigning..." : "Assign Partner"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery Partners Directory */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e1e8e2", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #e1e8e2", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#063c32", margin: 0 }}>Delivery Partners Directory</h3>
                  <p style={{ fontSize: "12px", color: "#62746a", margin: "2px 0 0" }}>Manage partner verification and fleet availability</p>
                </div>
                <div style={{ position: "relative", width: "180px" }}>
                  <Search size={14} color="#8fa296" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    placeholder="Search partner..."
                    style={{
                      width: "100%",
                      fontSize: "12px",
                      padding: "6px 10px 6px 30px",
                      borderRadius: "8px",
                      border: "1px solid #e1e8e2",
                    }}
                  />
                </div>
              </div>

              {isLoadingPartners ? (
                <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#8fa296" }}>Loading delivery partners...</div>
              ) : filteredPartners.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", color: "#8fa296" }}>No delivery partners found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "500px", overflowY: "auto" }}>
                  {filteredPartners.map((partner: any) => {
                    const pId = partner.partner_id || partner.id;
                    const isSelected = selectedPartnerId === pId;

                    return (
                      <div
                        key={pId}
                        onClick={() => setSelectedPartnerId(pId)}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid #16835b" : "1px solid #e1e8e2",
                          backgroundColor: isSelected ? "#f4f9f6" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#063c32", margin: 0 }}>{partner.name}</h4>
                              {partner.is_verified ? (
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#16835b", backgroundColor: "#e9f6ee", padding: "2px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <UserCheck size={12} /> Verified
                                </span>
                              ) : (
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#b45309", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <AlertCircle size={12} /> Unverified
                                </span>
                              )}
                              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: partner.is_available ? "#e9f6ee" : "#f1f5f9", color: partner.is_available ? "#16835b" : "#64748b" }}>
                                {partner.is_available ? "Available" : "Offline"}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "#62746a", marginTop: "6px", flexWrap: "wrap" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Phone size={12} color="#8fa296" /> {partner.phone}
                              </span>
                              {partner.vehicle_type && (
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Truck size={12} color="#8fa296" /> {partner.vehicle_type} ({partner.vehicle_number || "N/A"})
                                </span>
                              )}
                              <span>★ {partner.rating ? Number(partner.rating).toFixed(1) : "5.0"}</span>
                            </div>
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            <button
                              disabled={verifyMutation.isPending}
                              onClick={() =>
                                verifyMutation.mutate({
                                  partnerId: pId,
                                  isVerified: !partner.is_verified,
                                })
                              }
                              style={{
                                padding: "6px 12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderRadius: "8px",
                                border: partner.is_verified ? "1px solid #e1e8e2" : "none",
                                backgroundColor: partner.is_verified ? "#ffffff" : "#16835b",
                                color: partner.is_verified ? "#62746a" : "#ffffff",
                                cursor: "pointer",
                              }}
                            >
                              {partner.is_verified ? "Unverify" : "Verify Partner"}
                            </button>
                          </div>
                        </div>

                        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8fa296" }}>
                          <span>Total Deliveries: {partner.total_deliveries ?? 0}</span>
                          {partner.speed_kmh !== undefined && partner.speed_kmh !== null && (
                            <span style={{ color: "#16835b", fontWeight: 600 }}>Speed: {partner.speed_kmh} km/h</span>
                          )}
                          {partner.current_order_id && (
                            <span style={{ color: "#0284c7", fontWeight: 600 }}>Delivering Order #{partner.current_order_id}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}
