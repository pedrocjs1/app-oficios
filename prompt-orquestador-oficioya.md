# AGENTE ORQUESTADOR — Reestructuración OficioYa

Sos el agente orquestador. Tu trabajo es ejecutar la reestructuración de OficioYa dividiendo el trabajo en sub-tareas atómicas y lanzando sub-agentes con `claude -p` para cada una.

## REGLAS DEL ORQUESTADOR

1. Ejecutás UNA tarea a la vez con `claude -p "instrucciones"` en la terminal
2. Después de cada sub-agente, verificás que no haya errores (revisá archivos creados, corré `npx tsc --noEmit` si aplica)
3. Si hay error, lanzás otro sub-agente para corregirlo ANTES de seguir
4. NO pasás a la siguiente fase sin que todo compile y funcione
5. Hacés `git add -A && git commit -m "descripción"` después de cada fase completada

## ARCHIVO DE REFERENCIA

Leé el archivo `mega-prompt-reestructuracion-oficioya.md` que tiene todo el plan detallado. Seguí las fases en orden.

## EJECUCIÓN — FASE 1

Lanzá estos sub-agentes en orden. Esperá a que cada uno termine antes de lanzar el siguiente:

### Tarea 1.1: Crear estructura monorepo
```bash
claude -p "Estamos reestructurando OficioYa a monorepo. Hacé lo siguiente:
1. Creá package.json raíz con workspaces: ['apps/*', 'packages/*']
2. Creá turbo.json con pipeline básico (build, dev, lint)
3. Creá las carpetas: apps/, packages/db/, packages/shared/
4. Mové TODO el contenido actual del proyecto (app/, components/, stores/, lib/, constants/, assets/, supabase/, package.json como mobile-package.json, etc.) a apps/mobile/
5. Actualizá el package.json de apps/mobile/ para que el name sea '@oficioya/mobile'
6. No modifiques ningún archivo interno — solo mové
7. Verificá que apps/mobile/ tenga su propio package.json y que la estructura de Expo Router siga intacta
NO borres nada. Solo reorganizá." --output-format text
```

### Tarea 1.2: Crear backend Fastify
```bash
claude -p "En el proyecto OficioYa (monorepo), creá apps/api/ con:
1. package.json con name '@oficioya/api', dependencias: fastify, @fastify/jwt, @fastify/cors, @fastify/multipart, bcrypt, zod
   devDependencies: typescript, tsx, @types/node, @types/bcrypt
2. tsconfig.json (strict, ESM, target ES2022)
3. src/server.ts — Fastify server en puerto 3001 con CORS habilitado, registro de plugins, health check en GET /health
4. src/plugins/auth.ts — Plugin @fastify/jwt con secret de process.env.JWT_SECRET
5. src/plugins/prisma.ts — Plugin que registra PrismaClient como decorador de Fastify
6. src/middleware/authenticate.ts — Hook preHandler que verifica JWT y pone user en request
7. src/middleware/authorize.ts — Función factory requireRole('admin') que verifica el rol del JWT
8. src/routes/auth.ts — Rutas placeholder: POST /api/v1/auth/login, POST /api/v1/auth/register, GET /api/v1/auth/me
9. src/routes/categories.ts — GET /api/v1/categories (lee de DB con Prisma, devuelve lista)
10. Script dev en package.json: 'tsx watch src/server.ts'
Usá import/export ESM. Cada archivo con tipos TypeScript explícitos." --output-format text
```

### Tarea 1.3: Setup Prisma
```bash
claude -p "En el proyecto OficioYa (monorepo), creá packages/db/ con:
1. package.json con name '@oficioya/db', dependencia: prisma, @prisma/client
2. tsconfig.json
3. Corré: cd packages/db && npx prisma init
4. Configurá el DATABASE_URL en .env apuntando a la connection string de Supabase (la directa, no pooled). Si no hay .env, creá .env.example con DATABASE_URL=postgresql://...
5. Corré: npx prisma db pull — para introspectar todas las tablas que ya existen en Supabase
6. Corré: npx prisma generate — para generar el client
7. Exportá el PrismaClient desde un index.ts
IMPORTANTE: NO modifiques el schema después del pull. Solo introspectá lo que ya existe." --output-format text
```

### Tarea 1.4: Setup shared package
```bash
claude -p "En el proyecto OficioYa (monorepo), creá packages/shared/ con:
1. package.json con name '@oficioya/shared', dependencia: zod
2. tsconfig.json
3. src/validators/auth.ts — Zod schemas: loginSchema (email + password), registerSchema (email, password, name, phone, role), registerProfessionalSchema (extiende register + license_number, bio, categories)
4. src/validators/requests.ts — Zod schemas: createRequestSchema (category_id, problem_type, description, urgency, location), updateRequestSchema (partial)
5. src/validators/proposals.ts — Zod schema: createProposalSchema (price, message, estimated_arrival)
6. src/types/index.ts — Types compartidos: UserRole enum, RequestStatus enum, JobStatus enum, ProposalStatus enum
7. Exportá todo desde src/index.ts
Todos los schemas Zod deben tener mensajes de error en español." --output-format text
```

### Tarea 1.5: Verificación Fase 1
```bash
claude -p "Verificá la reestructuración del monorepo OficioYa:
1. Corré 'npm install' desde la raíz — verificá que los workspaces se resuelvan
2. Verificá que apps/mobile/ tenga todos los archivos originales de Expo y que 'npx expo start' no tire errores de imports faltantes
3. Verificá que packages/db/ tenga el schema.prisma generado con las tablas correctas
4. Verificá que apps/api/ compile: cd apps/api && npx tsc --noEmit
5. Verificá que packages/shared/ compile: cd packages/shared && npx tsc --noEmit
6. Si hay errores, corregílos.
Reportá: qué funciona, qué falló, qué corregiste." --output-format text
```

Después de Tarea 1.5 exitosa:
```bash
git add -A && git commit -m "feat: restructure to monorepo with backend api, prisma, and shared packages"
```

## EJECUCIÓN — FASE 2

### Tarea 2.1: Auth service completo
```bash
claude -p "En apps/api/ de OficioYa, implementá el auth service completo:
1. src/services/authService.ts:
   - hashPassword(password) — bcrypt con salt rounds 12
   - verifyPassword(password, hash) — bcrypt compare
   - generateToken(user) — firma JWT con { userId: user.id, role: user.role, email: user.email }
   - Función registerUser(data) — valida con Zod schema de @oficioya/shared, hashea password, crea user en DB con Prisma, devuelve JWT
   - Función registerProfessional(data) — igual pero crea user + professional en transaction de Prisma
   - Función loginUser(email, password) — busca user por email, verifica password, devuelve JWT
   - Función getUserProfile(userId) — devuelve user con datos de professional si aplica
2. Actualizá src/routes/auth.ts para usar authService:
   - POST /api/v1/auth/register — body validado con Zod, llama registerUser
   - POST /api/v1/auth/register-professional — body validado con Zod, llama registerProfessional
   - POST /api/v1/auth/login — body validado con Zod, llama loginUser
   - GET /api/v1/auth/me — requiere authenticate middleware, llama getUserProfile
3. Agregá columna password_hash TEXT a la tabla users si no existe (creá una migración Prisma)
4. Manejo de errores: email duplicado → 409, credenciales inválidas → 401, validación fallida → 400
IMPORTANTE: Usá @oficioya/db para Prisma y @oficioya/shared para validaciones Zod." --output-format text
```

### Tarea 2.2: Primer endpoint de negocio (categories)
```bash
claude -p "En apps/api/ de OficioYa, implementá el endpoint de categories completo:
1. src/services/categoryService.ts — getAll() lee categories de DB con Prisma, ordenadas por sort_order
2. src/routes/categories.ts — GET /api/v1/categories (público, sin auth) devuelve la lista
3. Testeá manualmente: arrancá el server con 'npm run dev' desde apps/api/ y hacé curl http://localhost:3001/api/v1/categories
4. Verificá que devuelva las categorías que ya existen en Supabase (Electricista, Gasista, Plomero, Limpieza y mantenimiento)
Si no hay datos, es un problema de conexión a la DB. Verificá DATABASE_URL." --output-format text
```

### Tarea 2.3: Verificación Fase 2
```bash
claude -p "Verificá que el auth y categories de OficioYa backend funcionen:
1. Arrancá el server: cd apps/api && npm run dev
2. Testeá: curl http://localhost:3001/health — debe devolver 200
3. Testeá: curl http://localhost:3001/api/v1/categories — debe devolver categorías
4. Testeá registro: curl -X POST http://localhost:3001/api/v1/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test1234\",\"name\":\"Test User\",\"phone\":\"123456\",\"role\":\"client\"}'
5. Testeá login: curl -X POST http://localhost:3001/api/v1/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"test1234\"}'
6. Testeá /me con el token del login: curl http://localhost:3001/api/v1/auth/me -H 'Authorization: Bearer TOKEN_DEL_LOGIN'
7. Reportá resultados. Si algo falla, corregílo." --output-format text
```

Después de Tarea 2.3 exitosa:
```bash
git add -A && git commit -m "feat: auth service with JWT + categories endpoint"
```

## DESPUÉS DE FASE 1 y 2

PARÁ ACÁ. Mostrámelo. Yo valido y te doy luz verde para seguir con Fase 3 (migrar endpoints uno por uno) y Fase 4 (migrar frontend).
