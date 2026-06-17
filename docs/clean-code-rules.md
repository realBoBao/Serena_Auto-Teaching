# Clean Code Rules — Anti-Vibe-Coding Audit

> File này được đọc bởi `CoderAgent`, `SecurityAuditor`, và `EvoAgent` làm bộ quy tắc audit.
> Mọi code mới phải tuân thủ. Mọi code cũ bị flag khi audit.

---

## Tier 1 — Defensive Programming (ZERO-TOLERANCE)

### Rule 1.1: Mọi I/O phải có Try/Catch
```js
// ❌ VIBE CODING — Happy path only
const data = await fetch(url).then(r => r.json());
return data.items;

// ✅ DEFENSIVE — Handle failure
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.items ?? [];
} catch (err) {
  error('Component', 'fetch failed', { url, error: err.message });
  return [];
}
```

### Rule 1.2: Optional chaining cho mọi nested access
```js
// ❌ VIBE CODING
const name = response.data.user.profile.name;

// ✅ DEFENSIVE
const name = response?.data?.user?.profile?.name ?? 'unknown';
```

### Rule 1.3: Timeout cho mọi async operation
```js
// ❌ VIBE CODING — Có thể treo mãi mãi
const result = await someSlowOperation();

// ✅ DEFENSIVE — Dùng withTimeout (đã có trong lib/with_timeout.js)
import { withTimeout, TimeoutError } from '../lib/with_timeout.js';
try {
  const result = await withTimeout(someSlowOperation(), 30_000, 'operation');
} catch (err) {
  if (err instanceof TimeoutError) {
    warn('Component', 'operation timed out');
  }
}
```

### Rule 1.4: Validate input ở trust boundary
```js
// ❌ VIBE CODING — Tin tưởng input
async function processQuery(query) {
  return await db.all(`SELECT * FROM data WHERE id = ${query.id}`);
}

// ✅ DEFENSIVE — Validate + sanitize
async function processQuery(query) {
  if (!query?.id || typeof query.id !== 'number') {
    throw new Error('Invalid input: id must be a number');
  }
  return await db.all('SELECT * FROM data WHERE id = ?', [query.id]);
}
```

---

## Tier 3 — Stdlib First (NO UNNECESSARY DEPENDENCIES)

### Rule 3.1: Kiểm tra stdlib trước khi import
```
Cần làm gì?              → Dùng gì?
─────────────────────────────────────────
Format ngày/tháng         → Intl.DateTimeFormat (built-in)
Băm chuỗi                → crypto (built-in)
Deep clone object         → structuredClone (built-in)
Merge objects             → Object.assign / spread (built-in)
HTTP request              → fetch (built-in, Node 18+)
URL parsing               → new URL() (built-in)
JSON parse an toàn       → JSON.parse + try/catch
Đọc/ghi file             → fs/promises (built-in)
Path manipulation         → path (built-in)
```

### Rule 3.2: Flag khi import thư viện ngoài không cần thiết
```js
// ❌ VIBE CODING — Cài moment chỉ để format ngày
import moment from 'moment';
const formatted = moment(date).format('YYYY-MM-DD');

// ✅ STDLIB — Dùng Intl
const formatted = new Intl.DateTimeFormat('en-CA').format(date);

// ❌ VIBE CODING — Cài lodash chỉ để pick
import { pick } from 'lodash';
const result = pick(obj, ['a', 'b']);

// ✅ STDLIB — Destructure
const { a, b } = obj;
```

### Rule 3.3: Quy tắc cài dependency mới
```
1. Tìm trong Node.js stdlib trước (https://nodejs.org/api/)
2. Tìng trong project's lib/ folder (có thể đã có sẵn)
3. Nếu thực sự cần → SecurityAuditor phải approve
4. Không bao giờ cài dependency cho 1 dòng code
```

---

## Tier 2 — Context Anchoring (DRY Principle)

### Rule 2.1: Quét lib/ trước khi viết hàm mới
```
Trước khi tạo hàm mới, phải:
1. Kiểm tra lib/ đã có hàm tương tự chưa
2. Kiểm tra agents/ đã có agent xử lý chưa
3. Nếu có → reuse, KHÔNG tạo duplicate
```

### Rule 2.2: Danh sách utils có sẵn (phải đọc trước khi code)
```
lib/with_timeout.js     → withTimeout(), TimeoutError
lib/safe_json.js        → writeJsonSafe(), readJsonSafe()
lib/atomic_write.js     → writeJsonAtomic()
lib/structured_logger.js → info(), warn(), error(), scoped()
lib/security.js         → validateBody(), sanitizeString(), validateApiKey()
lib/flashcard_db.js     → addFlashcard(), getDueFlashcards(), reviewFlashcard()
lib/outbox.js           → enqueue(), getPending(), markSent()
lib/data_federation.js  → archiveOldData(), queryUnified()
```

---

## Tier 4 — Immutable Data Flow (Architecture)

### Rule 4.1: Không mutate global state
```js
// ❌ VIBE CODING — Sửa trực tiếp biến global
globalCache.results = newResults;
sharedState.user = { ...sharedState.user, name: 'new' };

// ✅ IMMUTABLE — Trả về object mới
function processResults(cache, newResults) {
  return { ...cache, results: newResults, updatedAt: Date.now() };
}
```

### Rule 4.2: Agent return object mới, không sửa input
```js
// ❌ VIBE CODING — Mutate input
async function processAgent(input) {
  input.processed = true;
  input.result = await compute(input.data);
  return input;
}

// ✅ IMMUTABLE — Return new object
async function processAgent(input) {
  const result = await compute(input.data);
  return { ...input, processed: true, result };
}
```

---

## Audit Checklist (cho EvoAgent / SecurityAuditor)

Khi audit code, flag nếu:
- [ ] Có `await` mà không có `try/catch`
- [ ] Có nested property access mà không có `?.`
- [ ] Có `import` từ `node_modules` mà stdlib có thể làm
- [ ] Có `import` mà không dùng (unused import)
- [ ] Có hàm trùng logic với hàm trong `lib/`
- [ ] Có mutation của biến global / input parameter
- [ ] Có hardcoded string thay vì constant
- [ ] Có magic number thay vì named constant
