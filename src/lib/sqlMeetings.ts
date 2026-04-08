export const ACTIVE_SQL_MEETING_STATUSES = ["pending", "held", "reschedule"] as const;

export const isActiveSqlMeetingStatus = (status?: string | null) => {
  const normalized = status?.trim().toLowerCase() ?? "pending";
  return ACTIVE_SQL_MEETING_STATUSES.includes(normalized as (typeof ACTIVE_SQL_MEETING_STATUSES)[number]);
};

export const buildHubspotRecordingUrl = (hubspotEngagementId?: string | null) => {
  if (!hubspotEngagementId) return null;

  return `https://api-na2.hubspot.com/recording/auth/provider/hublets/v1/external-url-retriever/getAuthRecording/portal/243030925/engagement/${hubspotEngagementId}`;
};

export const getRecordingUrlWithFallback = ({
  recordingUrl,
  hubspotEngagementId,
}: {
  recordingUrl?: string | null;
  hubspotEngagementId?: string | null;
}) => {
  if (recordingUrl && recordingUrl.trim().length > 0) return recordingUrl;
  return buildHubspotRecordingUrl(hubspotEngagementId);
};