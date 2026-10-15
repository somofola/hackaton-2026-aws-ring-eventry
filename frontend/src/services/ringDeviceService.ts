import api from "@/services/api";

export interface RingDevice {
  id: number;
  device_id: string;
  name: string;
  location: string | null;
  owner_type: "platform" | "corporate";
  owner_id: number | null;
  owner?: { id: number; name: string; email: string; company: string | null } | null;
  status: "available" | "assigned";
  assigned_event_id: number | null;
  assigned_event?: { id: number; uuid: string; title: string } | null;
  created_at: string;
}

export interface RingDeviceRequest {
  id: number;
  requested_by_user_id: number;
  requested_by?: { id: number; name: string; email: string; company: string | null } | null;
  location: string | null;
  note: string | null;
  event_id: number | null;
  event?: { id: number; uuid: string; title: string } | null;
  status: "pending" | "fulfilled" | "rejected";
  ring_device_id: number | null;
  device?: RingDevice | null;
  created_at: string;
}

export interface RingEventOption {
  id: number;
  uuid: string;
  title: string;
  start_date: string | null;
}

// --- Admin: shared device pool ---

export const fetchRingEventOptions = async (): Promise<RingEventOption[]> => {
  const { data } = await api.get("/ring-devices-event-options");
  return data;
};

export const fetchAllRingDevices = async (): Promise<RingDevice[]> => {
  const { data } = await api.get("/ring-devices");
  return data;
};

export const createRingDevice = async (payload: { device_id: string; name: string; location?: string }): Promise<RingDevice> => {
  const { data } = await api.post("/ring-devices", payload);
  return data;
};

export const updateRingDevice = async (id: number, payload: { name?: string; location?: string }): Promise<RingDevice> => {
  const { data } = await api.put(`/ring-devices/${id}`, payload);
  return data;
};

export const deleteRingDevice = async (id: number): Promise<void> => {
  await api.delete(`/ring-devices/${id}`);
};

export const assignRingDeviceToEvent = async (id: number, eventId: number | null): Promise<RingDevice> => {
  const { data } = await api.post(`/ring-devices/${id}/assign-event`, { event_id: eventId });
  return data;
};

export const fetchAllRingDeviceRequests = async (): Promise<RingDeviceRequest[]> => {
  const { data } = await api.get("/ring-device-requests");
  return data;
};

export const fulfillRingDeviceRequest = async (requestId: number, ringDeviceId: number): Promise<RingDeviceRequest> => {
  const { data } = await api.post(`/ring-device-requests/${requestId}/fulfill`, { ring_device_id: ringDeviceId });
  return data;
};

export const rejectRingDeviceRequest = async (requestId: number): Promise<RingDeviceRequest> => {
  const { data } = await api.post(`/ring-device-requests/${requestId}/reject`);
  return data;
};

// --- Corporate/team: self-service ---

export const fetchMyRingDevices = async (eventId?: number): Promise<RingDevice[]> => {
  const { data } = await api.get("/my-ring-devices", { params: eventId ? { event_id: eventId } : {} });
  return data;
};

export const onboardMyRingDevice = async (payload: { device_id: string; name: string; location?: string }): Promise<RingDevice> => {
  const { data } = await api.post("/my-ring-devices", payload);
  return data;
};

export const fetchMyRingDeviceRequests = async (): Promise<RingDeviceRequest[]> => {
  const { data } = await api.get("/my-ring-device-requests");
  return data;
};

export const requestRingDevice = async (payload: { location?: string; note?: string; event_id?: number }): Promise<RingDeviceRequest> => {
  const { data } = await api.post("/ring-device-requests", payload);
  return data;
};

export interface RingOwnerCredentialStatus {
  configured: boolean;
  client_id: string | null;
  partner_account_identifier: string | null;
  token_exchange_url: string;
  account_link_url: string;
}

export const fetchMyRingCredentials = async (): Promise<RingOwnerCredentialStatus> => {
  const { data } = await api.get("/my-ring-credentials");
  return data;
};

export const saveMyRingCredentials = async (payload: {
  client_id: string;
  client_secret: string;
  hmac_secret: string;
  partner_account_identifier?: string;
}): Promise<void> => {
  await api.post("/my-ring-credentials", payload);
};

// --- Admin: Eventry's own shared Ring Developer app + Playground access token ---

export interface RingPlatformCredentialStatus {
  configured: boolean;
  access_token_set: boolean;
  client_id: string | null;
  partner_account_identifier: string | null;
  client_secret_set: boolean;
  hmac_secret_set: boolean;
}

export const fetchRingPlatformCredentials = async (): Promise<RingPlatformCredentialStatus> => {
  const { data } = await api.get("/ring-platform-credentials");
  return data;
};

export const saveRingPlatformCredentials = async (payload: {
  access_token?: string;
  client_id?: string;
  client_secret?: string;
  hmac_secret?: string;
  partner_account_identifier?: string;
}): Promise<void> => {
  await api.post("/ring-platform-credentials", payload);
};
