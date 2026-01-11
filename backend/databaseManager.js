
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("❌ ERRO CRÍTICO: DATABASE_URL não definida no ambiente.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 20
});

const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        if (!error.message.includes('already exists')) {
            console.error(`❌ DB Query Error [${text.substring(0, 100)}...]:`, error.message);
        }
        throw error;
    }
};

const toUuid = (val) => {
    if (!val || val === "" || val === "undefined" || val === "null") return null;
    return val;
};

const ensureColumn = async (table, column, typeDefinition) => {
    try {
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
        `, [table, column]);
        
        if (res.rows.length === 0) {
            console.log(`🔧 Adding column ${column} to ${table}...`);
            await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDefinition}`);
            return true;
        }
    } catch (e) {
        console.error(`Error ensuring column ${column} in ${table}:`, e.message);
    }
    return false;
};

const ensureUniqueConstraint = async (table, constraintName, columnsArray) => {
    try {
        const checkRes = await query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = $1 AND constraint_name = $2
        `, [table, constraintName]);

        if (checkRes.rows.length === 0) {
            console.log(`🔧 Creating unique constraint ${constraintName} on ${table}...`);
            const cols = columnsArray.join(', ');
            await query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT ${constraintName} UNIQUE (${cols})
            `);
            console.log(`✅ Constraint ${constraintName} added to ${table}.`);
        }
    } catch (e) {
        if (!e.message.includes('already exists')) {
            console.error(`Error adding constraint to ${table}:`, e.message);
        }
    }
};

export const dbManager = {
    async init() {
        console.log("🔄 DB: Inicializando Schema...");
        try {
            await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

            // 1. Users
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    email TEXT UNIQUE NOT NULL, 
                    password TEXT, 
                    google_id TEXT UNIQUE,
                    data JSONB, 
                    referred_by_id UUID,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureColumn('users', 'referred_by_id', 'UUID');
            await ensureColumn('users', 'google_id', 'TEXT UNIQUE');

            // 2. Groups
            await query(`
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY, 
                    creator_id UUID NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureColumn('groups', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

            // 3. Posts
            await query(`
                CREATE TABLE IF NOT EXISTS posts (
                    id TEXT PRIMARY KEY, 
                    author_id UUID NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 4. Interactions
            await query(`
                CREATE TABLE IF NOT EXISTS interactions (
                    id SERIAL PRIMARY KEY,
                    post_id TEXT NOT NULL,
                    user_id UUID NOT NULL,
                    type TEXT NOT NULL, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureUniqueConstraint('interactions', 'interactions_post_user_type_unique', ['post_id', 'user_id', 'type']);

            // 5. Chats
            await query(`
                CREATE TABLE IF NOT EXISTS chats (
                    id TEXT PRIMARY KEY, 
                    data JSONB, 
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureColumn('chats', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

            // 6. Marketplace
            await query(`
                CREATE TABLE IF NOT EXISTS marketplace (
                    id TEXT PRIMARY KEY, 
                    seller_id UUID NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 7. Relationships (With structural validation)
            const checkRelTable = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'relationships' AND column_name = 'id'
            `);
            
            // If table exists but has no ID column, drop it to fix the structure
            if (checkRelTable.rows.length === 0) {
                const tableExists = await query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'relationships'`);
                if (tableExists.rows.length > 0) {
                    console.log("⚠️ Structural mismatch in relationships table. Recreating...");
                    await query(`DROP TABLE relationships`);
                }
            }

            await query(`
                CREATE TABLE IF NOT EXISTS relationships (
                    id TEXT PRIMARY KEY, 
                    follower_id UUID NOT NULL, 
                    following_id UUID NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureColumn('relationships', 'status', "TEXT DEFAULT 'accepted'");

            // 8. Notifications
            await query(`
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY, 
                    recipient_id UUID NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 9. VIP Access
            await query(`
                CREATE TABLE IF NOT EXISTS vip_access (
                    id TEXT PRIMARY KEY, 
                    user_id UUID NOT NULL, 
                    group_id TEXT NOT NULL, 
                    data JSONB, 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 10. Financial
            await query(`
                CREATE TABLE IF NOT EXISTS financial_transactions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL,
                    type TEXT,
                    amount NUMERIC(10,2),
                    status TEXT,
                    provider_tx_id TEXT,
                    data JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await ensureColumn('financial_transactions', 'currency', "TEXT DEFAULT 'BRL'");

            // 11. IP History
            await query(`
                CREATE TABLE IF NOT EXISTS user_ip_history (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL,
                    ip TEXT NOT NULL,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 12. Ads
            await query(`
                CREATE TABLE IF NOT EXISTS ads (
                    id TEXT PRIMARY KEY,
                    owner_id UUID NOT NULL,
                    data JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // 13. Reports
            await query(`
                CREATE TABLE IF NOT EXISTS reports (
                    id SERIAL PRIMARY KEY, 
                    target_id UUID NOT NULL, 
                    reporter_id UUID, 
                    reason TEXT NOT NULL, 
                    status TEXT DEFAULT 'pending', 
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports (target_id)`);

            // 14. Global Settings (Fees, limits, etc)
            await query(`
                CREATE TABLE IF NOT EXISTS platform_settings (
                    key TEXT PRIMARY KEY,
                    value JSONB,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Seed default fees if not exists
            await query(`
                INSERT INTO platform_settings (key, value) 
                VALUES ('fees', '{"sale_fee_type": "percent", "sale_fee_value": 10, "withdrawal_fee": 5.00}'::jsonb)
                ON CONFLICT (key) DO NOTHING
            `);

            console.log("✅ DB: Estrutura validada.");
        } catch (e) {
            console.error("❌ DB: Falha na inicialização estrutural:", e.message);
        }
    },

    settings: {
        async getFees() {
            const res = await query("SELECT value FROM platform_settings WHERE key = 'fees'");
            return res.rows[0]?.value || { sale_fee_type: "percent", sale_fee_value: 10, withdrawal_fee: 5.00 };
        },
        async updateFees(newFees) {
            await query(
                "UPDATE platform_settings SET value = $1, updated_at = NOW() WHERE key = 'fees'",
                [JSON.stringify(newFees)]
            );
            return true;
        }
    },

    reports: {
        async create({ targetId, reporterId, reason }) {
            const tUuid = toUuid(targetId);
            const rUuid = toUuid(reporterId);
            if (!tUuid) throw new Error("ID do alvo é inválido");

            await query(
                `INSERT INTO reports (target_id, reporter_id, reason, status) 
                 VALUES ($1, $2, $3, 'pending')`,
                [tUuid, rUuid, reason]
            );

            await query(
                `UPDATE users SET data = data || '{"isReported": true}'::jsonb WHERE id = $1`,
                [tUuid]
            );
            return true;
        }
    },

    users: {
        async findByEmail(email) {
            if (!email) return null;
            const res = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
            if (res.rows.length > 0) {
                const row = res.rows[0];
                let data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return { ...data, id: row.id, email: row.email, googleId: row.google_id, referredById: row.referred_by_id };
            }
            return null;
        },
        async findByGoogleId(googleId) {
            if (!googleId) return null;
            const res = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
            if (res.rows.length > 0) {
                const row = res.rows[0];
                let data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return { ...data, id: row.id, email: row.email, googleId: row.google_id, referredById: row.referred_by_id };
            }
            return null;
        },
        async findById(id) {
            const uuid = toUuid(id);
            if (!uuid) return null;
            const res = await query('SELECT * FROM users WHERE id = $1', [uuid]);
            if (res.rows.length > 0) {
                const row = res.rows[0];
                let data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return { ...data, id: row.id, email: row.email, googleId: row.google_id, referredById: row.referred_by_id };
            }
            return null;
        },
        async create(user) {
            const { id, email, password, googleId, referredById, ...userData } = user;
            const res = await query(
                `INSERT INTO users (email, password, google_id, referred_by_id, data) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id`,
                [email.toLowerCase().trim(), password, googleId || null, toUuid(referredById), JSON.stringify(userData)]
            );
            return res.rows[0].id;
        },
        async update(user) {
            const { id, email, password, googleId, referredById, ...userData } = user;
            const uuid = toUuid(id);
            if (!uuid) return false;

            if (password) {
                await query(`UPDATE users SET password = $1, google_id = $2, data = $3 WHERE id = $4`, [password, googleId || null, JSON.stringify(userData), uuid]);
            } else {
                await query(`UPDATE users SET google_id = $1, data = $2 WHERE id = $3`, [googleId || null, JSON.stringify(userData), uuid]);
            }
            return true;
        },
        async getAll() {
            const res = await query('SELECT * FROM users LIMIT 1000', []);
            return res.rows.map(row => {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return {
                    ...data,
                    id: row.id, 
                    email: row.email, 
                    googleId: row.google_id
                };
            });
        }
    },

    groups: {
        async create(group) {
            const creatorUuid = toUuid(group.creatorId);
            if (!creatorUuid) throw new Error("ID do criador inválido");

            await query(`
                INSERT INTO groups (id, creator_id, data, updated_at) 
                VALUES ($1, $2, $3, NOW()) 
                ON CONFLICT (id) DO UPDATE SET data = $3, creator_id = $2, updated_at = NOW()
            `, [group.id, creatorUuid, JSON.stringify(group)]);
            return true;
        },
        async findById(id) {
            const res = await query('SELECT * FROM groups WHERE id = $1', [id]);
            if (res.rows.length > 0) {
                const row = res.rows[0];
                return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            }
            return null;
        },
        async list() {
            const res = await query('SELECT * FROM groups ORDER BY updated_at DESC', []);
            return res.rows.map(r => {
                return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
            });
        },
        async ranking(type = 'public') {
            let filter = '';
            if (type === 'vip') {
                filter = "WHERE (data->>'isVip')::boolean = true";
            } else if (type === 'private') {
                filter = "WHERE (data->>'isPrivate')::boolean = true AND (data->>'isVip')::boolean = false";
            } else {
                filter = "WHERE (data->>'isPrivate')::boolean = false AND (data->>'isVip')::boolean = false";
            }

            const sql = `
                SELECT *, jsonb_array_length(COALESCE(data->'memberIds', '[]'::jsonb)) as member_count
                FROM groups
                ${filter}
                ORDER BY member_count DESC
                LIMIT 100
            `;
            const res = await query(sql);
            return res.rows.map(r => {
                return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
            });
        },
        async update(group) {
            await query(`UPDATE groups SET data = $2, updated_at = NOW() WHERE id = $1`, [group.id, JSON.stringify(group)]);
            return true;
        },
        async updateActivity(groupId) {
            await query(`UPDATE groups SET updated_at = NOW() WHERE id = $1`, [groupId]);
        },
        async delete(id) {
            await query('DELETE FROM groups WHERE id = $1', [id]);
            return true;
        }
    },

    posts: {
        async create(post) {
            const authorUuid = toUuid(post.authorId);
            if (!authorUuid) throw new Error("ID do autor inválido para post");

            await query(`
                INSERT INTO posts (id, author_id, data) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (id) DO UPDATE SET data = $3, author_id = $2
            `, [post.id, authorUuid, JSON.stringify(post)]);
            return true;
        },
        async list(limit = 50, cursor = null) {
            let sql = 'SELECT * FROM posts';
            let params = [limit];
            if (cursor) {
                sql += ' WHERE created_at < $2 ORDER BY created_at DESC LIMIT $1';
                params.push(new Date(Number(cursor)));
            } else {
                sql += ' ORDER BY created_at DESC LIMIT $1';
            }
            const res = await query(sql, params);
            return res.rows.map(r => {
                const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                return { 
                    ...data, 
                    authorId: r.author_id,
                    timestamp: new Date(r.created_at).getTime()
                };
            });
        },
        async delete(id) {
            await query('DELETE FROM interactions WHERE post_id = $1', [id]);
            await query('DELETE FROM posts WHERE id = $1', [id]);
            return true;
        },
        async addComment(postId, comment) {
            await query(`
                UPDATE posts 
                SET data = jsonb_set(
                    jsonb_set(
                        data, 
                        '{commentsList}', 
                        COALESCE(data->'commentsList', '[]'::jsonb) || $2::jsonb
                    ),
                    '{comments}',
                    ((COALESCE(data->>'comments', '0')::int) + 1)::text::jsonb
                )
                WHERE id = $1
            `, [postId, JSON.stringify(comment)]);
            return true;
        },
        async addReply(postId, commentId, reply) {
            const res = await query('SELECT data FROM posts WHERE id = $1', [postId]);
            if (res.rows.length === 0) return false;
            
            let data = res.rows[0].data;
            if (typeof data === 'string') data = JSON.parse(data);

            const findAndAdd = (list) => {
                for (let c of list) {
                    if (c.id === commentId) {
                        c.replies = [...(c.replies || []), reply];
                        return true;
                    }
                    if (c.replies && findAndAdd(c.replies)) return true;
                }
                return false;
            };

            if (data.commentsList && findAndAdd(data.commentsList)) {
                data.comments = (data.comments || 0) + 1;
                await query('UPDATE posts SET data = $2 WHERE id = $1', [postId, JSON.stringify(data)]);
                return true;
            }
            return false;
        }
    },

    chats: {
        async findPrivate(email) {
            const sql = `
                SELECT * FROM chats 
                WHERE id LIKE '%@%' AND id LIKE $1 
                ORDER BY updated_at DESC
            `;
            const res = await query(sql, [`%${email}%`]);
            return res.rows.map(row => {
                return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
            });
        },
        async findById(id) {
            const res = await query('SELECT * FROM chats WHERE id = $1', [id]);
            if (res.rows.length > 0) {
                return typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
            }
            return null;
        },
        async set(chat) {
            await query(`
                INSERT INTO chats (id, data, updated_at) 
                VALUES ($1, $2, NOW()) 
                ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
            `, [chat.id, JSON.stringify(chat)]);
        },
        async delete(id) {
            await query('DELETE FROM chats WHERE id = $1', [id]);
            return true;
        }
    },

    vip: {
        async grantAccess(userId, groupId, status = 'active', metadata = {}) {
            const uUuid = toUuid(userId);
            if (!uUuid) throw new Error("ID de usuário inválido para VIP");
            
            const accessId = `${userId}_${groupId}`;
            const data = { status, ...metadata };
            
            await query(`
                INSERT INTO vip_access (id, user_id, group_id, data)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET data = $4
            `, [accessId, uUuid, groupId, JSON.stringify(data)]);
            
            // Também adiciona o usuário à lista de membros do grupo se for entrada automática
            await query(`
                UPDATE groups 
                SET data = jsonb_set(
                    data, 
                    '{memberIds}', 
                    COALESCE(data->'memberIds', '[]'::jsonb) || $2::jsonb
                )
                WHERE id = $1 AND NOT (data->'memberIds' ? $3)
            `, [groupId, JSON.stringify(userId), userId]);
            
            return true;
        }
    },

    financial: {
        async recordTransaction({ userId, type, amount, status, providerTxId, currency = 'BRL', data = {} }) {
            const uUuid = toUuid(userId);
            if (!uUuid) throw new Error("ID de usuário inválido para transação");

            const res = await query(`
                INSERT INTO financial_transactions (user_id, type, amount, status, provider_tx_id, currency, data)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [uUuid, type, amount, status, providerTxId, currency, JSON.stringify(data)]);
            
            return res.rows[0].id;
        }
    },

    interactions: {
        async record(postId, userId, type) {
            const userUuid = toUuid(userId);
            if (!userUuid) return; 

            await query(`
                INSERT INTO interactions (post_id, user_id, type) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (post_id, user_id, type) DO NOTHING
            `, [postId, userUuid, type]);

            if (type === 'like' || type === 'view') {
                const column = type === 'like' ? 'likes' : 'views';
                const arrayColumn = type === 'like' ? 'likedByIds' : 'viewedByIds';

                await query(`
                    UPDATE posts 
                    SET data = jsonb_set(
                        jsonb_set(
                            data, 
                            '{${column}}', 
                            (SELECT count(*) FROM interactions WHERE post_id = $1 AND type = $2)::text::jsonb
                        ),
                        '{${arrayColumn}}',
                        (SELECT json_agg(user_id) FROM interactions WHERE post_id = $1 AND type = $2)::jsonb
                    )
                    WHERE id = $1
                `, [postId, type]);
            }
        }
    },

    relationships: {
        async create(rel) {
            const f1 = toUuid(rel.followerId);
            const f2 = toUuid(rel.followingId);
            if (!f1 || !f2) return;

            const id = `${rel.followerId}_${rel.followingId}`;
            await query(`
                INSERT INTO relationships (id, follower_id, following_id, status, data) 
                VALUES ($1, $2, $3, $4, $5) 
                ON CONFLICT (id) DO UPDATE SET status = $4, data = $5
            `, [id, f1, f2, rel.status || 'accepted', JSON.stringify(rel)]);
        },
        async delete(followerId, followingId) {
            const f1 = toUuid(followerId);
            const f2 = toUuid(followingId);
            if (!f1 || !f2) return;
            await query('DELETE FROM relationships WHERE follower_id = $1 AND following_id = $2', [f1, f2]);
        },
        async findByFollower(followerId) {
            const fUuid = toUuid(followerId);
            if (!fUuid) return [];
            const res = await query('SELECT data FROM relationships WHERE follower_id = $1', [fUuid]);
            return res.rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
        },
        async getTopCreators() {
            const sql = `
                SELECT u.id, u.data, COUNT(r.id) as follower_count
                FROM users u
                LEFT JOIN relationships r ON u.id = r.following_id AND r.status = 'accepted'
                GROUP BY u.id
                ORDER BY follower_count DESC
                LIMIT 50
            `;
            const res = await query(sql);
            return res.rows.map(row => {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return {
                    ...data,
                    id: row.id,
                    followerCount: parseInt(row.follower_count)
                };
            });
        }
    },

    marketplace: {
        async delete(id) {
            await query('DELETE FROM marketplace WHERE id = $1', [id]);
            return true;
        }
    },

    admin: {
        async getTotalUsers() {
            const res = await query('SELECT count(*) FROM users');
            return parseInt(res.rows[0].count);
        },
        async getReportedUsersCount() {
            const res = await query("SELECT count(*) FROM users WHERE data->>'isReported' = 'true'");
            return parseInt(res.rows[0].count);
        },
        async getFeedPostsCount() {
            const res = await query("SELECT count(*) FROM posts WHERE data->>'type' != 'video'");
            return parseInt(res.rows[0].count);
        },
        async getReelsCount() {
            const res = await query("SELECT count(*) FROM posts WHERE data->>'type' = 'video'");
            return parseInt(res.rows[0].count);
        },
        async getMarketplaceCount() {
            const res = await query('SELECT count(*) FROM marketplace');
            return parseInt(res.rows[0].count);
        },
        async getGroupsCount() {
            const res = await query('SELECT count(*) FROM groups');
            return parseInt(res.rows[0].count);
        },

        async getSellersStats() {
            const sellersRes = await query(`
                SELECT count(*) FROM users 
                WHERE (data->'paymentConfig'->>'isConnected')::boolean = true
                   OR (data->'paymentConfigs'->'paypal'->>'isConnected')::boolean = true
            `);
            const totalSellers = parseInt(sellersRes.rows[0].count);

            const activeRes = await query(`
                SELECT count(DISTINCT user_id) FROM financial_transactions 
                WHERE status IN ('paid', 'completed', 'approved', 'settled')
            `);
            const activeSellers = parseInt(activeRes.rows[0].count);

            return {
                total: totalSellers,
                active: activeSellers,
                inactive: Math.max(0, totalSellers - activeSellers)
            };
        },

        async getFinancialStats() {
            const periods = {
                today: "created_at >= CURRENT_DATE",
                yesterday: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
                days30: "created_at >= NOW() - INTERVAL '30 days'",
                days60: "created_at >= NOW() - INTERVAL '60 days'",
                days180: "created_at >= NOW() - INTERVAL '180 days'",
                total: "1=1"
            };

            const stats = {};

            for (const [key, filter] of Object.entries(periods)) {
                const res = await query(`
                    SELECT 
                        COALESCE(currency, 'BRL') as currency, 
                        SUM(amount) as total_volume,
                        COUNT(*) as sales_count
                    FROM financial_transactions 
                    WHERE status IN ('paid', 'completed', 'approved', 'settled')
                      AND ${filter}
                    GROUP BY currency
                `);
                
                const periodData = {
                    volume: { BRL: 0, USD: 0, EUR: 0 },
                    total_sales_count: 0
                };

                res.rows.forEach(row => {
                    const curr = row.currency;
                    const vol = parseFloat(row.total_volume || 0);
                    const count = parseInt(row.sales_count || 0);

                    periodData.volume[curr] = vol;
                    periodData.total_sales_count += count;
                });

                stats[key] = periodData;
            }

            return stats;
        },

        async getAverageTicketStats() {
            const periods = {
                today: "created_at >= CURRENT_DATE",
                yesterday: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
                days30: "created_at >= NOW() - INTERVAL '30 days'",
                days60: "created_at >= NOW() - INTERVAL '60 days'",
                days180: "created_at >= NOW() - INTERVAL '180 days'",
                total: "1=1"
            };

            const stats = {};

            for (const [key, filter] of Object.entries(periods)) {
                const res = await query(`
                    SELECT 
                        COALESCE(currency, 'BRL') as currency, 
                        AVG(amount) as average_ticket
                    FROM financial_transactions 
                    WHERE status IN ('paid', 'completed', 'approved', 'settled')
                      AND ${filter}
                    GROUP BY currency
                `);
                
                const periodData = { BRL: 0, USD: 0, EUR: 0 };

                res.rows.forEach(row => {
                    const curr = row.currency;
                    const avg = parseFloat(row.average_ticket || 0);
                    periodData[curr] = avg;
                });

                stats[key] = periodData;
            }

            return stats;
        },

        async getProviderStats() {
            const res = await query(`
                SELECT 
                    COALESCE(data->>'providerId', 'syncpay') as provider,
                    COUNT(*) as count
                FROM financial_transactions 
                WHERE status IN ('paid', 'completed', 'approved', 'settled')
                GROUP BY data->>'providerId'
            `);

            let total = 0;
            const rawStats = res.rows.map(row => {
                const count = parseInt(row.count);
                total += count;
                return {
                    name: row.provider.toUpperCase(),
                    count: count
                };
            });

            const expected = ['SYNCPAY', 'PAYPAL', 'STRIPE'];
            const finalStats = expected.map(name => {
                const existing = rawStats.find(s => s.name === name);
                const count = existing ? existing.count : 0;
                const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
                return { name, count, percentage };
            });

            return {
                total_sales: total,
                providers: finalStats
            };
        },

        async banUser(id, reason) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query('SELECT data FROM users WHERE id = $1', [uuid]);
            if (res.rows.length === 0) throw new Error("Usuário não encontrado");
            let data = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
            data.isBanned = true;
            data.banReason = reason;
            await query('UPDATE users SET data = $1 WHERE id = $2', [JSON.stringify(data), uuid]);
            return true;
        },
        async unbanUser(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query('SELECT data FROM users WHERE id = $1', [uuid]);
            if (res.rows.length === 0) throw new Error("Usuário não encontrado");
            let data = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
            data.isBanned = false;
            delete data.banReason;
            await query('UPDATE users SET data = $1 WHERE id = $2', [JSON.stringify(data), uuid]);
            return true;
        },
        async updateMetadata(id, { displayName, username, bio }) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query('SELECT data FROM users WHERE id = $1', [uuid]);
            if (res.rows.length === 0) throw new Error("Usuário não encontrado");
            let data = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
            
            const updatedFields = [];
            if (!data.profile) data.profile = {};

            if (displayName !== undefined) {
                data.profile.nickname = displayName;
                updatedFields.push("displayName");
            }
            if (username !== undefined) {
                data.profile.name = username.toLowerCase().replace('@', '');
                updatedFields.push("username");
            }
            if (bio !== undefined) {
                data.profile.bio = bio;
                updatedFields.push("bio");
            }

            await query('UPDATE users SET data = $1 WHERE id = $2', [JSON.stringify(data), uuid]);
            return updatedFields;
        },
        async recordIp(userId, ip, userAgent) {
            const uuid = toUuid(userId);
            if (!uuid) return;
            await query(
                'INSERT INTO user_ip_history (user_id, ip, user_agent) VALUES ($1, $2, $3)',
                [uuid, ip, userAgent]
            );
        },
        async getUserIpHistory(id) {
            const uuid = toUuid(id);
            if (!uuid) return [];
            const res = await query(
                'SELECT ip, user_agent, created_at FROM user_ip_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
                [uuid]
            );
            return res.rows;
        },
        async updateStrikes(id, count) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query('SELECT data FROM users WHERE id = $1', [uuid]);
            if (res.rows.length === 0) throw new Error("Usuário não encontrado");
            let data = typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
            data.strikes = count;
            await query('UPDATE users SET data = $1 WHERE id = $2', [JSON.stringify(data), uuid]);
            return true;
        },

        async getUsersList() {
            const sql = `
                SELECT 
                    u.id, 
                    u.email, 
                    u.google_id, 
                    u.created_at, 
                    u.data,
                    (SELECT ip FROM user_ip_history WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_ip,
                    (SELECT count(*) FROM posts WHERE author_id = u.id AND data->>'type' != 'video') as posts_count,
                    (SELECT count(*) FROM posts WHERE author_id = u.id AND data->>'type' = 'video') as reels_count,
                    (SELECT count(*) FROM marketplace WHERE seller_id = u.id) as marketplace_count,
                    (SELECT count(*) FROM groups WHERE creator_id = u.id) as groups_count
                FROM users u
                ORDER BY u.created_at DESC
            `;
            const res = await query(sql);
            return res.rows.map(row => {
                const userData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                return {
                    id: row.id,
                    email: row.email,
                    googleId: row.google_id,
                    createdAt: row.created_at,
                    lastIp: row.last_ip,
                    stats: {
                        posts: parseInt(row.posts_count),
                        reels: parseInt(row.reels_count),
                        marketItems: parseInt(row.marketplace_count),
                        groups: parseInt(row.groups_count)
                    },
                    ...userData
                };
            });
        },

        async getUserInsights(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            
            const userRes = await query('SELECT * FROM users WHERE id = $1', [uuid]);
            if (userRes.rows.length === 0) throw new Error("Usuário não encontrado");
            const userRow = userRes.rows[0];
            const userData = typeof userRow.data === 'string' ? JSON.parse(userRow.data) : userRow.data;

            const feedPosts = await query("SELECT count(*) FROM posts WHERE author_id = $1 AND data->>'type' != 'video'", [uuid]);
            const reels = await query("SELECT count(*) FROM posts WHERE author_id = $1 AND data->>'type' = 'video'", [uuid]);
            const marketItems = await query("SELECT count(*) FROM marketplace WHERE seller_id = $1", [uuid]);
            const activeAds = await query("SELECT count(*) FROM ads WHERE owner_id = $1 AND data->>'status' = 'active'", [uuid]);

            const followers = await query("SELECT count(*) FROM relationships WHERE following_id = $1 AND status = 'accepted'", [uuid]);
            const following = await query("SELECT count(*) FROM relationships WHERE follower_id = $1 AND status = 'accepted'", [uuid]);
            const groupsOwned = await query("SELECT count(*) FROM groups WHERE creator_id = $1", [uuid]);
            const groupsJoined = await query("SELECT count(*) FROM groups WHERE data->'memberIds' ? $1", [id]); 
            const vipAccess = await query("SELECT group_id FROM vip_access WHERE user_id = $1 AND data->>'status' = 'active'", [uuid]);

            const balanceRes = await query("SELECT SUM(amount) as total FROM financial_transactions WHERE user_id = $1 AND status = 'paid' AND type = 'sale'", [uuid]);
            const earnedRes = await query("SELECT SUM(amount) as total FROM financial_transactions WHERE user_id = $1 AND status = 'paid'", [uuid]);
            const affRes = await query("SELECT SUM(amount) as total FROM financial_transactions WHERE user_id = $1 AND type = 'affiliate_commission'", [uuid]);

            const ipHistory = await query("SELECT ip, user_agent, created_at as date FROM user_ip_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [uuid]);
            const strikes = userData.strikes || 0;
            const risk = strikes > 2 ? 'HIGH' : (strikes > 0 ? 'MEDIUM' : 'LOW');

            return {
                basic_info: {
                    id: userRow.id,
                    email: userRow.email,
                    google_id: userRow.google_id,
                    created_at: userRow.created_at,
                    last_seen: userData.lastSeen ? new Date(userData.lastSeen).toISOString() : null,
                    is_verified: !!userData.isVerified,
                    is_profile_completed: !!userData.isProfileCompleted,
                    referred_by: userRow.referred_by_id
                },
                profile: {
                    handle: `@${userData.profile?.name || ''}`,
                    nickname: userData.profile?.nickname || userData.profile?.name,
                    bio: userData.profile?.bio,
                    photo_url: userData.profile?.photoUrl,
                    is_private: !!userData.profile?.isPrivate,
                    website: userData.profile?.website,
                    phone: userData.profile?.phone,
                    cpf: userData.profile?.cpf ? `${userData.profile.cpf.substring(0,3)}.***.***-${userData.profile.cpf.slice(-2)}` : null
                },
                content_stats: {
                    total_feed_posts: parseInt(feedPosts.rows[0].count),
                    total_reels: parseInt(reels.rows[0].count),
                    total_marketplace_items: parseInt(marketItems.rows[0].count),
                    total_active_ads: parseInt(activeAds.rows[0].count)
                },
                social_stats: {
                    followers_count: parseInt(followers.rows[0].count),
                    following_count: parseInt(following.rows[0].count),
                    groups_owned: parseInt(groupsOwned.rows[0].count),
                    groups_joined: parseInt(groupsJoined.rows[0].count),
                    vip_access_active: vipAccess.rows.map(r => r.group_id)
                },
                financial_insights: {
                    wallet_balance: parseFloat(balanceRes.rows[0].total || 0),
                    total_earned_lifetime: parseFloat(earnedRes.rows[0].total || 0),
                    affiliate_commissions_generated: parseFloat(affRes.rows[0].total || 0),
                    payment_provider_connected: userData.paymentConfig?.providerId || null,
                    is_payment_setup: !!userData.paymentConfig?.isConnected
                },
                security_audit: {
                    strikes: strikes,
                    is_banned: !!userData.isBanned,
                    ban_reason: userData.banReason || null,
                    ip_history: ipHistory.rows,
                    account_risk_score: risk
                }
            };
        },

        async getUserPosts(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query(
                "SELECT id, author_id, data, created_at FROM posts WHERE author_id = $1 AND data->>'type' != 'video' ORDER BY created_at DESC",
                [uuid]
            );
            return res.rows.map(r => {
                const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                return { 
                    ...data, 
                    id: r.id,
                    authorId: r.author_id,
                    timestamp: new Date(r.created_at).getTime()
                };
            });
        },

        async getUserReels(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query(
                "SELECT id, author_id, data, created_at FROM posts WHERE author_id = $1 AND data->>'type' = 'video' ORDER BY created_at DESC",
                [uuid]
            );
            return res.rows.map(r => {
                const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
                return { 
                    ...data, 
                    id: r.id,
                    authorId: r.author_id,
                    timestamp: new Date(r.created_at).getTime()
                };
            });
        },

        async getUserFeed(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");

            const postsRes = await query(
                "SELECT id, data, created_at, 'POST' as source FROM posts WHERE author_id = $1",
                [uuid]
            );

            const adsRes = await query(
                "SELECT id, data, created_at, 'AD' as source FROM ads WHERE owner_id = $1",
                [uuid]
            );

            return [...postsRes.rows, ...adsRes.rows];
        },

        async getUserGroups(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            
            const sql = `
                SELECT id, creator_id, data
                FROM groups
                WHERE creator_id = $1 
                   OR data->'memberIds' ? $2
                   OR data->'adminIds' ? $2
                ORDER BY updated_at DESC
            `;
            const res = await query(sql, [uuid, id]);
            
            return res.rows.map(row => {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                
                let role = 'Membro';
                if (row.creator_id === uuid) role = 'Dono';
                else if (data.adminIds?.includes(id)) role = 'Administrador';
                
                let type = 'Público';
                if (data.isVip) type = 'VIP';
                else if (data.isPrivate) type = 'Privado';

                return {
                    id: row.id,
                    name: data.name || 'Sem nome',
                    avatar: data.coverImage || null,
                    memberCount: data.memberIds?.length || 0,
                    type: type,
                    provider: data.paymentConfig?.providerId || (data.isVip ? 'SyncPay' : null),
                    userRole: role
                };
            });
        },

        async getUserReports(id) {
            const uuid = toUuid(id);
            if (!uuid) throw new Error("ID inválido");
            const res = await query(
                'SELECT * FROM reports WHERE target_id = $1 ORDER BY created_at DESC',
                [uuid]
            );
            return res.rows;
        },

        async resolveReport(reportId) {
            await query(
                "UPDATE reports SET status = 'resolved' WHERE id = $1",
                [reportId]
            );
            return true;
        }
    },

    query
};
