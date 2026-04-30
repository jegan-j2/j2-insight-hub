CREATE OR REPLACE FUNCTION public.get_team_heatmap(p_mode text, p_start_date date, p_end_date date, p_client_id text DEFAULT NULL::text)
 RETURNS TABLE(sdr_name text, client_id text, client_name text, period_key text, dials bigint, answered bigint, dms bigint, sqls bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.sdr_name,
    a.client_id,
    c.client_name,
    CASE p_mode
      WHEN 'hour'  THEN TO_CHAR(a.activity_date AT TIME ZONE 'Australia/Melbourne', 'HH24')
      WHEN 'day'   THEN TO_CHAR(DATE(a.activity_date AT TIME ZONE 'Australia/Melbourne'), 'YYYY-MM-DD')
      WHEN 'week'  THEN TO_CHAR(DATE_TRUNC('week', a.activity_date AT TIME ZONE 'Australia/Melbourne'), 'YYYY-MM-DD')
      WHEN 'month' THEN TO_CHAR(DATE_TRUNC('month', a.activity_date AT TIME ZONE 'Australia/Melbourne'), 'YYYY-MM')
    END AS period_key,
    COUNT(*) AS dials,
    COUNT(*) FILTER (WHERE a.call_outcome = 'connected') AS answered,
    COUNT(*) FILTER (WHERE a.is_decision_maker = true) AS dms,
    COUNT(DISTINCT s.id) FILTER (
      WHERE s.id IS NOT NULL
      AND s.meeting_status NOT IN ('cancelled', 'no_show')
    ) AS sqls
  FROM activity_log a
  LEFT JOIN clients c ON c.client_id = a.client_id
  LEFT JOIN sql_meetings s
    ON s.hubspot_engagement_id = a.hubspot_engagement_id
    AND s.sdr_name = a.sdr_name
  WHERE
    DATE(a.activity_date AT TIME ZONE 'Australia/Melbourne') BETWEEN p_start_date AND p_end_date
    AND (p_client_id IS NULL OR a.client_id = p_client_id)
  GROUP BY a.sdr_name, a.client_id, c.client_name, period_key
  ORDER BY a.sdr_name, period_key;
$function$;