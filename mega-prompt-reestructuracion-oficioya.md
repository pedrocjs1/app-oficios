# REESTRUCTURACIÓN ARQUITECTÓNICA — OficioYa

## CONTEXTO

OficioYa es un marketplace mobile (React Native/Expo) que conecta clientes con profesionales de servicios del hogar (electricistas, plomeros, gasistas, limpieza). Actualmente el frontend habla DIRECTO con Supabase usando el SDK `@supabase/supabase-js` desde el cliente. No hay backend. Toda la seguridad depende de RLS. La lógica de negocio está mezclada en los componentes y stores del frontend.

Necesito reestructurar la app para que siga el mismo patrón arquitectónico que DentalFlow:
- **Backend propio** (Fastify + TypeScript) que maneja TODA la lógica de negocio
- **Prisma** como ORM para acceder a la DB PostgreSQL de Supabase
- **Auth JWT propia** con el backend validando tokens (NO Supabase Auth directo desde el cliente)
- **Supabase se usa SOLO como base de datos PostgreSQL** (connection string directo)
- El frontend (Expo/React Native) SOLO habla con el backend via API REST

## ESTADO ACTUAL (lo que existe hoy)

### Stack actual:
- Expo SDK 54 + React Native + Expo Router (file-based routing)
- NativeWind (Tailwind CSS for React Native)
- Supabase (PostgreSQL + Auth + Storage + Realtime) — TODO directo desde el cliente
- Zustand para state management
- TypeScript

### Estructura actual:
```
app-oficios/
├── app/
│   ├── _layout.tsx          # Root layout - auth listener Supabase, role-based routing
│   ├── index.tsx            # Splash/redirect
│   ├── (auth)/
│   │   ├── login.tsx        # Login con Supabase Auth directo
│   │   ├── register.tsx     # Registro cliente con Supabase Auth directo
│   │   └── register-professional.tsx  # Registro profesional multi-step
│   ├── (client)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Lista requests activos (realtime Supabase)
│   │   ├── new-request.tsx  # Crear pedido (3 pasos)
│   │   ├── edit-profile.tsx
│   │   ├── profile.tsx
│   │   ├── request/[id].tsx # Ver propuestas
│   │   └── job/[id].tsx     # Chat con profesional
│   ├── (professional)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Feed pedidos abiertos
│   │   ├── edit-profile.tsx
│   │   ├── profile.tsx
│   │   ├── earnings.tsx     # Balance, historial pagos
│   │   ├── request/[id].tsx # Ver detalle, enviar propuesta
│   │   └── job/[id].tsx     # Chat con cliente
│   └── (admin)/
│       ├── _layout.tsx
│       ├── index.tsx        # Dashboard stats
│       ├── professionals.tsx # Aprobar/rechazar profesionales
│       ├── users.tsx
│       └── requests.tsx
├── stores/
│   ├── authStore.ts         # Zustand: session Supabase, user, role helpers
│   ├── chatStore.ts
│   └── requestStore.ts
├── lib/
│   └── supabase.ts          # Supabase client init (ANON KEY expuesta acá)
├── components/
├── constants/
├── supabase/                # Migrations
└── package.json
```

### Tablas en Supabase (PostgreSQL):
- **users** — id, email, phone, name, avatar_url, role (client|professional|both|admin), location, push_token
- **professionals** — user_id (FK), license_number, license_photo_url, dni_photo_url, selfie_url, bio, verified, status (pending_verification|verified|suspended), rating_avg, rating_count, jobs_completed, balance_due
- **categories** — id, name, slug, common_problems (JSONB), is_licensed, sort_order
- **service_zones** — id, name, city, province, boundary (PostGIS POLYGON)
- **professional_categories** — professional_id, category_id (many-to-many)
- **professional_zones** — professional_id, zone_id (many-to-many)
- **service_requests** — client_id, category_id, problem_type, description, photos (JSONB), urgency, location (PostGIS POINT), status (open|in_proposals|assigned|in_progress|completed|cancelled), max_proposals, proposals_count
- **proposals** — request_id, professional_id, price, message, estimated_arrival, status
- **jobs** — request_id, proposal_id, client_id, professional_id, agreed_price, payment_method, status (pending_start|in_progress|completed_by_professional|confirmed|disputed)
- **messages** — job_id, sender_id, content, flagged
- **reviews** — job_id, reviewer_id, reviewed_id, rating, comment
- **payments** — job_id, amount, commission_rate, commission_amount, net_to_professional, status
- **disputes** — job_id, opened_by, reason, evidence, status, resolution

### Patrones actuales problemáticos:
- Auth state viene de `supabase.auth.onAuthStateChange()` directo en `_layout.tsx`
- `fetchUserProfile()` lee de tabla `users` directamente con SDK Supabase
- Realtime via `supabase.channel('postgres_changes')`
- RLS con función `get_user_role()` (SECURITY DEFINER) para evitar recursión
- Uploads a Storage directo desde el cliente
- No hay validación server-side de datos — todo confía en RLS
- Service Role Key estaba expuesta en el CLAUDE.md (ya rotada)

## ARQUITECTURA OBJETIVO (como DentalFlow)

### Nueva estructura monorepo:
```
app-oficios/
├── apps/
│   ├── mobile/              # Expo app (movés todo lo de app/ actual acá)
│   │   ├── app/             # Expo Router screens
│   │   ├── components/
│   │   ├── stores/          # Zustand (solo UI state, NO lógica de negocio)
│   │   ├── services/        # Funciones que llaman al API backend
│   │   ├── lib/
│   │   │   └── api.ts       # Fetch wrapper al backend (NO más supabase.ts)
│   │   └── package.json
│   └── api/                 # NUEVO: Backend Fastify + TypeScript
│       ├── src/
│       │   ├── server.ts    # Entry point Fastify
│       │   ├── plugins/
│       │   │   ├── auth.ts  # JWT plugin (@fastify/jwt)
│       │   │   └── prisma.ts
│       │   ├── routes/
│       │   │   ├── auth.ts          # POST /login, /register, /register-professional
│       │   │   ├── users.ts         # GET /me, PATCH /profile
│       │   │   ├── requests.ts      # CRUD service_requests
│       │   │   ├── proposals.ts     # CRUD proposals
│       │   │   ├── jobs.ts          # CRUD jobs + status transitions
│       │   │   ├── messages.ts      # GET/POST messages por job
│       │   │   ├── reviews.ts       # POST review
│       │   │   ├── payments.ts      # Earnings, payment history
│       │   │   ├── categories.ts    # GET categories
│       │   │   ├── upload.ts        # Proxy para uploads (avatars, docs, fotos)
│       │   │   └── admin/
│       │   │       ├── dashboard.ts
│       │   │       ├── professionals.ts  # Approve/reject
│       │   │       ├── users.ts
│       │   │       └── requests.ts
│       │   ├── middleware/
│       │   │   ├── authenticate.ts  # Verifica JWT en cada request
│       │   │   └── authorize.ts     # Verifica rol (client, professional, admin)
│       │   ├── services/            # Lógica de negocio
│       │   │   ├── authService.ts   # Hash passwords, generar JWT, verificar
│       │   │   ├── requestService.ts
│       │   │   ├── proposalService.ts
│       │   │   ├── jobService.ts
│       │   │   ├── chatService.ts
│       │   │   ├── uploadService.ts # Sube a Supabase Storage via server
│       │   │   └── notificationService.ts
│       │   └── lib/
│       │       └── prisma.ts        # Prisma client singleton
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── db/                  # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── shared/              # Tipos compartidos, validaciones Zod
│       ├── src/
│       │   ├── types.ts
│       │   └── validators.ts  # Zod schemas para cada endpoint
│       └── package.json
├── package.json             # Workspace root
├── turbo.json               # Turborepo config
└── .gitignore
```

## PLAN DE EJECUCIÓN — FASES

### FASE 1: Setup monorepo + Backend base (NO tocar el frontend todavía)

1. **Crear estructura monorepo** con npm workspaces (o pnpm) + Turborepo
2. **Mover la app Expo actual** a `apps/mobile/` sin cambiar nada interno todavía
3. **Crear `apps/api/`** con Fastify + TypeScript:
   - `npm init`, instalar: `fastify`, `@fastify/jwt`, `@fastify/cors`, `@fastify/multipart`, `typescript`, `tsx`
   - Configurar tsconfig.json
4. **Crear `packages/db/`** con Prisma:
   - `npx prisma init`
   - Escribir `schema.prisma` que refleje EXACTAMENTE las tablas que ya existen en Supabase (users, professionals, categories, service_zones, professional_categories, professional_zones, service_requests, proposals, jobs, messages, reviews, payments, disputes)
   - Usar `npx prisma db pull` para introspectar el schema existente y no perder nada
   - DATABASE_URL apunta a la connection string de Supabase (la de "Direct connection", no la pooled)
5. **Crear `packages/shared/`** con validaciones Zod para cada entidad

### FASE 2: Auth propia en el backend

1. **Crear tabla `auth_credentials`** (o reusar la tabla `users` agregando `password_hash`):
   - Si ya usas Supabase Auth, los passwords están en `auth.users` (schema de Supabase, no accesible desde Prisma directo). Tenés dos opciones:
     - **Opción A (recomendada):** Agregar columna `password_hash` a tu tabla `public.users` y manejar auth 100% en tu backend con bcrypt
     - **Opción B:** Seguir usando Supabase Auth solo para el login y que tu backend valide los JWT de Supabase. Menos trabajo pero más acoplamiento
   - **Elegí Opción A** para máxima independencia
2. **Implementar rutas auth en el backend:**
   - `POST /api/v1/auth/register` — crea user + hash password con bcrypt + devuelve JWT
   - `POST /api/v1/auth/register-professional` — crea user + professional + hash password + devuelve JWT
   - `POST /api/v1/auth/login` — verifica password con bcrypt + devuelve JWT
   - `GET /api/v1/auth/me` — devuelve perfil del user autenticado
3. **JWT config:** Usar `@fastify/jwt` con secret en .env. Token incluye: `{ userId, role, iat, exp }`
4. **Middleware authenticate:** Decora cada ruta con verificación de JWT
5. **Middleware authorize:** Función helper `requireRole('admin')`, `requireRole('professional')`, etc.
6. **Migrar usuarios existentes:** Script one-time que toma los usuarios de Supabase Auth y les crea password_hash en tu tabla (o pedirles que reseteen password)

### FASE 3: Migrar endpoints del frontend al backend (uno por uno)

El orden importa. Migrá de lo más simple a lo más complejo:

1. **Categories** — `GET /api/v1/categories` (read-only, lo más fácil)
2. **Users/Profile** — `GET /api/v1/me`, `PATCH /api/v1/profile`
3. **Service Requests** — CRUD completo con validación Zod
   - `GET /api/v1/requests` (filtrado por rol: cliente ve los suyos, profesional ve los open de sus categorías)
   - `POST /api/v1/requests` (solo clients)
   - `GET /api/v1/requests/:id`
   - `PATCH /api/v1/requests/:id/cancel`
4. **Proposals** — `POST /api/v1/requests/:id/proposals`, `GET /api/v1/requests/:id/proposals`
5. **Jobs** — CRUD + transiciones de estado
6. **Messages/Chat** — `GET /api/v1/jobs/:id/messages`, `POST /api/v1/jobs/:id/messages`
7. **Reviews** — `POST /api/v1/jobs/:id/review`
8. **Payments/Earnings** — `GET /api/v1/earnings`
9. **Uploads** — Proxy server-side para subir a Supabase Storage
10. **Admin** — Dashboard, approve professionals, manage users/requests

**Para cada endpoint:**
- Crear ruta en Fastify
- Validar input con Zod
- Lógica de negocio en service layer
- Query a DB via Prisma
- Verificar auth + autorización
- Testear con curl o Postman antes de tocar el frontend

### FASE 4: Migrar el frontend

**Por cada feature migrada en Fase 3:**

1. Crear función en `apps/mobile/services/api.ts`:
```typescript
// ANTES (directo a Supabase):
const { data } = await supabase.from('service_requests').select('*').eq('client_id', userId)

// DESPUÉS (via backend):
const data = await apiFetch('/api/v1/requests', { headers: { Authorization: `Bearer ${token}` } })
```

2. Actualizar el store de Zustand para que use la función de `services/` en vez de Supabase SDK
3. Actualizar el screen que usa ese store
4. Testear que funcione igual que antes
5. **NO borrar el código viejo todavía** — comentalo con `// TODO: remove after migration`

### FASE 5: Limpiar

1. Desinstalar `@supabase/supabase-js` del package.json del mobile
2. Borrar `lib/supabase.ts`
3. Borrar todo el código comentado de Supabase
4. Borrar las RLS policies de Supabase (ya no las necesitás, el backend controla todo)
5. Verificar que no quede ninguna referencia directa a Supabase en el frontend

## REGLAS NO NEGOCIABLES

1. **NUNCA borrar datos de la DB.** Las tablas existentes se mantienen. Solo agregamos (columna password_hash, etc.)
2. **`npx prisma db pull` PRIMERO** antes de escribir cualquier schema. No inventar — introspectar lo que ya existe.
3. **Un endpoint a la vez.** No migrar todo junto. Crear endpoint backend → testear → migrar frontend → testear → siguiente.
4. **Validación Zod en CADA endpoint.** Sin excepciones.
5. **Secrets en .env.** DATABASE_URL, JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY (para Storage), todo en .env. NUNCA en código.
6. **El frontend NUNCA habla directo con Supabase.** Todo pasa por el backend. La única excepción temporal es durante la migración gradual.
7. **Cada commit debe dejar la app funcional.** Si rompés algo, arreglalo en el mismo commit.
8. **No tocar las screens de Expo Router** salvo para cambiar la fuente de datos (de Supabase SDK a api fetch).
9. **Prisma client como singleton.** Un solo PrismaClient instanciado en `packages/db/`.
10. **El chat/realtime puede seguir usando Supabase Realtime temporalmente** via el backend (websocket proxy), pero eventualmente se reemplaza.

## PRIORIDAD

Empezá por Fase 1 y Fase 2. Son la base. No pases a Fase 3 sin tener el backend corriendo con auth funcional y al menos un endpoint de prueba (categories).

Cuando termines Fase 1 y 2, pará y mostrámelo para validar antes de seguir.
