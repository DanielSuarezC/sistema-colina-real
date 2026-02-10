# Sistema Colina Real - Financial Management System

Sistema de gestión financiera completo construido con **Angular 17+** y **Supabase** para centralizar las operaciones financieras del negocio de impresiones y recargas.

## 🚀 Características Principales

- ✅ **4 Cajas Financieras**: Principal, Recargas, ROI, Beneficio Daniel
- ✅ **Regla Refácil Automatizada**: División automática 5.5% / 94.5%
- ✅ **Sistema de Liquidaciones**: Cálculo automático de beneficios 50% Daniel / 50% Sr. Robert
- ✅ **Dashboard Interactivo**: Widgets en tiempo real con gráficos de ventas semanales
- ✅ **Gestión de Ventas**: Formulario inteligente con COGS condicional
- ✅ **Auditoría Completa**: Seguimiento de cambios con timestamps
- ✅ **Autenticación**: Login seguro con Supabase Auth
- ✅ **Responsive Design**: Optimizado para escritorio y móvil (Ionic-ready)

## 📋 Stack Tecnológico

- **Frontend**: Angular 17+ (Standalone Components, Signals, Control Flow)
- **Estilos**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL con Row Level Security)
- **Gráficos**: NgCharts (Chart.js)
- **Autenticación**: Supabase Auth

## 🛠️ Configuración Inicial

### 1. Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase (gratuita en https://supabase.com)

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Supabase

#### A. Crear Proyecto en Supabase

1. Ve a https://supabase.com y crea un nuevo proyecto
2. Espera a que el proyecto esté listo (toma ~2 minutos)
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL**
   - **anon/public key**

#### B. Configurar Variables de Entorno

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'TU_SUPABASE_PROJECT_URL',  // Pegar aquí
    anonKey: 'TU_SUPABASE_ANON_KEY'   // Pegar aquí
  }
};
```

Y también `src/environments/environment.prod.ts` con los mismos valores.

#### C. Ejecutar el Esquema de Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Crea un nuevo query
3. Copia TODO el contenido de `supabase/database-schema.sql`
4. Pega y ejecuta (click en **RUN** o F5)
5. Verifica que se crearon las 8 tablas en **Table Editor**

#### D. Crear Usuario de Prueba

1. En Supabase, ve a **Authentication** → **Users**
2. Click en **Add User** → **Create new user**
3. Ingresa email y contraseña
4. Click en **Create user**

### 4. Ejecutar la Aplicación

```bash
npm start
```

La aplicación estará disponible en http://localhost:4200

## 📊 Estructura de Base de Datos

### Tables (`supabase/database-schema.sql`)

| Tabla | Descripción |
|-------|-------------|
| `sales` | Ventas por categoría con COGS y utilidad neta |
| `refacil_transactions` | Recargas con split automático 5.5%/94.5% |
| `investments` | Inversiones con ROI tracking |
| `expenses` | Gastos operativos categorizados |
| `cash_boxes` | Las 4 cajas principales con saldos |
| `cash_box_transfers` | Transferencias entre cajas (auditoría) |
| `liquidations` | Cierres de período con splits 50/50 |
| `audit_log` | Log de cambios en todas las tablas |

### Triggers Automáticos

- ✅ **update_principal_box_on_sale**: Actualiza Caja Principal al registrar ventas
- ✅ **update_refacil_boxes**: Split automático 5.5%/94.5% en recargas
- ✅ **update_boxes_on_transfer**: Mantiene integridad en transferencias
- ✅ **log_audit_changes**: Registra todos los cambios automáticamente

## 🎯 Reglas de Negocio Implementadas

### RF-05: Regla Refácil
Cada recarga se divide automáticamente:
- **5.5%** → Caja Beneficio Daniel
- **94.5%** → Caja Recargas (capital de trabajo)

### RF-10: Liquidación 50/50
Cálculo de beneficio neto:
1. Sumar ventas brutas de todas las categorías
2. Restar costos (COGS) de cada venta
3. Restar gastos operativos (Nómina, Internet $52k, Luz, Resmas, Otros)
4. El beneficio neto resultante se divide:
   - **50% Daniel**
   - **50% Sr. Robert**

### RF-12: Transferencias entre Cajas
- Concepto obligatorio para auditoría
- Validación de saldo suficiente
- Log automático de todas las transferencias

## 🧩 Componentes Principales

### Dashboard (`/dashboard`)
- 4 widgets de cajas con gradientes
- Resumen de balance total, ventas y gastos mensuales
- Gráfico de barras apiladas (últimos 7 días)
- Acciones rápidas para registro
- Actividad reciente

### Formulario de Ventas (`/sales`)
- Campo COGS condicional según categoría
- Cálculo automático de utilidad neta
- Validaciones en tiempo real

### Formulario Refácil (`/recargas`)
- Vista previa del split 5.5%/94.5%
- Visualización de cajas de destino

### Login (`/login`)
- Autenticación con Supabase Auth
- Gestión de sesión persistente

## 🔐 Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Solo usuarios autenticados pueden acceder a datos
- Sesiones manejadas por Supabase Auth
- Auth Guard en todas las rutas protegidas

## 📱 Preparado para Móvil

La interfaz está diseñada con Tailwind CSS responsive, lista para migrar a **Ionic** para versiones nativas iOS/Android en el futuro.

## 🚧 Próximas Funcionalidades

Las siguientes funcionalidades están planificadas pero no implementadas en esta versión:

- [ ] Módulo de Inversiones con gráficos ROI
- [ ] Generador de Liquidaciones con cierre de períodos
- [ ] Historial de Auditoría UI
- [ ] Gestión de Gastos con formulario
- [ ] Exportación a Excel
- [ ] Reportes personalizados
- [ ] Notificaciones en tiempo real

## 📝 Notas Importantes

### Precisión Decimal
Todos los valores monetarios usan `DECIMAL(12,2)` en PostgreSQL para evitar errores de punto flotante.

### Datos de Prueba
Para probar la aplicación:

1. Crear algunas ventas desde `/sales`
2. Registrar recargas desde `/recargas`
3. Ver actualización en tiempo real en `/dashboard`
4. Las cajas se actualizan automáticamente gracias a los triggers

### Soporte

Para problemas o preguntas sobre la implementación:
- Revisar logs del navegador (F12 → Console)
- Revisar logs de Supabase (Supabase Dashboard → Logs)
- Verificar que las variables de entorno estén correctas

## 📄 Licencia

© 2026 Sistema Colina Real. Todos los derechos reservados.
