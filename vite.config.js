import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// NOTA: este archivo antes contenía por error contenido de Tailwind (ver tailwind.config.js).
// Vite lo ignoraba salvo `plugins`. Se mantiene el comportamiento previo (sin plugin de React)
// y solo se agrega el alias `@/` que necesita shadcn/ui. No se toca el pipeline de build.
export default {
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
