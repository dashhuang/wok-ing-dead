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
    // Frame rate per device. "fps" weights every frame equally; the medians are over runs.
    const devices =
      await sql`SELECT payload->>'release' AS release, d->>'kind' AS kind,
      COALESCE(NULLIF(d->>'model',''), CASE WHEN d->>'os' IN ('ios','ipados')
        THEN (d->>'screen') || '@' || (d->>'dpr') ELSE '' END) AS model,
      d->>'gpu' AS gpu, d->>'browser' AS browser, payload->>'quality' AS quality,
      count(*)::int AS runs, count(DISTINCT player_id)::int AS players,
      round(sum((pf->>'seconds')::numeric)/60,1) AS minutes,
      round(sum((pf->>'frames')::numeric)/nullif(sum((pf->>'seconds')::numeric),0),1) AS fps,
      round((percentile_cont(0.5) WITHIN GROUP (ORDER BY (pf->>'fps')::numeric))::numeric,1) AS median_run_fps,
      round((percentile_cont(0.5) WITHIN GROUP (ORDER BY (pf->>'p95')::numeric))::numeric,1) AS median_p95_ms,
      round(100*sum((pf->>'slow')::numeric)/nullif(sum((pf->>'frames')::numeric),0),1) AS slow_percent,
      round(sum((pf->>'hitches')::numeric)/nullif(sum((pf->>'seconds')::numeric)/60,0),2) AS hitches_per_minute,
      round(avg((pf->>'scale')::numeric),2) AS avg_scale,
      count(*) FILTER (WHERE (pf->>'autoDrops')::int > 0)::int AS auto_dropped_runs
      FROM play_run_results CROSS JOIN LATERAL (SELECT payload->'device' AS d, payload->'perf' AS pf) x
      WHERE first_seen >= now() - ${days} * interval '1 day'
      AND NOT (payload->>'test')::boolean AND (${release}='' OR payload->>'release'=${release})
      AND d IS NOT NULL AND (pf->>'frames')::int > 0
      GROUP BY 1,2,3,4,5,6 ORDER BY runs DESC, minutes DESC LIMIT 300`;
    // Minutes of play by how many zombies were alive, to see what crowd size costs.
    const fpsByZombies =
      await sql`SELECT payload->>'release' AS release, payload->'device'->>'kind' AS kind,
      payload->>'quality' AS quality,
      least(floor((m->>'zombies')::numeric/10)*10, 60)::int AS zombies,
      count(*)::int AS minutes, round(avg((m->>'fps')::numeric),1) AS fps,
      round(avg((m->>'slow')::numeric),1) AS slow_percent
      FROM play_run_results CROSS JOIN LATERAL jsonb_array_elements(payload->'perf'->'minutes') m
      WHERE first_seen >= now() - ${days} * interval '1 day'
      AND NOT (payload->>'test')::boolean AND (${release}='' OR payload->>'release'=${release})
      GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`;
    return res
      .status(200)
      .json({ days, groups, weapons, deathMinutes, devices, fpsByZombies });
  } catch {
    return res.status(503).end();
  }
}
