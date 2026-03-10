import 'dotenv/config';
import pg from 'pg';

async function cleanupSessions() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('Dropping existing session tables and indexes...');
        await pool.query('DROP TABLE IF EXISTS session CASCADE');
        await pool.query('DROP TABLE IF EXISTS sessions CASCADE');
        await pool.query('DROP INDEX IF EXISTS "IDX_session_expire"');
        console.log('Cleanup successful.');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanupSessions();
