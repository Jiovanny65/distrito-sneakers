# Speed Style CL — Guía de configuración Supabase

## ⚠️ Antes de empezar

**Rota AHORA estos secretos** que se filtraron:

1. Supabase Dashboard → Settings → API → resetea el **secret key** (`sb_secret_...`)
2. vercel.com → Account Settings → Tokens → revoca el token comprometido
3. github.com → Settings → Developer settings → Personal access tokens → revoca el PAT

La **publishable key** (`sb_publishable_...`) está bien expuesta en el frontend — es su propósito.

---

## 1. Configurar la base de datos

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto `avxqwalugyjauwayxjvn` → **SQL Editor**.
2. Pega y ejecuta el contenido de [`db/schema.sql`](db/schema.sql) (crea la tabla, RLS y bucket de Storage).
3. Pega y ejecuta el contenido de [`db/seed.sql`](db/seed.sql) (inserta los 26 productos iniciales).

## 2. Crear el usuario admin

1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Ingresa email y contraseña. Marca **"Auto Confirm User"** para evitar verificación por email.
3. Ese email/contraseña son los que usarás para entrar al panel admin.

## 3. Probar

- **Tienda pública:** abre `index.html` (o ejecuta `abrir_tienda.bat`).
  Los productos se cargan desde Supabase.
- **Panel admin:** abre `admin.html` (o ejecuta `abrir_admin.bat`).
  Inicia sesión con el usuario que creaste. Desde ahí puedes:
  - Crear, editar, duplicar, eliminar productos
  - Subir fotos directo a Supabase Storage
  - Marcar productos como destacados
  - Activar/desactivar productos sin borrarlos

## 4. Deploy a Vercel (cuando hayas rotado el token)

Estructura ya lista, sin build step. Solo:

```bash
git init
git add .
git commit -m "Speed Style CL v1"
gh repo create distrito-sneakers --public --source=. --push
```

Luego en vercel.com → New Project → importa el repo → Deploy. Sin variables de entorno necesarias en este momento (la URL y publishable key de Supabase ya están en el código del cliente).

---

## Estructura de archivos

```
TIENDA_ALEX_DEMO/
├── index.html              # Tienda pública
├── styles.css              # Estilos tienda
├── script.js               # Lógica tienda (lee de Supabase)
├── admin.html              # Panel admin
├── admin.css               # Estilos admin
├── admin.js                # Lógica admin (CRUD)
├── supabase-config.js      # Cliente compartido
├── abrir_tienda.bat        # Atajo Windows
├── abrir_admin.bat         # Atajo Windows
├── assets/
│   ├── logo.png
│   └── hero-shoe.png
└── db/
    ├── schema.sql          # Estructura BD + RLS + Storage
    └── seed.sql            # 26 productos iniciales
```
