import { database } from "../server/telemetry/db.js";
import { authorized, noCache } from "../server/telemetry/http.js";
export default async function handler(req, res) {
  noCache(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  if (!authorized(req)) return res.status(401).end();
  const days = Number(req.query?.days || 7);
  if (!Number.isInteger(days) || days < 1 || days > 90)
    return res.status(400).end();
  const release = String(req.query?.release || "");
  try {
    const sql = database();
    const groups = await sql`SELECT payload->>'release' AS release,
      payload->>'stage' AS stage, payload->>'mode' AS mode, CASE WHEN payload->>'difficultyChanged'='true' THEN 'mixed' ELSE payload->>'difficulty' END AS difficulty,
      count(*)::int AS runs, count(DISTINCT player_id)::int AS players,
      count(*) FILTER (WHERE outcome='complete')::int AS clears,
      count(*) FILTER (WHERE outcome='dead')::int AS deaths,
      count(*) FILTER (WHERE outcome='interrupted')::int AS interrupted,
      count(*) FILTER (WHERE outcome IN ('restart','quit'))::int AS abandoned,
      count(*) FILTER (WHERE outcome='active')::int AS active,
      round(avg((payload->>'duration')::numeric) FILTER (WHERE outcome IN ('dead','complete')),1) AS avg_finished_seconds,
      round(avg((payload->>'duration')::numeric) FILTER (WHERE outcome='dead'),1) AS avg_death_seconds,
      round(100.0 * count(*) FILTER (WHERE outcome='complete') / nullif(count(*) FILTER (WHERE outcome IN ('dead','complete')),0),1) AS completion_percent
      FROM play_run_results WHERE first_seen >= now() - ${days} * interval '1 day'
      AND NOT (payload->>'test')::boolean AND (${release}='' OR payload->>'release'=${release})
      GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`;
    const weapons =
      await sql`SELECT payload->>'release' AS release, CASE WHEN payload->>'difficultyChanged'='true' THEN 'mixed' ELSE payload->>'difficulty' END AS difficulty,
      payload->>'stage' AS stage, payload->>'mode' AS mode, w->>'id' AS weapon, count(*)::int AS runs_carrying,
      count(*) FILTER (WHERE outcome='complete')::int AS clears,
      count(*) FILTER (WHERE outcome='dead')::int AS deaths,
      round(avg((w->>'level')::numeric),2) AS avg_level
      FROM play_run_results CROSS JOIN LATERAL jsonb_array_elements(payload->'weapons') w
      WHERE first_seen >= now() - ${days} * interval '1 day'
      AND NOT (payload->>'test')::boolean AND (${release}='' OR payload->>'release'=${release})
      GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,6 DESC`;
    const deathMinutes =
      await sql`SELECT payload->>'release' AS release, CASE WHEN payload->>'difficultyChanged'='true' THEN 'mixed' ELSE payload->>'difficulty' END AS difficulty,
      payload->>'stage' AS stage, payload->>'mode' AS mode,
      floor((payload->>'duration')::numeric/60)::int AS minute, count(*)::int AS deaths
      FROM play_run_results WHERE first_seen >= now() - ${days} * interval '1 day'
      AND NOT (payload->>'test')::boolean AND outcome='dead'
      AND (${release}='' OR payload->>'release'=${release}) GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5`;
    return res.status(200).json({ days, groups, weapons, deathMinutes });
  } catch {
    return res.status(503).end();
  }
}
