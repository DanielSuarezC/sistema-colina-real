# Sistema Colina Real - Quick Setup Guide

## ⚡ Configuración Rápida (15 minutos)

### Paso 1: Crear Proyecto Supabase (5 min)

1. Ve a https://supabase.com
2. Click "New Project"
3. Selecciona tu organización o crea una nueva
4. Llena los datos:
   - **Name**: `sistema-colina-real`
   - **Database Password**:  guarda esta contraseña (no la necesitarás aquí)
   - **Region**: Selecciona la más cercana (e.g., `South America (São Paulo)`)
5. Click **Create new project**
6. Espera ~2 minutos mientras se crea el proyecto
 
### Paso 2: Obtener Credenciales (1 min)

1. Ve a **Settings** (⚙️) → **API**
2. Copia y guarda estos dos valores:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIs...
   ```

### Paso 3: Configurar Variables de Entorno (2 min)

1. Abre `src/environments/environment.ts`
2. Reemplaza:
   ```typescript
   url: 'YOUR_SUPABASE_PROJECT_URL',    // Pega Project URL
   anonKey: 'YOUR_SUPABASE_ANON_KEY'     // Pega anon public
   ```
3. Repite para `src/environments/environment.prod.ts`

### Paso 4: Crear Base de Datos (3 min)

1. En Supabase, ve a **SQL Editor** (icono </>)
2. Click **+ New Query**
3. Abre el archivo `supabase/database-schema.sql` local
4. Copia TODO el contenido (Ctrl+A, Ctrl+C)
5. Pega en el SQL Editor de Supabase
6. Click **RUN** (o F5)
7. Deberías ver: "Success. No rows returned"

### Paso 5: Verificar Tablas (1 min)

1. Ve a **Table Editor** en Supabase
2. Deberías ver 8 tablas:
   - ✅ sales
   - ✅ refacil_transactions
   - ✅ investments
   - ✅ expenses
   - ✅ cash_boxes (verifica que tenga 4 filas)
   - ✅ cash_box_transfers
   - ✅ liquidations
   - ✅ audit_log

### Paso 6: Crear Usuario (2 min)

1. En Supabase, ve a **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Ingresa:
   - **Email**: `admin@colineal.com` (o el que prefieras)
   - **Password**: `Admin123!` (elige una segura)
4. Click **Create user**
5. Opcional: Click **Send Magic Link** si quieres verificar el email

### Paso 7: Ejecutar Aplicación (1 min)

```bash
# Si no has instalado dependencias:
npm install

# Iniciar servidor de desarrollo:
npm start
```

Abre http://localhost:4200

### Paso 8: Login y Prueba

1. Ingresa con el usuario creado en Paso 6
2. Deberías ver el Dashboard con las 4 cajas en $0

## 🎯 Próximos Pasos

### Prueba la Regla Refácil (RF-05)

1. Ve a **Recargas** (botón verde en dashboard)
2. Ingresa monto: `100000`
3. Click **Registrar Recarga**
4. Vuelve al dashboard
5. Verifica:
   - **Beneficio Daniel**: $5,500.00 (5.5%)
   - **Caja Recargas**: $94,500.00 (94.5%)

### Prueba Registro de Venta

1. Ve a **Nueva Venta** (botón azul)
2. Selecciona categoría: **Inventario Daniel**
3. Monto Bruto: `50000`
4. COGS: `30000`
5. Click **Registrar Venta**
6. Vuelve al dashboard
7. Verifica:
   - **Caja Principal**: $20,000 (50000 - 30000)
   - Aparece en **Actividad Reciente**
   - Se refleja en el gráfico de ventas

### Prueba Transferencia entre Cajas

1. En Dashboard, click botón **Transferir** (morado)
2. Desde: **Caja Principal**
3. Hacia: **Caja ROI**
4. Monto: `10000`
5. Concepto: `Inversión inicial`
6. Click **Transferir**
7. Verifica que los saldos cambien inmediatamente

## ⚠️ Troubleshooting

### Error: "Failed to fetch"
- Verifica que las credenciales en `environment.ts` sean correctas
- Verifica que el proyecto de Supabase esté activo (no en pausa)

### Error: "Invalid user credentials"
- Verifica que el usuario exista en Supabase Authentication
- Prueba resetear la contraseña desde Supabase

### Tablas no aparecen
- Verifica que el SQL se ejecutó sin errores
- Revisa la consola del SQL Editor por errores rojos
- Intenta ejecutar el script de nuevo (es idempotente con `IF NOT EXISTS`)

### Saldos no se actualizan
- Abre la consola del navegador (F12)
- Revisa si hay errores rojos
- Verifica que los triggers se crearon: en Supabase → **Database** → **Triggers**

## 📱 Acceso desde otros dispositivos

### Localhost (misma red WiFi)

1. Encuentra tu IP local:
   ```bash
   # Windows
   ipconfig
   # Busca "IPv4 Address"
   ```
2. En otro dispositivo, abre: `http://TU_IP:4200`
   - Ejemplo: `http://192.168.1.100:4200`

### Internet (Deployment)

Ver archivo `README.md` sección de deployment para opciones con Vercel/Netlify.

## 🎓 Referencias Rápidas

- [Supabase Docs](https://supabase.com/docs)
- [Angular Signals](https://angular.dev/guide/signals)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [NgCharts](https://valor-software.com/ng2-charts/)
