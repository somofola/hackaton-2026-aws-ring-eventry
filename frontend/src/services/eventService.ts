
import { Event } from "@/types";
import api from "@/services/api";

export interface RingChimeResult {
  triggered: boolean;
  reason: "not_configured" | "unsupported_device" | "no_audio_slot" | "api_error" | null;
}

export const checkInEnrollment = async (eventUuid: string, enrollmentId: number, checkedInBy: string, ringDeviceId?: string): Promise<{ ring_chime: RingChimeResult | null; [key: string]: unknown }> => {
  const { data } = await api.post(`/events/${eventUuid}/check-in`, {
    enrollment_id: enrollmentId,
    checked_in_by: checkedInBy,
    ring_device_id: ringDeviceId || undefined,
  });
  return data;
};

export interface RingStatus {
  ring: { event_type: string; device_id: string; confidence: number | null; thumbnail_url: string | null; caption: string | null; at: string } | null;
  last_checkin: { name: string; method: string; at: string } | null;
}

export const fetchRingStatus = async (eventUuid: string, ringDeviceId: string): Promise<RingStatus> => {
  const { data } = await api.get(`/events/${eventUuid}/ring-status`, {
    params: { device_id: ringDeviceId },
  });
  return data;
};

/** Arms a Ring device for the no-kiosk capture path (see RingArrivalCaptureService). */
export const armRingDevice = async (ringDeviceId: string, eventId: number) => {
  const { data } = await api.post(`/ring/devices/${ringDeviceId}/arm`, { event_id: eventId });
  return data;
};

export const disarmRingDevice = async (ringDeviceId: string) => {
  const { data } = await api.delete(`/ring/devices/${ringDeviceId}/arm`);
  return data;
};

export interface RingWhepSession {
  sdp: string;
  session_url: string;
}

/** Opens a live WHEP view against the device — raw SDP offer in, SDP answer + session_url out. */
export const openRingWhep = async (ringDeviceId: string, sdpOffer: string): Promise<RingWhepSession> => {
  const { data } = await api.post(`/ring/devices/${ringDeviceId}/whep`, sdpOffer, {
    headers: { "Content-Type": "application/sdp" },
  });
  return data;
};

export const closeRingWhep = async (ringDeviceId: string, sessionUrl: string) => {
  const { data } = await api.delete(`/ring/devices/${ringDeviceId}/whep`, {
    data: { session_url: sessionUrl },
  });
  return data;
};

export const checkInByQr = async (eventUuid: string, qrCode: string, checkedInBy: string, ringDeviceId?: string) => {
  const { data } = await api.post(`/events/${eventUuid}/check-in/qr`, {
    qr_code: qrCode,
    checked_in_by: checkedInBy,
    ring_device_id: ringDeviceId || undefined,
  });
  return data;
};

/** Staff-triggered face check-in — image is a single captured frame, not stored, just matched. */
export const checkInByFace = async (eventUuid: string, image: Blob, checkedInBy: string, ringDeviceId?: string) => {
  const formData = new FormData();
  formData.append("image", image, "frame.jpg");
  formData.append("checked_in_by", checkedInBy);
  if (ringDeviceId) formData.append("ring_device_id", ringDeviceId);

  const { data } = await api.post(`/events/${eventUuid}/check-in/face`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const testRingChime = async (ringDeviceId: string): Promise<{ success: boolean; reason: RingChimeResult["reason"] }> => {
  const { data } = await api.post(`/ring/devices/${ringDeviceId}/test-chime`);
  return data;
};

export interface RingTestCapture {
  success: boolean;
  image_base64?: string;
  qr_result?: string | null;
  message?: string;
}

export const testRingCapture = async (ringDeviceId: string): Promise<RingTestCapture> => {
  const { data } = await api.post(`/ring/devices/${ringDeviceId}/test-capture`);
  return data;
};

/** Opt-in face check-in enrollment — photo indexed into this event's Rekognition collection only. */
export const uploadFaceOptIn = async (eventUuid: string, enrollmentId: number, photo: File) => {
  const formData = new FormData();
  formData.append("photo", photo);
  const { data } = await api.post(
    `/events/${eventUuid}/enrollments/${enrollmentId}/face-optin`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const fetchEvents = async (): Promise<Event[]> => {
  const { data } = await api.get("/my-events");
  return data;
};

export const fetchEvent = async (uuid: string): Promise<Event | null> => {
  const { data } = await api.get(`/events/${uuid}`);
  return data;
};

export const updateEvent = async (uuid: string, payload: any): Promise<Event> => {
  const { data } = await api.put(`/events/${uuid}`, payload);
  return data;
};

export const uploadEventBanner = async (uuid: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("banner_image_file", file);
  const { data } = await api.post(`/events/${uuid}/banner`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.image_url;
};

export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};

export const lookupTeamMemberByEmail = async (email: string): Promise<{
  found: boolean;
  user?: { name: string; phone: string | null; imageUrl: string | null };
}> => {
  const { data } = await api.get(`/team-members/lookup`, { params: { email } });
  return data;
};

export const createEventTeamMember = async (uuid: string, email: string) => {
  const { data: result } = await api.post(`/events/${uuid}/team-members`, { email });
  return result;
};

export const updateEventTeamMember = async (uuid: string, memberId: string | number, data: {
  name?: string; role?: string; phone?: string;
}) => {
  const { data: result } = await api.put(`/events/${uuid}/team-members/${memberId}`, data);
  return result;
};

export const deleteEventTeamMember = async (uuid: string, memberId: string | number) => {
  await api.delete(`/events/${uuid}/team-members/${memberId}`);
};

export const lookupSpeakerByEmail = async (email: string): Promise<{
  found: boolean;
  user?: { name: string; bio: string | null; imageUrl: string | null };
}> => {
  const { data } = await api.get(`/speakers/lookup`, { params: { email } });
  return data;
};

export const createEventSpeaker = async (
  uuid: string,
  fields: {
    email: string;
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    linkedin?: string;
    twitter?: string;
    session_id?: number | null;
  },
  profileImage?: File | null,
) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v != null && v !== "") formData.append(k, String(v));
  });
  if (profileImage) formData.append("profile_image", profileImage);
  const { data } = await api.post(`/events/${uuid}/speakers`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateEventSpeaker = async (
  uuid: string,
  speakerId: string | number,
  fields: {
    name?: string;
    title?: string;
    company?: string;
    bio?: string;
    linkedin?: string;
    twitter?: string;
    session_id?: number | null;
  },
  profileImage?: File | null,
) => {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v != null) formData.append(k, v === null ? "" : String(v));
  });
  if (profileImage) formData.append("profile_image", profileImage);
  formData.append("_method", "PUT");
  const { data } = await api.post(`/events/${uuid}/speakers/${speakerId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

const buildExhibitorForm = (
  fields: {
    company_name?: string; contact_name?: string; contact_email?: string;
    contact_phone?: string; website?: string; booth_number?: string; description?: string;
  },
  logo?: File | null,
) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== "") fd.append(k, v); });
  if (logo) fd.append("logo", logo);
  return fd;
};

export const createEventExhibitor = async (
  uuid: string,
  fields: {
    company_name: string; contact_name: string; contact_email: string;
    contact_phone?: string; website?: string; booth_number?: string; description?: string;
  },
  logo?: File | null,
) => {
  const { data } = await api.post(`/events/${uuid}/exhibitors`, buildExhibitorForm(fields, logo), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateEventExhibitor = async (
  uuid: string,
  exhibitorId: string | number,
  fields: {
    company_name?: string; contact_name?: string; contact_email?: string;
    contact_phone?: string; website?: string; booth_number?: string; description?: string;
  },
  logo?: File | null,
) => {
  const fd = buildExhibitorForm(fields, logo);
  fd.append("_method", "PUT");
  const { data } = await api.post(`/events/${uuid}/exhibitors/${exhibitorId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteEventExhibitor = async (uuid: string, exhibitorId: string | number) => {
  await api.delete(`/events/${uuid}/exhibitors/${exhibitorId}`);
};

const buildSponsorForm = (
  fields: { name?: string; tier?: string; website?: string; description?: string; contact_name?: string; contact_email?: string },
  logo?: File | null,
) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== "") fd.append(k, v); });
  if (logo) fd.append("logo", logo);
  return fd;
};

export const createEventSponsor = async (
  uuid: string,
  fields: { name: string; tier?: string; website?: string; description?: string; contact_name?: string; contact_email?: string },
  logo?: File | null,
) => {
  const { data } = await api.post(`/events/${uuid}/sponsors`, buildSponsorForm(fields, logo), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateEventSponsor = async (
  uuid: string,
  sponsorId: string | number,
  fields: { name?: string; tier?: string; website?: string; description?: string; contact_name?: string; contact_email?: string },
  logo?: File | null,
) => {
  const fd = buildSponsorForm(fields, logo);
  fd.append("_method", "PUT");
  const { data } = await api.post(`/events/${uuid}/sponsors/${sponsorId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteEventSponsor = async (uuid: string, sponsorId: string | number) => {
  await api.delete(`/events/${uuid}/sponsors/${sponsorId}`);
};

export const createEventSession = async (uuid: string, data: {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity?: number;
  speakerIds?: string[];
}) => {
  const { data: result } = await api.post(`/events/${uuid}/sessions`, data);
  return result;
};

export const createFloorPlan = async (uuid: string, name: string, imageFile: File) => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("floor_plan_image", imageFile);
  const { data } = await api.post(`/events/${uuid}/floor-plans`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const fetchEventReviews = async (uuid: string) => {
  const { data } = await api.get(`/events/${uuid}/reviews`);
  return data;
};

export const submitEventReview = async (uuid: string, rating: number, comment: string) => {
  const { data } = await api.post(`/events/${uuid}/reviews`, { rating, comment });
  return data;
};

export const createTicketCategory = async (uuid: string, data: {
  name: string;
  description: string;
  price?: number;
  maxQuantity?: number;
  color?: string;
  floorPlanAreas?: any[];
}) => {
  const { data: result } = await api.post(`/events/${uuid}/ticket-categories`, data);
  return result;
};
