/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
// =============================================================================
// DVYS Bot — Database Connection Pool (PostgreSQL)
// =============================================================================
// Wraps the `pg` Pool with a single-connection limit suitable for serverless
// (Vercel) deployments.  The exported `query()` helper acquires a client,
// runs the statement, and releases the client in a `finally` block so leaks
// are impossible.
// =============================================================================

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 1, // Single connection — ideal for Vercel serverless functions
});

/**
 * Execute a parameterised SQL query and return the rows array.
 *
 * @param {string} text   - SQL statement (use $1, $2 … for parameters).
 * @param {any[]}  params - Bind-parameter values.
 * @returns {Promise<object[]>} Resolved rows.
 */
async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export { query, pool };
