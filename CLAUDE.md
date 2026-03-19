# OficioYa - Marketplace de servicios del hogar

## Overview
App mobile (React Native/Expo) que conecta clientes con profesionales de servicios del hogar (electricistas, plomeros, gasistas, limpieza). Los clientes publican pedidos, los profesionales envian propuestas, y se asignan trabajos con chat en tiempo real.

## Tech Stack
- **Framework:** Expo SDK 54 + React Native
- **Router:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State:** Zustand
- **Language:** TypeScript

## Project Structure
```
app/
  _layout.tsx          # Root layout - auth listener, role-based routing
  index.tsx            # Splash/redirect
  (auth)/
    login.tsx          # Email/password login
    register.tsx       # Client registration
    register-professional.tsx  # Professional multi-step registration
  (client)/
    _layout.tsx        # Tab navigator (Inicio, Pedir ayuda, Perfil)
    index.tsx          # Active requests list (realtime)
    new-request.tsx    # 3-step request creation (category, description, urgency)
    edit-profile.tsx   # Edit client profile (name, phone, avatar)
    profile.tsx        # Client profile screen
    request/[id].tsx   # View proposals for a request
    job/[id].tsx       # Chat with professional
  (professional)/
    _layout.tsx        # Tab navigator (Pedidos, Ganancias, Perfil)
    index.tsx          # Feed of open requests (filtered by category)
    edit-profile.tsx   # Edit professional profile (name, phone, avatar, bio)
    profile.tsx        # Professional profile screen
    earnings.tsx       # Balance, payment history
    request/[id].tsx   # View request detail, submit proposal
    job/[id].tsx       # Chat with client
  (admin)/
    _layout.tsx        # Tab navigator (Dashboard, Profesionales, Usuarios, Pedidos)
    index.tsx          # Dashboard with stats
    professionals.tsx  # Approve/reject professionals
    users.tsx          # User management
    requests.tsx       # Request management
stores/
  authStore.ts         # Zustand: session, user, role helpers
  chatStore.ts         # Zustand: active chat state
  requestStore.ts      # Zustand: active requests
lib/
  supabase.ts          # Supabase client init
```

## Database (Supabase PostgreSQL)
### Tables
- **users** - id, email, phone, name, avatar_url, role (client|professional|both|admin), location, push_token
- **professionals** - user_id (FK), license_number, license_photo_url, dni_photo_url, selfie_url, bio, verified, status (pending_verification|verified|suspended), rating_avg, rating_count, jobs_completed, balance_due
- **categories** - id, name, slug, common_problems (JSONB), is_licensed, sort_order
- **service_zones** - id, name, city, province, boundary (PostGIS POLYGON)
- **professional_categories** - professional_id, category_id (many-to-many)
- **professional_zones** - professional_id, zone_id (many-to-many)
- **service_requests** - client_id, category_id, problem_type, description, photos (JSONB), urgency, location (PostGIS POINT), status (open|in_proposals|assigned|in_progress|completed|cancelled), max_proposals, proposals_count
- **proposals** - request_id, professional_id, price, message, estimated_arrival, status
- **jobs** - request_id, proposal_id, client_id, professional_id, agreed_price, payment_method, status (pending_start|in_progress|completed_by_professional|confirmed|disputed)
- **messages** - job_id, sender_id, content, flagged
- **reviews** - job_id, reviewer_id, reviewed_id, rating, comment
- **payments** - job_id, amount, commission_rate, commission_amount, net_to_professional, status
- **disputes** - job_id, opened_by, reason, evidence, status, resolution

### RLS Policies
- Row Level Security is enabled on ALL tables
- `get_user_role()` function (SECURITY DEFINER) is used to check role without recursion
- Authenticated users can read users and professionals tables
- Admin uses `get_user_role() = 'admin'` for elevated access
- Professionals see open requests filtered by their categories (professional_categories table)
- Original zone-based RLS policy exists but is not active (no zones configured yet)

### Storage Buckets
- **avatars** - User profile photos (public read, authenticated upload own folder)
- **professional-docs** - License, DNI, selfie photos (public read, authenticated upload)
- **request-photos** - Photos attached to service requests

## Supabase Credentials
- **URL:** https://ldjowvkqdqyjulnbpacx.supabase.co
- **Anon Key:** In .env.local (EXPO_PUBLIC_SUPABASE_ANON_KEY)
- **Service Role Key:** In .env (SUPABASE_SERVICE_ROLE_KEY) - NEVER commit this
- Use service role key for API operations that bypass RLS (creating data, admin operations)
- RLS policies (CREATE POLICY) can ONLY be created via SQL Editor in Supabase Dashboard - the REST API does not support DDL

## Test Accounts
- **Client:** test@test.com / test1234
- **Professional:** profesional@test.com / test1234 (verified, Electricista category)
- **Admin:** admin@oficioya.com / admin1234

## Key Patterns
- Auth state is managed in `_layout.tsx` via `onAuthStateChange` listener
- Role-based routing: admin -> /(admin), professional -> /(professional), client -> /(client)
- `fetchUserProfile()` reads from `users` table and routes based on role
- Realtime subscriptions use Supabase `postgres_changes` channel
- `useFocusEffect` is used to refresh data when returning to screens
- Professional registration creates both a `users` row and a `professionals` row
- No auth trigger exists - user rows are created manually in registration code

## Current Categories (seeded)
- Electricista
- Gasista
- Plomero
- Limpieza y mantenimiento

## What's NOT Implemented Yet
- Notifications (expo-notifications installed but not wired up)
- Ratings/Reviews system (tables exist, no UI)
- Mercado Pago payment integration
- Professional zone/category self-management
- Order history for clients
- Message moderation for admin

## Development
- Run with: `npx expo start` (from the oficioya/ directory)
- Test on phone via Expo Go app
- No web mode - mobile only
- Git repo: https://github.com/pedrocjs1/app-oficios.git

## Common Issues
- If login gets stuck loading, check RLS policies - infinite recursion in users table policies will cause this
- If professional sees no requests, check professional_categories table has entries
- New professionals need categories assigned after admin approval
- Storage uploads need correct RLS policies on storage.objects table
