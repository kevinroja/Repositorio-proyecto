const mysql = require('mysql2/promise');

class Database {
    constructor() {
        const sslConfig = process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false;

        this.pool = mysql.createPool({
            host:     process.env.DB_HOST     || 'localhost',
            user:     process.env.DB_USER     || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME     || 'gestion_costos',
            port:     parseInt(process.env.DB_PORT) || 4000,
            ssl:      sslConfig,
            waitForConnections:    true,
            connectionLimit:       10,
            enableKeepAlive:       true,
            keepAliveInitialDelay: 30000,
            idleTimeout:           60000,
            maxIdle:               5,
        });

        // Log de errores del pool sin crashear el servidor
        this.pool.on('connection', (conn) => {
            conn.on('error', (err) => {
                if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
                    console.warn('[DB] Conexión perdida, el pool reconectará automáticamente');
                }
            });
        });
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (err) {
            if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.warn('[DB] ECONNRESET en query, reintentando...');
                const [rows] = await this.pool.execute(sql, params);
                return rows;
            }
            throw err;
        }
    }

    async execute(sql, params = []) {
        try {
            const [result] = await this.pool.execute(sql, params);
            return result;
        } catch (err) {
            if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.warn('[DB] ECONNRESET en execute, reintentando...');
                const [result] = await this.pool.execute(sql, params);
                return result;
            }
            throw err;
        }
    }

    async getConnection() {
        return await this.pool.getConnection();
    }
}

module.exports = new Database();
