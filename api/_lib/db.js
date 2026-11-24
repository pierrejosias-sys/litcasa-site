'use strict';

/**
 * LitCasa — shared DB helpers for the Vercel serverless API.
 *
 * Uses @vercel/postgres. The `sql` tagged template reads POSTGRES_URL
 * from the environment at query time (Vercel injects it when a Postgres
 * database is linked to the project).
 *
 * No credentials are stored here and none are ever logged. If
 * POSTGRES_URL is missing, helpers throw a clear error that handlers
 * turn into a 500 — the module never crashes at require() time, so a
 * deploy without a linked database still boots and answers with JSON.
 *
 * Order IDs: LC-YYYYMMDD-NNN, sequential per calendar day, generated
 * transactionally from the `order_counters` table (order_date date PK,
 * counter integer) with SELECT ... FOR UPDATE. The caller MUST call
 * getDailyOrderId() inside withTransaction() — FOR UPDATE only locks
 * the row for the duration of the surrounding transaction.
 *
 * NOTE (schema workstream): schema.sql also defines a DB function
 * next_order_id() that does the same increment via INSERT ... ON
 * CONFLICT DO UPDATE. This module deliberately follows the task spec
 * (SELECT ... FOR UPDATE) instead; both write the same table in the
 * same format, so they are interchangeable — do not mix the two in
 * one checkout path.
 */

const postgres = require('@vercel/postgres');

// `sql` is the one-shot, auto-pooled tagged template.
// `db` (when present) is the pool used for multi-query / transactions.
const sql = postgres.sql;
const db = postgres.db;

/** True when a Postgres connection string is configured. */
function isDbConfigured() {
  return Boolean(process.env.POSTGRES_URL);
}

/**
 * Throw a plain Error when the DB is not configured. Handlers catch
 * this and return 500 { error: 'Database not configured' }.
 * The message names the missing env var only — never its value.
 */
function assertDbConfigured() {
  if (!isDbConfigured()) {
    const err = new Error(
      'Database not configured: POSTGRES_URL is not set. ' +
        'Link a Vercel Postgres database to this project and redeploy.'
    );
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
}

/**
 * Resolve the tagged-template query function from whatever the caller
 * passed as `client`:
 *   - a function            -> the `sql` tagged template itself
 *   - { sql: fn }           -> a connected client (client.sql)
 *   - { query: fn }         -> a raw pg-style client (not expected here)
 *   - null / undefined      -> the module-level `sql`
 */
function resolveSql(client) {
  if (!client) return sql;
  if (typeof client === 'function') return client;
  if (typeof client.sql === 'function') return client.sql;
  return sql;
}

/**
 * Format a Date / 'YYYY-MM-DD' string as YYYYMMDD.
 */
function toYyyymmdd(value) {
  const d = value instanceof Date ? value : new Date(value);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Atomically reserve the next order id for today and return it,
 * e.g. 'LC-20261124-001'.
 *
 * MUST be called inside a transaction (see withTransaction). Uses the
 * database's CURRENT_DATE for the counter day so the id day matches
 * the DB server's calendar day (same day next_order_id() in schema.sql
 * uses), not the function host's local clock.
 *
 * Algorithm (SELECT ... FOR UPDATE, per spec):
 *   1. Read today's counter row with FOR UPDATE (locks it).
 *   2. If no row exists, INSERT counter = 1. A concurrent checkout
 *      may have inserted the row first — on a unique-violation,
 *      re-read the row FOR UPDATE and increment instead.
 *   3. Otherwise UPDATE counter = counter + 1.
 * Returns the formatted id. The counter row stays locked until the
 * surrounding transaction COMMITs, so two concurrent checkouts
 * cannot receive the same number.
 *
 * @param {Function|Object} [client] - transaction client (client.sql),
 *   the `sql` tagged template itself, or omitted for module `sql`.
 * @returns {Promise<string>} e.g. 'LC-20261124-001'
 */
async function getDailyOrderId(client) {
  assertDbConfigured();
  const exec = resolveSql(client);

  // Day comes from the DB, not the host clock.
  const { rows: dateRows } = await exec`SELECT CURRENT_DATE AS today`;
  const today = dateRows[0].today; // 'YYYY-MM-DD' (or a Date)
  const yyyymmdd = toYyyymmdd(today);

  // Lock today's counter row for the rest of this transaction.
  const { rows } = await exec`
    SELECT counter FROM order_counters
    WHERE order_date = ${today}
    FOR UPDATE
  `;

  let counter;
  if (rows.length === 0) {
    try {
      const inserted = await exec`
        INSERT INTO order_counters (order_date, counter)
        VALUES (${today}, 1)
        RETURNING counter
      `;
      counter = inserted.rows[0].counter;
    } catch (err) {
      // 23505 = unique_violation: another checkout inserted the row
      // between our SELECT and INSERT. Re-lock it and increment.
      if (err && err.code === '23505') {
        const locked = await exec`
          SELECT counter FROM order_counters
          WHERE order_date = ${today}
          FOR UPDATE
        `;
        counter = locked.rows[0].counter + 1;
        await exec`
          UPDATE order_counters SET counter = ${counter}
          WHERE order_date = ${today}
        `;
      } else {
        throw err;
      }
    }
  } else {
    counter = rows[0].counter + 1;
    await exec`
      UPDATE order_counters SET counter = ${counter}
      WHERE order_date = ${today}
    `;
  }

  return `LC-${yyyymmdd}-${String(counter).padStart(3, '0')}`;
}

/**
 * Run `handler(txSql)` inside a single DB transaction and return its
 * result. `txSql` is the tagged-template query function bound to the
 * transaction's connection — pass it (or { sql: txSql }) to
 * getDailyOrderId() and use it for every query in the handler.
 *
 * Uses db.connect() (preferred) or sql.connect() when available;
 * both give a dedicated client with BEGIN / COMMIT / ROLLBACK and a
 * client.release() in `finally` so pooled connections are not leaked.
 * If neither connect method exists (older @vercel/postgres), falls
 * back to running the handler on the shared `sql` pool — queries
 * still run, but they are NOT transactional in that fallback.
 *
 * @param {(txSql: Function) => Promise<any>} handler
 */
async function withTransaction(handler) {
  assertDbConfigured();

  const pool = db || sql;
  const connect =
    pool && typeof pool.connect === 'function' ? pool.connect.bind(pool) : null;

  if (!connect) {
    // Fallback: no dedicated client available. Documented, not silent.
    return handler(sql);
  }

  const client = await connect();
  try {
    await client.sql`BEGIN`;
    const result = await handler(client.sql);
    await client.sql`COMMIT`;
    return result;
  } catch (err) {
    try {
      await client.sql`ROLLBACK`;
    } catch (_rollbackErr) {
      // ROLLBACK failing must not mask the original error.
    }
    throw err;
  } finally {
    if (typeof client.release === 'function') client.release();
  }
}

module.exports = { sql, db, isDbConfigured, assertDbConfigured, getDailyOrderId, withTransaction };
