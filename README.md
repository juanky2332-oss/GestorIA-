# GestorIA - Auditor de Documentos

Aplicación corporativa para la digitalización y análisis automatizado de documentos (Tickets, Facturas, Albaranes) utilizando IA Generativa (Gemini).

## 🛠 Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/generative-ai`)
- **Icons:** Lucide React

## 🚀 Instalación y Desarrollo

1. **Clonar e instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tu API Key de Gemini:
   ```env
   VITE_API_KEY=tu_api_key_aqui
   ```

3. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Construir para producción:**
   ```bash
   npm run build
   ```

## 📁 Estructura del Proyecto

```
/
├── components/         # Componentes React reutilizables (UI)
├── services/          # Lógica de negocio e integración con API (Gemini)
├── utils/             # Funciones de utilidad (helpers)
├── App.tsx            # Componente principal y gestión de estado
├── index.tsx          # Punto de entrada de la aplicación
├── types.ts           # Definiciones de tipos TypeScript
└── ...config files    # Archivos de configuración (Vite, Tailwind, TS)
```

## 📦 Despliegue (Vercel)

El proyecto está listo para desplegarse en Vercel con configuración cero (Zero Config).

1. Importa el repositorio en Vercel.
2. En la configuración del proyecto en Vercel, añade la variable de entorno `VITE_API_KEY`.
3. Vercel detectará automáticamente Vite y ejecutará `npm run build`.
