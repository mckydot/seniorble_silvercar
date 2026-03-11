/**
 * ==========================================
 * Seniorble 백엔드 서버 (JWT 인증 시스템)
 * ==========================================
 * 
 * 기능:
 * - JWT 기반 인증/인가
 * - 보호자 회원가입/로그인
 * - 인증된 사용자만 API 접근 가능
 * - Role 기반 권한 제어
 */

// ==========================================
// 모듈 불러오기
// ==========================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('./utils/jwt');
const { authenticateToken, requireRole, optionalAuth } = require('./middleware/auth');

// 환경변수 로드
dotenv.config();

// ==========================================
// Supabase 클라이언트 초기화
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 환경변수 오류: SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 .env 파일에 설정해주세요.');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('❌ 환경변수 오류: JWT_SECRET을 .env 파일에 설정해주세요.');
    process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
    console.error('❌ 환경변수 오류: JWT_REFRESH_SECRET을 .env 파일에 설정해주세요.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase 연결 성공');
console.log('✅ JWT 인증 시스템 활성화');

// ==========================================
// Express 앱 설정
// ==========================================
const app = express();
const PORT = process.env.PORT || 8000;
const IS_PROD = (process.env.NODE_ENV || 'development') === 'production';

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'seniorble_refresh';
const BCRYPT_SALT_ROUNDS = (() => {
    const n = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    return Number.isInteger(n) && n >= 10 && n <= 14 ? n : 12;
})();

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshCookieOptions() {
    // In production: set FRONTEND_URL to https origin and use secure cookies.
    return {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: IS_PROD ? 'strict' : 'lax',
        path: '/auth/refresh',
        // maxAge is managed by JWT expiry; keep cookie reasonably long
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30d
    };
}

// CORS 설정 (프론트엔드만 허용)
// localhost와 127.0.0.1은 브라우저에서 서로 다른 origin으로 취급됨 → 둘 다 허용
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://mckydot.github.io',
    'https://mckydot.github.io'
];
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(helmet({
    // You can tune CSP later; keep defaults for now.
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Basic abuse protection
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function passwordMeetsPolicy(password) {
    if (typeof password !== 'string') return false;
    if (password.length < 12) return false;
    if (password.length > 72) return false; // bcrypt input limit safety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasLower && hasUpper && hasDigit && hasSpecial;
}

// ==========================================
// 공개 엔드포인트 (인증 불필요)
// ==========================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Seniorble 백엔드 서버 (JWT 인증)',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: 'connected',
        auth: 'JWT',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// 회원가입 (공개)
// ==========================================
app.post('/signup',
    authLimiter,
    [
        body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
        body('password')
            .isString()
            .custom((pw) => passwordMeetsPolicy(pw))
            .withMessage('비밀번호는 12~72자이며 대문자/소문자/숫자/특수문자를 각각 1개 이상 포함해야 합니다.'),
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('이름은 2~50자여야 합니다.').escape(),
        body('phone').matches(/^010-\d{4}-\d{4}$/).withMessage('올바른 전화번호 형식이 아닙니다.')
    ],
    asyncHandler(async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: '입력값이 올바르지 않습니다.',
                    errors: errors.array().map(err => err.msg)
                });
            }

            const { email, password, name, phone } = req.body;
            console.log(`📝 회원가입 시도`);

            // 이메일 중복 체크
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('❌ 이메일 중복 체크 중 에러:', checkError);
                return res.status(500).json({
                    success: false,
                    message: '서버 오류가 발생했습니다.'
                });
            }

            if (existingUser) {
                console.log('⚠️ 회원가입 거절(중복 가능)');
                return res.status(409).json({
                    success: false,
                    message: '회원가입에 실패했습니다.'
                });
            }

            // 비밀번호 해싱
            const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
            console.log('🔒 비밀번호 해싱 완료');

            // 사용자 생성
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{
                    email,
                    password_hash: passwordHash,
                    name,
                    phone
                }])
                .select()
                .single();

            if (insertError) {
                console.error('❌ 사용자 생성 중 에러:', insertError);
                if (insertError.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        message: '이미 가입된 이메일입니다.'
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: '회원가입 처리 중 오류가 발생했습니다. 입력값을 확인하거나 잠시 후 다시 시도해주세요.'
                });
            }

            console.log('✅ 회원가입 성공:', newUser.id);

            res.status(201).json({
                success: true,
                message: '회원가입이 완료되었습니다.',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    phone: newUser.phone,
                    role: 'guardian',
                    created_at: newUser.created_at
                }
            });

    })
);

// ==========================================
// 로그인 (공개) - JWT 토큰 발급
// ==========================================
app.post('/login',
    loginLimiter,
    [
        body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
        body('password').isString().notEmpty().withMessage('비밀번호를 입력해주세요.')
    ],
    asyncHandler(async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: '입력값이 올바르지 않습니다.',
                    errors: errors.array().map(err => err.msg)
                });
            }

            const { email, password } = req.body;
            console.log(`🔐 로그인 시도`);

            // 사용자 조회
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, email, password_hash, name, phone, created_at')
                .eq('email', email)
                .single();

            // Prevent user enumeration: same message for "no such user" vs "wrong password"
            if (fetchError || !user) {
                console.log('⚠️ 로그인 실패(사용자 없음 또는 조회 오류)');
                return res.status(401).json({
                    success: false,
                    message: '이메일 또는 비밀번호가 올바르지 않습니다.'
                });
            }

            // 비밀번호 검증
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                console.log('⚠️ 로그인 실패(비밀번호 불일치)');
                return res.status(401).json({
                    success: false,
                    message: '이메일 또는 비밀번호가 올바르지 않습니다.'
                });
            }

            // Access + Refresh token 발급
            const accessToken = generateAccessToken({
                userId: user.id,
                email: user.email,
                role: 'guardian'
            });

            const refreshToken = generateRefreshToken({ userId: user.id });
            const refreshTokenHash = hashToken(refreshToken);

            // Refresh token 서버측 저장 (해시만 저장)
            const { error: rtError } = await supabase
                .from('refresh_tokens')
                .insert([{
                    user_id: user.id,
                    token_hash: refreshTokenHash,
                    revoked: false,
                    // Expires is enforced by JWT verify as well; store for server-side invalidation/cleanup
                    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
                    user_agent: req.headers['user-agent'] || null,
                    ip: req.ip || null,
                }]);

            if (rtError) {
                console.error('❌ refresh token 저장 실패:', rtError);
                return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
            }

            res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

            console.log('✅ 로그인 성공:', user.id, '- Access/Refresh 발급');

            res.status(200).json({
                success: true,
                message: '로그인에 성공했습니다.',
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    role: 'guardian',
                    created_at: user.created_at
                }
            });

    })
);

/**
 * Access token 재발급 (Refresh token 기반)
 * - Refresh token은 httpOnly cookie로만 받음
 * - DB 해시 저장된 refresh token만 유효
 * - Refresh token rotation (기존 토큰 즉시 revoke)
 */
app.post('/auth/refresh', asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(token);
        if (decoded.typ !== 'refresh') throw new Error('invalid refresh typ');
    } catch (_) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    const tokenHash = hashToken(token);

    const { data: row, error } = await supabase
        .from('refresh_tokens')
        .select('id, user_id, revoked, expires_at')
        .eq('token_hash', tokenHash)
        .single();

    if (error || !row || row.revoked) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
        // revoke expired token record
        await supabase.from('refresh_tokens').update({ revoked: true }).eq('id', row.id);
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    // rotation: revoke old, issue new
    const newRefreshToken = generateRefreshToken({ userId: row.user_id });
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const { error: revokeErr } = await supabase
        .from('refresh_tokens')
        .update({ revoked: true, last_used_at: new Date().toISOString() })
        .eq('id', row.id);

    if (revokeErr) {
        console.error('❌ refresh token revoke 실패:', revokeErr);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    const { error: insertErr } = await supabase
        .from('refresh_tokens')
        .insert([{
            user_id: row.user_id,
            token_hash: newRefreshTokenHash,
            revoked: false,
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
            user_agent: req.headers['user-agent'] || null,
            ip: req.ip || null,
        }]);

    if (insertErr) {
        console.error('❌ refresh token rotation insert 실패:', insertErr);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    // access token is short-lived, fetch role/email for payload safely
    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', row.user_id)
        .single();

    if (userErr || !user) {
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: 'guardian' });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions());
    return res.status(200).json({ success: true, accessToken });
}));

/**
 * 로그아웃: 현재 refresh token 무효화 + 쿠키 삭제
 */
app.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
        const tokenHash = hashToken(token);
        await supabase.from('refresh_tokens').update({ revoked: true }).eq('token_hash', tokenHash);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
    return res.status(200).json({ success: true, message: '로그아웃되었습니다.' });
}));

// ==========================================
// 보호된 엔드포인트 (인증 필요)
// ==========================================

/**
 * 현재 로그인한 사용자 정보 조회
 * 프론트엔드가 페이지 로드 시 호출하여 로그인 여부 확인
 */
app.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('❌ 사용자 정보 조회 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 내부 오류가 발생했습니다.'
        });
    }
});

/**
 * 환자 목록 조회 (Guardian만)
 */
app.get('/patients', authenticateToken, requireRole(['guardian']), async (req, res) => {
    try {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, name, birthdate, gender, device_serial_number, notes, relationship, created_at')
            .eq('guardian_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ 환자 목록 조회 DB 오류:', error);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }

        res.status(200).json({ success: true, patients: patients || [] });
    } catch (error) {
        console.error('❌ 환자 목록 조회 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 내부 오류가 발생했습니다.'
        });
    }
});

/**
 * 환자 등록 (Guardian만)
 */
app.post('/patients', authenticateToken, requireRole(['guardian']), async (req, res) => {
    try {
        // minimal server-side validation (keep using express-validator later if you add more fields)
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        if (name.length < 2 || name.length > 50) {
            return res.status(400).json({ success: false, message: '입력값이 올바르지 않습니다.' });
        }

        const payload = {
            name,
            birthdate: req.body.birthdate || null,
            gender: req.body.gender || null,
            device_serial_number: req.body.device_serial_number || null,
            notes: req.body.notes || null,
            relationship: req.body.relationship || null,
            guardian_id: req.user.id,
        };

        const { data: patient, error } = await supabase
            .from('patients')
            .insert([payload])
            .select('id, name, birthdate, gender, device_serial_number, notes, relationship, guardian_id, created_at')
            .single();

        if (error) {
            console.error('❌ 환자 등록 DB 오류:', error);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }

        res.status(201).json({ success: true, patient });
    } catch (error) {
        console.error('❌ 환자 등록 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 내부 오류가 발생했습니다.'
        });
    }
});

/**
 * 단일 환자 조회 (본인이 등록한 환자만)
 * - guardian_id 일치 시에만 반환, 아니면 404 (다른 사용자 환자 노출 방지)
 */
app.get('/patients/:id', authenticateToken, requireRole(['guardian']), async (req, res) => {
    try {
        const patientId = req.params.id;
        const { data: patient, error } = await supabase
            .from('patients')
            .select('id, name, birthdate, gender, device_serial_number, notes, relationship, created_at')
            .eq('id', patientId)
            .eq('guardian_id', req.user.id)
            .single();

        if (error || !patient) {
            return res.status(404).json({ success: false, message: '환자를 찾을 수 없습니다.' });
        }

        res.status(200).json({ success: true, patient });
    } catch (error) {
        console.error('❌ 환자 조회 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 내부 오류가 발생했습니다.'
        });
    }
});

/**
 * 환자 정보 수정 (본인이 등록한 환자만)
 * - guardian_id 변경 불가, body의 guardian_id는 무시
 */
app.put('/patients/:id', authenticateToken, requireRole(['guardian']), async (req, res) => {
    try {
        const patientId = req.params.id;

        const { data: existing, error: fetchError } = await supabase
            .from('patients')
            .select('id, guardian_id')
            .eq('id', patientId)
            .eq('guardian_id', req.user.id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ success: false, message: '환자를 찾을 수 없습니다.' });
        }

        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
        const payload = {};
        if (name !== null) {
            if (name.length < 2 || name.length > 50) {
                return res.status(400).json({ success: false, message: '입력값이 올바르지 않습니다.' });
            }
            payload.name = name;
        }
        if (req.body.hasOwnProperty('birthdate')) payload.birthdate = req.body.birthdate || null;
        if (req.body.hasOwnProperty('gender')) payload.gender = req.body.gender || null;
        if (req.body.hasOwnProperty('device_serial_number')) payload.device_serial_number = req.body.device_serial_number || null;
        if (req.body.hasOwnProperty('notes')) payload.notes = req.body.notes || null;
        if (req.body.hasOwnProperty('relationship')) payload.relationship = req.body.relationship || null;

        const { data: patient, error: updateError } = await supabase
            .from('patients')
            .update(payload)
            .eq('id', patientId)
            .eq('guardian_id', req.user.id)
            .select('id, name, birthdate, gender, device_serial_number, notes, relationship, created_at')
            .single();

        if (updateError) {
            console.error('❌ 환자 수정 DB 오류:', updateError);
            return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
        }

        res.status(200).json({ success: true, patient });
    } catch (error) {
        console.error('❌ 환자 수정 중 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 내부 오류가 발생했습니다.'
        });
    }
});

// ==========================================
// 404 에러 핸들러
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '요청하신 엔드포인트를 찾을 수 없습니다.'
    });
});

// ==========================================
// 전역 에러 핸들러 (내부 정보 노출 방지)
// ==========================================
app.use((err, req, res, next) => {
    // eslint-disable-line no-unused-vars
    console.error('❌ 전역 에러:', err);
    const status = Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
        success: false,
        message: status >= 500 ? '서버 오류가 발생했습니다.' : (err.publicMessage || '요청 처리에 실패했습니다.')
    });
});

// ==========================================
// 서버 시작
// ==========================================
app.listen(PORT, () => {
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('🚀 Seniorble 백엔드 서버 시작');
    console.log('════════════════════════════════════════');
    console.log(`📡 서버 주소: http://localhost:${PORT}`);
    console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  데이터베이스: Supabase (PostgreSQL)`);
    console.log(`🔐 인증 방식: JWT`);
    console.log(`⏱️  토큰 만료: ${process.env.JWT_EXPIRES_IN || '1h'}`);
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('사용 가능한 엔드포인트:');
    console.log('  [공개]');
    console.log('  GET  /         - 서버 상태 확인');
    console.log('  GET  /health   - 헬스체크');
    console.log('  POST /signup   - 회원가입');
    console.log('  POST /login    - 로그인 (JWT 발급)');
    console.log('');
    console.log('  [인증 필요]');
    console.log('  GET  /auth/me     - 현재 사용자 정보');
    console.log('  GET  /patients    - 환자 목록 (Guardian, 본인 등록만)');
    console.log('  GET  /patients/:id - 단일 환자 조회 (본인만)');
    console.log('  POST /patients    - 환자 등록 (Guardian)');
    console.log('  PUT  /patients/:id - 환자 수정 (본인만)');
    console.log('');
});

// ==========================================
// 우아한 종료
// ==========================================
process.on('SIGTERM', () => {
    console.log('');
    console.log('⏹️  SIGTERM 신호 수신 - 서버 종료 중...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('');
    console.log('⏹️  SIGINT 신호 수신 (Ctrl+C) - 서버 종료 중...');
    process.exit(0);
});

/**
 * ==========================================
 * 이메일 인증 기능 추가
 * ==========================================
 * 
 * 필요한 패키지 설치:
 * npm install nodemailer
 * 
 * .env 파일에 추가:
 * EMAIL_HOST=smtp.gmail.com
 * EMAIL_PORT=587
 * EMAIL_USER=your-email@gmail.com
 * EMAIL_PASSWORD=your-app-password
 * EMAIL_FROM=Seniorble <noreply@seniorble.com>
 */

const nodemailer = require('nodemailer');

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// 이메일 인증 코드 생성 (6자리 숫자)
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 이메일 인증 코드 발송
async function sendVerificationEmail(email, code) {
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'Seniorble <noreply@seniorble.com>',
        to: email,
        subject: '[Seniorble] 이메일 인증 코드',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Noto Sans KR', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .logo { text-align: center; font-size: 32px; font-weight: 700; color: #2D5F5D; margin-bottom: 30px; }
                    .code-box { background: #FAF8F3; border: 2px solid #2D5F5D; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
                    .code { font-size: 36px; font-weight: 700; color: #2D5F5D; letter-spacing: 8px; }
                    .notice { color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px; }
                    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">Seniorble</div>
                    <h2 style="color: #1A1A1A; margin-bottom: 20px;">이메일 인증 코드</h2>
                    <p style="color: #666; line-height: 1.6;">
                        안녕하세요,<br>
                        Seniorble 회원가입을 위한 인증 코드를 보내드립니다.
                    </p>
                    <div class="code-box">
                        <div style="color: #666; font-size: 14px; margin-bottom: 15px;">인증 코드</div>
                        <div class="code">${code}</div>
                    </div>
                    <p class="notice">
                        ※ 본 인증 코드는 <strong>10분간 유효</strong>합니다.<br>
                        ※ 본인이 요청하지 않았다면 이 메일을 무시하세요.
                    </p>
                    <div class="footer">
                        본 메일은 발신 전용입니다.<br>
                        © 2024 Seniorble. All rights reserved.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    await transporter.sendMail(mailOptions);
}

// ==========================================
// 이메일 인증 코드 발송 API
// ==========================================
app.post('/send-verification-code',
    authLimiter,
    [body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력값이 올바르지 않습니다.',
                errors: errors.array().map(err => err.msg)
            });
        }

        const { email } = req.body;
        console.log('📧 이메일 인증 코드 발송 요청:', email);

        // 이미 가입된 이메일인지 확인
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: '이미 가입된 이메일입니다.'
            });
        }

        // 인증 코드 생성
        const code = generateVerificationCode();
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // DB에 인증 코드 저장 (10분 유효)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후
        
        // 기존 인증 코드 삭제 후 새로 저장
        await supabase
            .from('email_verifications')
            .delete()
            .eq('email', email);

        const { error: insertError } = await supabase
            .from('email_verifications')
            .insert([{
                email,
                code_hash: codeHash,
                expires_at: expiresAt.toISOString(),
                verified: false
            }]);

        if (insertError) {
            console.error('❌ 인증 코드 저장 실패:', insertError);
            return res.status(500).json({
                success: false,
                message: '서버 오류가 발생했습니다.'
            });
        }

        // 이메일 발송
        try {
            await sendVerificationEmail(email, code);
            console.log('✅ 이메일 인증 코드 발송 완료:', email);
            
            res.status(200).json({
                success: true,
                message: '인증 코드가 발송되었습니다. 이메일을 확인해주세요.',
                expiresIn: 600 // 초 단위 (10분)
            });
        } catch (emailError) {
            console.error('❌ 이메일 발송 실패:', emailError);
            return res.status(500).json({
                success: false,
                message: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'
            });
        }
    })
);

// ==========================================
// 이메일 인증 코드 확인 API
// ==========================================
app.post('/verify-email-code',
    authLimiter,
    [
        body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
        body('code').isLength({ min: 6, max: 6 }).withMessage('인증 코드는 6자리입니다.')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력값이 올바르지 않습니다.'
            });
        }

        const { email, code } = req.body;
        console.log('🔍 이메일 인증 코드 확인:', email);

        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // DB에서 인증 코드 조회
        const { data: verification, error } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', email)
            .eq('code_hash', codeHash)
            .single();

        if (error || !verification) {
            return res.status(400).json({
                success: false,
                message: '인증 코드가 일치하지 않습니다.'
            });
        }

        // 만료 확인
        if (new Date(verification.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: '인증 코드가 만료되었습니다. 다시 요청해주세요.'
            });
        }

        // 이미 인증됨
        if (verification.verified) {
            return res.status(400).json({
                success: false,
                message: '이미 인증된 코드입니다.'
            });
        }

        // 인증 완료 처리
        await supabase
            .from('email_verifications')
            .update({ verified: true })
            .eq('email', email)
            .eq('code_hash', codeHash);

        console.log('✅ 이메일 인증 완료:', email);

        res.status(200).json({
            success: true,
            message: '이메일 인증이 완료되었습니다.'
        });
    })
);

// ==========================================
// 회원가입 API 수정 (이메일 인증 확인 추가)
// ==========================================
// 기존 /signup 엔드포인트 수정
app.post('/signup',
    authLimiter,
    [
        body('email').isEmail().withMessage('올바른 이메일 형식이 아닙니다.').normalizeEmail(),
        body('password')
            .isString()
            .custom((pw) => passwordMeetsPolicy(pw))
            .withMessage('비밀번호는 12~72자이며 대문자/소문자/숫자/특수문자를 각각 1개 이상 포함해야 합니다.'),
        body('name').trim().isLength({ min: 2, max: 50 }).withMessage('이름은 2~50자여야 합니다.').escape(),
        body('phone').matches(/^010-\d{4}-\d{4}$/).withMessage('올바른 전화번호 형식이 아닙니다.')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '입력값이 올바르지 않습니다.',
                errors: errors.array().map(err => err.msg)
            });
        }

        const { email, password, name, phone } = req.body;
        console.log(`📝 회원가입 시도`);

        // ⭐ 이메일 인증 확인
        const { data: verification } = await supabase
            .from('email_verifications')
            .select('verified')
            .eq('email', email)
            .single();

        if (!verification || !verification.verified) {
            return res.status(400).json({
                success: false,
                message: '이메일 인증이 완료되지 않았습니다.'
            });
        }

        // 이메일 중복 체크
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ 이메일 중복 체크 중 에러:', checkError);
            return res.status(500).json({
                success: false,
                message: '서버 오류가 발생했습니다.'
            });
        }

        if (existingUser) {
            console.log('⚠️ 회원가입 거절(중복 가능)');
            return res.status(409).json({
                success: false,
                message: '회원가입에 실패했습니다.'
            });
        }

        // 비밀번호 해싱
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        console.log('🔒 비밀번호 해싱 완료');

        // 사용자 생성
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                email,
                password_hash: passwordHash,
                name,
                phone
            }])
            .select()
            .single();

        if (insertError) {
            console.error('❌ 사용자 생성 중 에러:', insertError);
            if (insertError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: '이미 가입된 이메일입니다.'
                });
            }
            return res.status(500).json({
                success: false,
                message: '회원가입 처리 중 오류가 발생했습니다.'
            });
        }

        // 인증 기록 삭제
        await supabase
            .from('email_verifications')
            .delete()
            .eq('email', email);

        console.log('✅ 회원가입 성공:', newUser.id);

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                phone: newUser.phone,
                role: 'guardian',
                created_at: newUser.created_at
            }
        });
    })
);