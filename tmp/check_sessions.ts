import 'dotenv/config';
import pg from 'pg';

async function checkSessionsTable() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const tableRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
    `);
        console.log('Columns in sessions table:', tableRes.rows);

        const indexRes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'sessions'
    `);
        console.log('Indexes on sessions table:', indexRes.rows);

        const countRes = await pool.query('SELECT count(*) FROM sessions');
        console.log('Session count:', countRes.rows[0].count);

    } catch (err) {
        console.error('Error checking sessions table:', err);
    } finally {
        await pool.end();
    }
}

checkSessionsTable();
