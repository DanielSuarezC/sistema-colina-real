# README - Sistema Colina Real

Sistema contable para la gestión financiera del negocio Colina Real, con reglas especiales de distribución de ganancias entre dos socios (Robert y Daniel).

## Características

✅ **Angular 17+** con Standalone Components  
✅ **Tailwind CSS** con modo oscuro/claro  
✅ **Signals** para estado reactivo  
✅ **LocalStorage** para persistencia sin backend  
✅ **Exportación a Excel** con reportes detallados  

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
ng serve

# Compilar para producción
ng build
```

## Uso

La aplicación gestiona tres tipos de transacciones principales:

### 1. Recargas (Refacil)
- Ganancia: 5.5% para Daniel
- Fondo Refacil: 94.5% (capital retornable)

### 2. Servicios e Inventario Daniel
- Daniel recupera 100% del costo
- Utilidad dividida 50/50

### 3. Inventario Robert
- Venta total dividida 50/50

## Estructura

```
src/app/
├── models/           # Interfaces TypeScript
├── services/         # Lógica de negocio
└── components/       # UI Components
```

## Tecnologías

- Angular 17+
- Tailwind CSS
- TypeScript
- SheetJS (xlsx)
- UUID

## Licencia

Uso privado para Colina Real
