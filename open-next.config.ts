import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config mínima para Cloudflare Workers (mismo patrón que Alerta Violeta).
// Sin caché incremental en R2: las páginas son dinámicas, no usamos ISR.
export default defineCloudflareConfig();
