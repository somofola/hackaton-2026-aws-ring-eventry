
export const generateEventBadgeQR = (eventId: string, enrollmentId: string): string => {
  // Generate a unique QR code data for event check-in
  const checkInData = {
    type: 'event-checkin',
    eventId,
    enrollmentId,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  return JSON.stringify(checkInData);
};

// Parses QR codes in the format: e:{eventUuid}:u:{userId}:{timestamp}
export const parseEventBadgeQR = (qrData: string): { eventUuid: string; userId: string } | null => {
  try {
    const parts = qrData.split(':');
    if (parts.length >= 4 && parts[0] === 'e' && parts[2] === 'u') {
      return { eventUuid: parts[1], userId: parts[3] };
    }
  } catch {
    // ignore
  }
  return null;
};
