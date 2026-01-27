# ClanWars League

Plataforma de liga de clanes competitiva con arquitectura similar a ClanWars.cc.

## Características

### Sistema de Usuarios
- Registro obligatorio mediante email
- Nickname público (email solo para seguridad)
- Indicador de estado en tiempo real (Activo/Inactivo)
- Perfiles de jugador con estadísticas

### Gestión de Clanes
- Límites de 5-10 jugadores por clan
- Roles: Capitán (Boss) y Miembros
- Sistema de invitaciones por email
- Solo el capitán puede invitar y expulsar

### Sistema de Reportes (Estilo ClanWars)
- Solo el clan perdedor reporta la derrota
- Cualquier miembro del roster puede reportar
- Validación cruzada de emails
- Actualización automática de puntos y rankings

### Puntuación
- Victoria: +3 puntos
- Power Win (diferencia ≥5): +4 puntos
- Derrota: 0 puntos

### Panel de Administrador
- Gestión de clanes y usuarios
- Ajuste de puntos y Power Wins
- Eliminación de cuentas/clanes
- Registro de acciones administrativas

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd clan-wars-league
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar el schema SQL en `supabase/schema.sql`
3. Copiar `.env.example` a `.env` y agregar las credenciales:

```bash
cp .env.example .env
```

Editar `.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Crear usuario admin

Después de registrar tu primera cuenta, ejecuta en Supabase SQL:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

## Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS (Modo Oscuro)
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **Tiempo Real**: Supabase Realtime

## Estructura del Proyecto

```
src/
├── components/
│   ├── layout/        # Navbar, Layout
│   └── ui/            # StatusIndicator, Modal, Alert, etc.
├── contexts/
│   └── AuthContext    # Autenticación global
├── hooks/
│   ├── useClans       # Gestión de clanes
│   ├── useMatches     # Reportes y rankings
│   ├── useAdmin       # Acciones de admin
│   └── useProfiles    # Perfiles de usuario
├── pages/
│   ├── HomePage       # Rankings globales
│   ├── ClanPage       # Perfil de clan
│   ├── PlayerPage     # Perfil de jugador
│   ├── AdminPage      # Panel de administrador
│   └── ...
├── lib/
│   └── supabase       # Cliente Supabase
└── types/
    └── database       # Tipos TypeScript
```

## Capturas de Pantalla

- **Rankings**: Tabla global con Rango, Clan, PJ, PG, PP, Power Wins, Puntos
- **Perfil de Clan**: Lista de miembros con estado activo/inactivo
- **Panel Admin**: Gestión completa de la plataforma

## Licencia

MIT
