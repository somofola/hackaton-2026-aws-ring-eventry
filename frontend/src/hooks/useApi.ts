
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEvents, fetchEvent, deleteEvent, updateEvent } from '@/services/eventService';
import api from '@/services/api';
import { mockUsers } from '@/data/mockdata';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => Promise.resolve(mockUsers),
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => Promise.resolve(mockUsers.find(user => user.id === id)),
    enabled: !!id,
  });
};

export const useQRCodes = (userId?: string) => {
  return useQuery({
    queryKey: ['qr-codes', userId],
    queryFn: () => Promise.resolve([]), // Mock empty QR codes for now
  });
};

export const useCreateQRCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (qrData: any) => Promise.resolve(qrData), // Mock for now
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
    },
  });
};

// Event management hooks
export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });
};

export const useEvent = (uuid: string) => {
  return useQuery({
    queryKey: ['event', uuid],
    queryFn: () => fetchEvent(uuid),
    enabled: !!uuid,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData: any) => Promise.resolve(eventData), // Mock for now
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useEventAnalytics = (uuid: string) => {
  return useQuery({
    queryKey: ['event-analytics', uuid],
    queryFn: async () => {
      const { data } = await api.get(`/events/${uuid}/analytics`);
      return data as {
        basic_stats: { total_registered: number; checked_in: number; check_in_rate: number };
        registration_trend: { date: string; count: number }[];
        ticket_sales: { name: string; sold_quantity: number; max_quantity: number; price: number }[];
        revenue: { total: number; pending: number; refunded: number };
        demographics: { total_speakers: number; total_sessions: number; total_exhibitors: number; team_members: number };
      };
    },
    enabled: !!uuid,
  });
};

export const useEventEnrollments = (uuid: string) => {
  return useQuery({
    queryKey: ['event-enrollments', uuid],
    queryFn: async () => {
      const { data } = await api.get(`/events/${uuid}/enrollments`);
      return data as Array<{
        id: number;
        user_id: number;
        user_name: string;
        user_email: string;
        enrolled_at: string;
        status: 'enrolled' | 'attended' | 'cancelled';
        checked_in: boolean;
        checked_in_at: string | null;
        checked_in_by: string | null;
        confirmation_number: string;
        user?: { phone?: string; profile_image_url?: string };
      }>;
    },
    enabled: !!uuid,
  });
};

export const useEnrollInEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) => 
      Promise.resolve({ eventId, userId }), // Mock for now
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-enrollments'] });
    },
  });
};

export const useCancelEnrollment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (enrollmentId: string) => Promise.resolve(enrollmentId), // Mock for now
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-enrollments'] });
    },
  });
};

export const useCheckInAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ enrollmentId, checkedInBy }: { enrollmentId: string; checkedInBy: string }) => 
      Promise.resolve({ enrollmentId, checkedInBy }), // Mock for now
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-enrollments'] });
    },
  });
};
