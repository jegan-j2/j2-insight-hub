CREATE OR REPLACE FUNCTION public.get_sdr_hourly_breakdown(
  p_sdr_name text,
  p_date date,
  p_client_id text DEFAULT NULL
)
RETURNS TABLE(
  hour integer,
  dials bigint,
  answered bigint,
  dms bigint,
  sqls_booked bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    DATE_PART('hour', a.activity_date AT TIME ZONE 'Australia/Melbourne')::INTEGER AS hour,
    COUNT(*) AS dials,
    COUNT(*) FILTER (WHERE a.call_outcome = 'connected') AS answered,
    COUNT(*) FILTER (WHERE a.is_decision_maker = true) AS dms,
    COUNT(DISTINCT s.id) AS sqls_booked
  FROM activity_log a
  LEFT JOIN sql_meetings s
    ON s.hubspot_engagement_id = a.hubspot_engagement_id
    AND s.meeting_status NOT IN ('cancelled', 'no_show')
  WHERE a.sdr_name = p_sdr_name
    AND (p_client_id IS NULL OR a.client_id = p_client_id)
    AND DATE(a.activity_date AT TIME ZONE 'Australia/Melbourne') = p_date
  GROUP BY 1
  ORDER BY 1;
$$;