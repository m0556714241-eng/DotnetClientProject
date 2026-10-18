import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api/events';
import { queryKeys } from '../api/queryKeys';
import type { EventInput, EventQuery } from '../types/api';

export function useEventsList(query: EventQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: ({ signal }) => eventsApi.list(query, signal),
    // Keep the current page on screen while the next one loads (no flicker in pagination)
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useEventDetails(id: number) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: ({ signal }) => eventsApi.get(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    // Seat availability changes while people browse: refresh when the user comes back to the tab
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

// ---------- Admin mutations ----------
export function useSaveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto, image }: { id?: number; dto: EventInput; image?: File | null }) => {
      const saved = id ? await eventsApi.update(id, dto) : await eventsApi.create(dto);
      let imageError: unknown = null;
      if (image) {
        try {
          await eventsApi.uploadImage(saved.id, image);
        } catch (e) {
          // The event itself was saved – report the image problem separately
          imageError = e;
        }
      }
      return { saved, imageError };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => eventsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  });
}
