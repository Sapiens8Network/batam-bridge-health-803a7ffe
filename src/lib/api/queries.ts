import { queryOptions } from "@tanstack/react-query";

import { api } from ".";

export const qk = {
  dashboard: ["dashboard"] as const,
  inquiries: ["inquiries"] as const,
  inquiry: (id: string) => ["inquiry", id] as const,
  patients: ["patients"] as const,
  patient: (id: string) => ["patient", id] as const,
  messages: (patientId?: string) => ["messages", patientId ?? "all"] as const,
  activity: (inquiryId?: string) => ["ai-activity", inquiryId ?? "all"] as const,
  reference: ["reference"] as const,
  analytics: ["analytics"] as const,
  publicItinerary: (token: string) => ["public-itinerary", token] as const,
};

export const dashboardQuery = () => queryOptions({ queryKey: qk.dashboard, queryFn: () => api.dashboardSummary() });
export const inquiriesQuery = () => queryOptions({ queryKey: qk.inquiries, queryFn: () => api.inquiries() });
export const inquiryQuery = (id: string) =>
  queryOptions({ queryKey: qk.inquiry(id), queryFn: () => api.inquiry(id), retry: false });
export const patientsQuery = () => queryOptions({ queryKey: qk.patients, queryFn: () => api.patients() });
export const patientQuery = (id: string) =>
  queryOptions({ queryKey: qk.patient(id), queryFn: () => api.patient(id), retry: false });
export const messagesQuery = (patientId?: string) =>
  queryOptions({ queryKey: qk.messages(patientId), queryFn: () => api.messages(patientId) });
export const activityQuery = (inquiryId?: string) =>
  queryOptions({
    queryKey: qk.activity(inquiryId),
    queryFn: () => (inquiryId ? api.aiActivity(inquiryId) : api.aiActivityAll()),
  });
export const referenceQuery = () => queryOptions({ queryKey: qk.reference, queryFn: () => api.reference() });
export const analyticsQuery = () => queryOptions({ queryKey: qk.analytics, queryFn: () => api.analytics() });
export const publicItineraryQuery = (token: string) =>
  queryOptions({ queryKey: qk.publicItinerary(token), queryFn: () => api.publicItinerary(token), retry: false });
