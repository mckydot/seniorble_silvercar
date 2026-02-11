/**
 * ==========================================
 * Seniorble 백엔드 서버
 * ==========================================
 * 
 * 기능:
 * - 보호자 회원가입 (POST /signup)
 * - Supabase(PostgreSQL) 연동
 * - bcrypt 비밀번호 해싱
 * - 이메일 중복 체크
 */

// ==========================================
// 모듈 불러오기
// ==========================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Supabase 연결 성공');

// ==========================================
// Express 앱 설정
// ==========================================
const app = express();
const PORT = process.env.PORT || 8000;

// 미들웨어
app.use(cors()); // CORS 허용 (프론트엔드에서 접근 가능)
app.use(express.json()); // JSON 요청 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 파싱

// 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==========================================
// 헬스체크 엔드포인트
// ==========================================
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Seniorble 백엔드 서버가 정상 작동 중입니다.',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// 회원가입 엔드포인트
// ==========================================
app.post('/signup',
    // 입력값 검증 미들웨어
    [
        body('email')
            .isEmail()
            .withMessage('올바른 이메일 형식이 아닙니다.')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 })
            .withMessage('비밀번호는 8자 이상이어야 합니다.'),
        body('name')
            .trim()
            .isLength({ min: 2 })
            .withMessage('이름은 2자 이상이어야 합니다.'),
        body('phone')
            .matches(/^010-\d{4}-\d{4}$/)
            .withMessage('올바른 전화번호 형식이 아닙니다. (010-XXXX-XXXX)')
    ],
    async (req, res) => {
        try {
            // 입력값 검증 결과 확인
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ 입력값 검증 실패:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: '입력값이 올바르지 않습니다.',
                    errors: errors.array().map(err => err.msg)
                });
            }

            const { email, password, name, phone } = req.body;

            console.log(`📝 회원가입 시도: ${email}`);

            // ==========================================
            // 1. 이메일 중복 체크
            // ==========================================
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                // PGRST116은 "데이터 없음" 에러 (정상)
                console.error('❌ 이메일 중복 체크 중 에러:', checkError);
                return res.status(500).json({
                    success: false,
                    message: '서버 오류가 발생했습니다.'
                });
            }

            if (existingUser) {
                console.log('⚠️ 이메일 중복:', email);
                return res.status(409).json({
                    success: false,
                    message: '이미 가입된 이메일입니다.'
                });
            }

            // ==========================================
            // 2. 비밀번호 해싱
            // ==========================================
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            console.log('🔒 비밀번호 해싱 완료');

            // ==========================================
            // 3. 사용자 정보 DB에 저장
            // ==========================================
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        email: email,
                        password_hash: passwordHash,
                        name: name,
                        phone: phone
                    }
                ])
                .select()
                .single();

            if (insertError) {
                console.error('❌ 사용자 생성 중 에러:', insertError);
                return res.status(500).json({
                    success: false,
                    message: '회원가입 처리 중 오류가 발생했습니다.'
                });
            }

            console.log('✅ 회원가입 성공:', newUser.id);

            // ==========================================
            // 4. 성공 응답 (비밀번호 해시는 제외)
            // ==========================================
            res.status(201).json({
                success: true,
                message: '회원가입이 완료되었습니다.',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    phone: newUser.phone,
                    created_at: newUser.created_at
                }
            });

        } catch (error) {
            console.error('❌ 회원가입 처리 중 예외 발생:', error);
            res.status(500).json({
                success: false,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }
);

// ==========================================
// 로그인 엔드포인트
// ==========================================
app.post('/login',
    // 입력값 검증 미들웨어
    [
        body('email')
            .isEmail()
            .withMessage('올바른 이메일 형식이 아닙니다.')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('비밀번호를 입력해주세요.')
    ],
    async (req, res) => {
        try {
            // 입력값 검증 결과 확인
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ 입력값 검증 실패:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: '입력값이 올바르지 않습니다.',
                    errors: errors.array().map(err => err.msg)
                });
            }

            const { email, password } = req.body;

            console.log(`🔐 로그인 시도: ${email}`);

            // ==========================================
            // 1. 이메일로 사용자 조회
            // ==========================================
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('id, email, password_hash, name, phone, created_at')
                .eq('email', email)
                .single();

            if (fetchError || !user) {
                console.log('⚠️ 존재하지 않는 이메일:', email);
                return res.status(401).json({
                    success: false,
                    message: '이메일 또는 비밀번호가 올바르지 않습니다.'
                });
            }

            // ==========================================
            // 2. 비밀번호 검증
            // ==========================================
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                console.log('⚠️ 비밀번호 불일치:', email);
                return res.status(401).json({
                    success: false,
                    message: '이메일 또는 비밀번호가 올바르지 않습니다.'
                });
            }

            console.log('✅ 로그인 성공:', user.id);

            // ==========================================
            // 3. 성공 응답 (비밀번호 해시는 제외)
            // ==========================================
            res.status(200).json({
                success: true,
                message: '로그인에 성공했습니다.',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    phone: user.phone,
                    created_at: user.created_at
                }
            });

        } catch (error) {
            console.error('❌ 로그인 처리 중 예외 발생:', error);
            res.status(500).json({
                success: false,
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }
);

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
// 전역 에러 핸들러
// ==========================================
app.use((err, req, res, next) => {
    console.error('❌ 전역 에러:', err);
    res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('사용 가능한 엔드포인트:');
    console.log('  GET  /         - 서버 상태 확인');
    console.log('  GET  /health   - 헬스체크');
    console.log('  POST /signup   - 회원가입');
    console.log('  POST /login    - 로그인');
    console.log('');
});

// ==========================================
// 우아한 종료 (Graceful Shutdown)
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