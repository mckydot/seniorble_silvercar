# Seniorble 백엔드 서버 설치 및 실행 가이드

## 📁 프로젝트 폴더 구조

```
seniorble-backend/
├── server.js              # Express 서버 메인 파일
├── package.json           # npm 패키지 설정
├── .env                   # 환경변수 (직접 생성 필요)
├── .env.example           # 환경변수 예시 파일
└── .gitignore             # Git 제외 파일 목록
```

## 🚀 설치 및 실행 방법

### 1️⃣ Node.js 설치 확인
```bash
node --version
# v18.0.0 이상 권장
```

### 2️⃣ 프로젝트 폴더로 이동
```bash
cd seniorble-backend
```

### 3️⃣ npm 패키지 설치
```bash
npm install
```

설치되는 패키지:
- `express` - 웹 서버 프레임워크
- `cors` - CORS 설정
- `bcrypt` - 비밀번호 해싱
- `dotenv` - 환경변수 관리
- `@supabase/supabase-js` - Supabase 클라이언트
- `express-validator` - 입력값 검증
- `nodemon` (개발용) - 자동 재시작

### 4️⃣ .env 파일 생성 및 설정

**.env 파일 생성:**
```bash
cp .env.example .env
```

**.env 파일 내용 수정:**
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=8000
NODE_ENV=development
```

**Supabase 정보 찾는 방법:**
1. https://supabase.com 로그인
2. 프로젝트 선택
3. Settings > API 메뉴
4. Project URL 복사 → `SUPABASE_URL`
5. `service_role` Key 복사 → `SUPABASE_SERVICE_ROLE_KEY`
   ⚠️ 주의: `anon` key가 아닌 `service_role` key 사용!

### 5️⃣ Supabase 데이터베이스 테이블 생성

Supabase 대시보드 > SQL Editor에서 실행:

```sql
-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이메일 인덱스 생성 (검색 속도 향상)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 6️⃣ 서버 실행

**개발 모드 (파일 변경 시 자동 재시작):**
```bash
npm run dev
```

**프로덕션 모드:**
```bash
npm start
```

서버 시작 성공 메시지:
```
════════════════════════════════════════
🚀 Seniorble 백엔드 서버 시작
════════════════════════════════════════
📡 서버 주소: http://localhost:8000
🌍 환경: development
🗄️  데이터베이스: Supabase (PostgreSQL)
════════════════════════════════════════
```

### 7️⃣ 서버 테스트

**브라우저에서 확인:**
```
http://localhost:8000
```

**curl로 헬스체크:**
```bash
curl http://localhost:8000/health
```

**회원가입 테스트:**
```bash
curl -X POST http://localhost:8000/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "홍길동",
    "email": "test@test.com",
    "phone": "010-1234-5678",
    "password": "12345678"
  }'
```

**로그인 테스트:**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "12345678"
  }'
```

## 📡 API 엔드포인트

### GET /
서버 상태 확인

### GET /health
헬스체크

### POST /signup
회원가입

**요청 예시:**
```json
{
  "name": "홍길동",
  "email": "test@test.com",
  "phone": "010-1234-5678",
  "password": "12345678"
}
```

**응답 예시 (성공 - 201):**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다.",
  "user": {
    "id": "uuid-string",
    "email": "test@test.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**응답 예시 (이메일 중복 - 409):**
```json
{
  "success": false,
  "message": "이미 가입된 이메일입니다."
}
```

### POST /login
로그인

**요청 예시:**
```json
{
  "email": "test@test.com",
  "password": "12345678"
}
```

**응답 예시 (성공 - 200):**
```json
{
  "success": true,
  "message": "로그인에 성공했습니다.",
  "user": {
    "id": "uuid-string",
    "email": "test@test.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**응답 예시 (인증 실패 - 401):**
```json
{
  "success": false,
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

## 🔒 보안 체크리스트

✅ 비밀번호 bcrypt 해싱 (saltRounds=10)
✅ .env 파일 Git 제외 (.gitignore)
✅ SQL Injection 방지 (Supabase ORM 사용)
✅ 이메일 중복 체크
✅ 입력값 검증 (express-validator)
✅ CORS 설정
✅ 에러 핸들링

## 🐛 문제 해결

### 서버가 시작되지 않을 때
1. `.env` 파일이 있는지 확인
2. `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 확인
3. `npm install` 실행 여부 확인

### 이메일 중복 에러가 안 뜰 때
1. Supabase에서 users 테이블이 생성되었는지 확인
2. email 컬럼에 UNIQUE 제약조건이 있는지 확인

### 비밀번호 해싱 실패 시
1. bcrypt 패키지가 설치되었는지 확인
2. Node.js 버전이 v14 이상인지 확인

## 📝 프론트엔드 연동

프론트엔드 `signup.js`에서 API_BASE_URL 설정:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

프론트엔드와 백엔드를 동시에 실행:
1. 백엔드: `npm run dev` (포트 8000)
2. 프론트엔드: Live Server 등으로 실행 (포트 5500 등)

## 🎯 다음 단계

이제 다음 기능들을 추가할 수 있습니다:
- [x] 회원가입 API (POST /signup)
- [x] 로그인 API (POST /login)
- [ ] JWT 토큰 인증
- [ ] 환자 등록 API (POST /patients)
- [ ] 센서 데이터 수신 API
- [ ] 낙상 감지 알림 API

---

#개발하면서 겪은 어려운점 및 해결방법

##카카오맵 api

###1 도메인문제
카카오 api에서 앱 설명에 하나, Javascript SDK 키에 하나 이렇게 도메인을 등록해야하는데
처음에는 https://mkydot.github.io/seniorble_silvercar 이런식으로 경로까지 포함해서 등록했었다
하지만 도메인등록은
https://mckydot.github.io 까지 등록해야한다

###2 지도 사용 on/off
카카오 api 개발자 문서를 보면
"지도-시작하기-설정하기"섹션에서 3번째 항목에 카카오맵 API 사용 설정 : 앱 관리 페이지의 [카카오맵]>[사용 설정]의 [상태]를 [ON]으로 설정해야한다고 나와있다
처음에 이를 off로 두고 개발해서
아무리 요청을 보내도
개발자도 Network창에 403Error가 계속 발생했다. 
저 설정을 해주고 난 이후로는 API가 정상작동하는 것을 확인 할 수 있다.


Made with ❤️ for Seniorble