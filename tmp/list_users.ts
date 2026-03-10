import 'dotenv/config';
import pg from 'pg';

async function listUsers() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const res = await pool.query('SELECT email, role, status FROM users');
        console.log('Users in database:', res.rows);
    } catch (err) {
        console.error('Error listing users:', err);
    } finally {
        await pool.end();
    }
}

listUsers();
