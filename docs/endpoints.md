# Endpoints

- `GET /api/health`: devuelve 200 con `{"ok":true}`; cualquier otro método responde 405.
- `POST /api/linear-webhook`: valida la firma de Linear y despacha el workflow `ticket.yml` de GitHub para el ticket recibido.
