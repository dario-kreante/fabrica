# Instalar la fábrica en un repo

La fábrica lleva tickets de Linear hasta staging. Publicar a producción queda siempre fuera de ella.

## Lo que necesita el repo

1. **Rama `staging`**, creada desde la rama de confianza (`main` o `master`).
2. **Ambiente de staging con datos propios.** Nada de lo que se despliega como preview puede leer ni escribir datos de producción: lo que hace el agente se ejecuta con esas variables.
3. **Secretos del repo:** `LINEAR_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` y `VERCEL_TOKEN`.
4. **Permiso de Actions para crear PR:** Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests".
5. **Dos workflows cortos** en `.github/workflows/`, `ticket.yml` y `proyecto.yml`, que llaman a `motor-ticket.yml` y `motor-proyecto.yml` con la configuración del repo. Copia los de `apps-del-sur-web`.

| Dato | Para qué |
| --- | --- |
| `trusted_ref` | Rama que el agente nunca toca |
| `allowed_dirs` | Carpetas que el generador puede cambiar. Nunca incluir lo que define la ejecución, como `.github`, `scripts` o `package.json` |
| `vercel_project_id` | Proyecto donde se despliega staging |
| `staging_alias` | Dominio fijo de staging |
| `generator_setup` | Instalación antes del generador, sin ejecutar código: `npm ci --ignore-scripts` |
| `setup`, `verify` | Instalación y verificación completa, sin secretos |
| `generator_tests`, `generator_bash` | Lo que el generador puede ejecutar |

## En la fábrica

1. Crea el proyecto en Linear.
2. Agrégalo a `PROJECTS` en `lib/proyecto.js`, con su repo y su rama de confianza.
3. Fusiona a `main` y publica el puente.
4. Confirma que `GITHUB_DISPATCH_TOKEN` del puente tenga permiso de Actions en el repo nuevo.

## Cómo se usa

- **Un ticket:** etiqueta `fabrica:go` en el ticket, que debe pertenecer a un proyecto habilitado.
- **Un proyecto completo:** etiqueta de proyecto `fabrica:go`. El coordinador ordena los pendientes y omite lo ambiguo.
- **Tu parte:** revisar lo que llega a QA staging. Lo que falla vuelve como comentario o ticket nuevo.
