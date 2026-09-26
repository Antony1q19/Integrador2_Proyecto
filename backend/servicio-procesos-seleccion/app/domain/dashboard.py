"""Cálculo de los indicadores del Dashboard (reglas de negocio, sin base de datos).

Esta función recibe los datos ya leídos (anuncios, postulaciones, historial, evaluaciones)
y devuelve los números que se muestran en el Dashboard. Está separada de las rutas para que
se pueda probar sola y para que, si una fórmula cambia, se cambie solo aquí.

Cómo se interpretan las fechas:
  - Las fechas se cuentan en HORA DE PERÚ (UTC-5), no en UTC: una postulación hecha a las
    9 p.m. del día 20 cuenta como del día 20.
  - "Postulaciones del periodo" (la cohorte) = las postulaciones RECIBIDAS dentro del rango.
    El embudo, los estados y las tasas se calculan sobre esa cohorte: "de las personas que
    postularon en este periodo, ¿en qué etapa están hoy?".
  - Las contrataciones de la serie por fecha se cuentan por el día en que se marcó
    "Contratado", aunque la postulación sea anterior al rango.
"""
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

ZONA_PERU = timezone(timedelta(hours=-5))

ETAPAS = ["POSTULADO", "EN_EVALUACION", "ENTREVISTA", "PRESELECCIONADO", "CONTRATADO", "DESCARTADO"]
ETAPAS_FINALES = {"CONTRATADO", "DESCARTADO"}

COMPETENCIAS = [
    ("comunicacionEfectiva", "Comunicación efectiva"),
    ("orientacionCliente", "Orientación al cliente"),
    ("responsabilidad", "Responsabilidad"),
    ("adaptabilidadFlexibilidad", "Adaptabilidad y flexibilidad"),
    ("toleranciaPresion", "Tolerancia a la presión"),
    ("dinamismoEnergia", "Dinamismo y energía"),
]

MAXIMO_DIAS_DE_RANGO = 1830  # unos 5 años
CANTIDAD_ACTIVIDAD_RECIENTE = 8
CANTIDAD_AGENDA = 6  # cuántas entrevistas / controles próximos se listan en el Dashboard


def limites_del_rango(desde: date, hasta: date) -> tuple[datetime, datetime]:
    """Convierte "desde/hasta" (días completos, ambos incluidos) en [inicio, fin) con hora de Perú."""
    inicio = datetime.combine(desde, time.min, ZONA_PERU)
    fin = datetime.combine(hasta + timedelta(days=1), time.min, ZONA_PERU)
    return inicio, fin


def _porcentaje(parte: int, total: int) -> float:
    return round(parte * 100 / total, 1) if total else 0.0


def _promedio(valores: list[float]) -> float | None:
    return round(sum(valores) / len(valores), 1) if valores else None


def _granularidad(desde: date, hasta: date) -> str:
    """Cada cuánto se agrupa la serie: día (rangos cortos), semana o mes (rangos largos)."""
    dias = (hasta - desde).days + 1
    if dias <= 62:
        return "dia"
    if dias <= 240:
        return "semana"
    return "mes"


def _inicio_de_bloque(dia: date, granularidad: str) -> date:
    if granularidad == "semana":
        return dia - timedelta(days=dia.weekday())  # lunes de esa semana
    if granularidad == "mes":
        return dia.replace(day=1)
    return dia


def _siguiente_bloque(dia: date, granularidad: str) -> date:
    if granularidad == "semana":
        return dia + timedelta(days=7)
    if granularidad == "mes":
        return (dia.replace(day=28) + timedelta(days=4)).replace(day=1)
    return dia + timedelta(days=1)


def calcular_dashboard(
    *,
    desde: date,
    hasta: date,
    anuncios: list[dict[str, Any]],
    procesos: list[dict[str, Any]],
    contrataciones: dict[str, datetime],
    eventos: list[dict[str, Any]],
    evaluaciones: list[dict[str, Any]],
    entrevistas: list[dict[str, Any]] | None = None,
    contrataciones_registradas: list[dict[str, Any]] | None = None,
    seguimientos_pendientes: list[dict[str, Any]] | None = None,
    ahora: datetime | None = None,
) -> dict[str, Any]:
    """Arma todos los indicadores del Dashboard.

    anuncios:       [{id, empresaId, empresaRazonSocial, cargo, estado, numeroVacantes}]
    procesos:       [{id, postulanteId, anuncioId, estado, fecha}]   (fecha con zona horaria)
    contrataciones: {id de la postulación: fecha en que se marcó "Contratado"} (solo las que hoy están Contratadas)
    eventos:        [{procesoId, estado, fecha, usuario}]   (cambios de etapa, para la actividad reciente)
    evaluaciones:   [{puntaje, resultado, competencias: {...}}]  (ya filtradas por rango y empresa)
    entrevistas:    [{id, procesoId, fecha, estado, modalidad}]   (todas las de esas postulaciones)
    contrataciones_registradas: [{procesoId, estado}]              (para contar los "por ingresar")
    seguimientos_pendientes:   [{id, procesoId, hitoDias, fecha}]  (controles post-ingreso "Pendiente"; fecha = date)
    ahora:          el momento actual (se puede fijar para probar; por defecto, ahora mismo)
    """
    inicio, fin = limites_del_rango(desde, hasta)
    anuncio_por_id = {a["id"]: a for a in anuncios}

    # La cohorte: postulaciones recibidas dentro del rango.
    cohorte = [p for p in procesos if inicio <= p["fecha"] < fin]

    # --- Resumen -----------------------------------------------------------
    por_estado = {etapa: 0 for etapa in ETAPAS}
    for p in cohorte:
        por_estado[p["estado"]] = por_estado.get(p["estado"], 0) + 1
    total = len(cohorte)
    contratados = por_estado["CONTRATADO"]
    descartados = por_estado["DESCARTADO"]
    en_proceso = total - contratados - descartados

    # Días desde que postuló hasta que lo contrataron (solo cohorte contratada).
    dias_para_contratar = [
        (contrataciones[p["id"]] - p["fecha"]).total_seconds() / 86400
        for p in cohorte
        if p["estado"] == "CONTRATADO" and p["id"] in contrataciones
    ]

    anuncios_activos = [a for a in anuncios if a["estado"] != "Cerrado"]
    contratados_total_por_anuncio: dict[int, int] = defaultdict(int)
    for p in procesos:
        if p["estado"] == "CONTRATADO":
            contratados_total_por_anuncio[p["anuncioId"]] += 1
    vacantes_activas = sum(a["numeroVacantes"] for a in anuncios_activos)
    vacantes_cubiertas = sum(
        min(contratados_total_por_anuncio[a["id"]], a["numeroVacantes"]) for a in anuncios_activos
    )

    puntajes = [e["puntaje"] for e in evaluaciones]
    resumen = {
        "postulaciones": total,
        "postulantesUnicos": len({p["postulanteId"] for p in cohorte}),
        "enProceso": en_proceso,
        "contratados": contratados,
        "descartados": descartados,
        "tasaContratacion": _porcentaje(contratados, total),
        "tasaDescarte": _porcentaje(descartados, total),
        "diasPromedioContratacion": _promedio(dias_para_contratar),
        "anunciosActivos": len(anuncios_activos),
        "vacantesActivas": vacantes_activas,
        "vacantesCubiertas": vacantes_cubiertas,
        "coberturaVacantes": _porcentaje(vacantes_cubiertas, vacantes_activas),
        "evaluaciones": len(evaluaciones),
        "puntajePromedio": _promedio(puntajes),
        "porcentajeApto": _porcentaje(sum(1 for e in evaluaciones if e["resultado"] == "APTO"), len(evaluaciones)),
    }

    # --- Embudo (etapa actual de la cohorte) --------------------------------
    embudo = [{"estado": etapa, "cantidad": por_estado[etapa]} for etapa in ETAPAS]

    # --- Serie en el tiempo -------------------------------------------------
    granularidad = _granularidad(desde, hasta)
    postulaciones_por_bloque: dict[date, int] = defaultdict(int)
    contrataciones_por_bloque: dict[date, int] = defaultdict(int)
    for p in cohorte:
        postulaciones_por_bloque[_inicio_de_bloque(p["fecha"].astimezone(ZONA_PERU).date(), granularidad)] += 1
    for p in procesos:
        fecha_contratacion = contrataciones.get(p["id"]) if p["estado"] == "CONTRATADO" else None
        if fecha_contratacion is not None and inicio <= fecha_contratacion < fin:
            contrataciones_por_bloque[_inicio_de_bloque(fecha_contratacion.astimezone(ZONA_PERU).date(), granularidad)] += 1

    puntos = []
    bloque = _inicio_de_bloque(desde, granularidad)
    while bloque <= hasta:  # se incluyen también los bloques en cero, para que la gráfica no tenga huecos
        puntos.append(
            {
                "fecha": bloque.isoformat(),
                "postulaciones": postulaciones_por_bloque.get(bloque, 0),
                "contrataciones": contrataciones_por_bloque.get(bloque, 0),
            }
        )
        bloque = _siguiente_bloque(bloque, granularidad)

    # --- Por anuncio y por empresa -----------------------------------------
    por_anuncio = []
    for a in anuncios:
        suyos = [p for p in cohorte if p["anuncioId"] == a["id"]]
        contratados_anuncio = sum(1 for p in suyos if p["estado"] == "CONTRATADO")
        descartados_anuncio = sum(1 for p in suyos if p["estado"] == "DESCARTADO")
        total_contratados = contratados_total_por_anuncio[a["id"]]
        por_anuncio.append(
            {
                "anuncioId": a["id"],
                "cargo": a["cargo"],
                "empresaId": a["empresaId"],
                "empresaRazonSocial": a["empresaRazonSocial"],
                "estado": a["estado"],
                "vacantes": a["numeroVacantes"],
                "postulaciones": len(suyos),
                "enProceso": len(suyos) - contratados_anuncio - descartados_anuncio,
                "contratados": contratados_anuncio,
                "contratadosTotal": total_contratados,
                "cobertura": min(100.0, _porcentaje(total_contratados, a["numeroVacantes"])),
            }
        )
    por_anuncio.sort(key=lambda fila: (-fila["postulaciones"], fila["anuncioId"]))

    empresas: dict[int, dict[str, Any]] = {}
    for fila in por_anuncio:
        e = empresas.setdefault(
            fila["empresaId"],
            {
                "empresaId": fila["empresaId"],
                "razonSocial": fila["empresaRazonSocial"],
                "anunciosActivos": 0,
                "vacantes": 0,
                "postulaciones": 0,
                "enProceso": 0,
                "contratados": 0,
            },
        )
        if fila["estado"] != "Cerrado":
            e["anunciosActivos"] += 1
            e["vacantes"] += fila["vacantes"]
        e["postulaciones"] += fila["postulaciones"]
        e["enProceso"] += fila["enProceso"]
        e["contratados"] += fila["contratados"]
    por_empresa = sorted(empresas.values(), key=lambda e: (-e["postulaciones"], e["razonSocial"]))
    for e in por_empresa:
        e["tasaContratacion"] = _porcentaje(e["contratados"], e["postulaciones"])

    # --- Competencias -------------------------------------------------------
    competencias = [
        {
            "clave": clave,
            "etiqueta": etiqueta,
            "promedio": _promedio([e["competencias"][clave] for e in evaluaciones]),
        }
        for clave, etiqueta in COMPETENCIAS
    ]

    # --- Actividad reciente (cambios de etapa dentro del rango) -------------
    proceso_por_id = {p["id"]: p for p in procesos}
    recientes = sorted(
        (ev for ev in eventos if inicio <= ev["fecha"] < fin and ev["procesoId"] in proceso_por_id),
        key=lambda ev: ev["fecha"],
        reverse=True,
    )[:CANTIDAD_ACTIVIDAD_RECIENTE]
    actividad = []
    for ev in recientes:
        proceso = proceso_por_id[ev["procesoId"]]
        anuncio = anuncio_por_id.get(proceso["anuncioId"], {})
        actividad.append(
            {
                "fecha": ev["fecha"].isoformat(),
                "postulanteId": proceso["postulanteId"],
                "cargo": anuncio.get("cargo", ""),
                "empresa": anuncio.get("empresaRazonSocial", ""),
                "estado": ev["estado"],
                "usuario": ev["usuario"],
            }
        )

    # --- Agenda: entrevistas y seguimientos post-ingreso ----------------------
    # Estos indicadores son "de hoy en adelante" (una foto del momento), no dependen del rango de fechas,
    # salvo las entrevistas realizadas, que sí se cuentan dentro del rango.
    ahora = ahora or datetime.now(ZONA_PERU)
    hoy = ahora.astimezone(ZONA_PERU).date()
    inicio_de_hoy = datetime.combine(hoy, time.min, ZONA_PERU)
    entrevistas = entrevistas or []
    programadas = sorted(
        (e for e in entrevistas if e["estado"] == "Programada" and e["fecha"] >= inicio_de_hoy),
        key=lambda e: e["fecha"],
    )
    seguimientos_pendientes = sorted(seguimientos_pendientes or [], key=lambda s: s["fecha"])

    resumen["entrevistasHoy"] = sum(1 for e in programadas if e["fecha"].astimezone(ZONA_PERU).date() == hoy)
    resumen["entrevistasProximas"] = sum(1 for e in programadas if e["fecha"] < inicio_de_hoy + timedelta(days=8))
    resumen["entrevistasRealizadas"] = sum(1 for e in entrevistas if e["estado"] == "Realizada" and inicio <= e["fecha"] < fin)
    resumen["seguimientosPendientes"] = len(seguimientos_pendientes)
    resumen["seguimientosVencidos"] = sum(1 for s in seguimientos_pendientes if s["fecha"] < hoy)
    resumen["ingresosPorIniciar"] = sum(1 for c in (contrataciones_registradas or []) if c["estado"] == "Por ingresar")

    def datos_de(proceso_id: str) -> dict[str, Any]:
        proceso = proceso_por_id.get(proceso_id)
        anuncio = anuncio_por_id.get(proceso["anuncioId"], {}) if proceso else {}
        return {
            "postulanteId": proceso["postulanteId"] if proceso else "",
            "cargo": anuncio.get("cargo", ""),
            "empresa": anuncio.get("empresaRazonSocial", ""),
        }

    agenda = {
        "proximasEntrevistas": [
            {"id": e["id"], "fechaHora": e["fecha"].isoformat(), "modalidad": e["modalidad"], **datos_de(e["procesoId"])}
            for e in programadas[:CANTIDAD_AGENDA]
        ],
        "seguimientosPorHacer": [
            {
                "id": s["id"],
                "hitoDias": s["hitoDias"],
                "fechaProgramada": s["fecha"].isoformat(),
                "vencido": s["fecha"] < hoy,
                **datos_de(s["procesoId"]),
            }
            for s in seguimientos_pendientes[:CANTIDAD_AGENDA]
        ],
    }

    return {
        "rango": {"desde": desde.isoformat(), "hasta": hasta.isoformat(), "granularidad": granularidad},
        "resumen": resumen,
        "embudo": embudo,
        "serie": puntos,
        "porEmpresa": por_empresa,
        "porAnuncio": por_anuncio,
        "competencias": competencias,
        "actividad": actividad,
        "agenda": agenda,
    }
