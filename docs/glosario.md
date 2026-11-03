# Glosario de la fábrica

- Generador: agente que implementa el ticket con TDD y deja los cambios listos para el workflow.
- Revisor: agente que examina los cambios del generador y señala errores antes de aprobarlos.
- Coordinador: parte que orquesta el flujo, asignando el ticket al generador y al revisor y cerrando el ciclo.
- QA staging: revisión de Darío sobre lo ya desplegado en staging.
- Puente: componente que recibe el aviso de Linear, verifica su firma y lanza el flujo en GitHub.
