/**
 * ============================================================
 * ARCHIVO: js/calculator.js
 * DESCRIPCIÓN: Motor de cálculo del sistema de costeo textil.
 * Replica exactamente las fórmulas del Excel NUEVA_FORMULACION.
 * Orden de columnas según Excel actualizado (imagen 1 y 2):
 *
 * SUB TL 1 → FIN IVA → IMPREV → SUB TL 2 → COP a USD →
 * KV MKUP[editable] → SUB TL 3 → AJUSTE USD[editable] →
 * SUB TL 4 → AMERINDIAS → SUB TL 5·AMER → FACTORING →
 * SUB TL 6·FACTORING → EXPORTACION → 10% ARANCELES →
 * SUB TL 5·EXPORT+ARAN → MARGEN SHOPMY[editable] →
 * MARGEN EXTRA[editable] → WS → RT MKUP → PRIMER RT → RT →
 * PRECIO VENTA SAS COP | PRECIO SUGERIDO | DIFERENCIA
 * ============================================================
 */


/**
 * ============================================================
 * ANÁLISIS DE HIPÓTESIS — CÁLCULO INVERSO
 * ============================================================
 * Dado un PRECIO OBJETIVO (RT en USD), calcula hacia atrás
 * qué valores de los campos editables son necesarios para
 * alcanzarlo, manteniendo fijos los costos de producción.
 *
 * Cadena inversa:
 *   RT objetivo → WS = RT / rtMkup
 *   WS → sub5E = WS - shopmy_actual - margen_actual
 *   sub5E → sub6 = sub5E / (1 + exp + aran)
 *   sub6 → sub5A = sub6 / (1 + fact)
 *   sub5A → sub4 = sub5A / (1 + amer)
 *   sub4 → kvMkup sugerido = (sub4 - ajuste_actual) / usd
 *   sub4 → ajuste sugerido = sub4 - sub3_actual
 *
 * @param {number} rtObjetivo  - Precio RT objetivo en USD
 * @param {Object} c           - Resultado de calcRow() (valores actuales)
 * @param {Object} p           - Parámetros globales getParams()
 * @returns {Object}           - Sugerencias de ajuste para cada campo editable
 * ============================================================
 */
function calcHipotesis(rtObjetivo, c, p) {
  const rt  = rtObjetivo;
  if (!rt || rt <= 0) return null;

  // ── Paso 1: WS necesario para lograr RT objetivo ──────────
  const wsNec = rt / p.rtMkup;

  // ── Paso 2: sub5E necesario (quitando shopmy y margen actuales) ──
  const sub5ENec = wsNec - c.shopmy - c.margen;

  // ── Paso 3: Deshacer exportación + aranceles ───────────────
  // sub5E = sub6 × (1 + exp + aran) → sub6 = sub5E / (1 + exp + aran)
  const sub6Nec = sub5ENec / (1 + p.exp + p.aran);

  // ── Paso 4: Deshacer factoring ─────────────────────────────
  // sub6 = sub5A × (1 + fact) → sub5A = sub6 / (1 + fact)
  const sub5ANec = sub6Nec / (1 + p.fact);

  // ── Paso 5: Deshacer amerindias ────────────────────────────
  // sub5A = sub4 × (1 + amer) → sub4 = sub5A / (1 + amer)
  const sub4Nec = sub5ANec / (1 + p.amer);

  // ── Paso 6: Opciones para llegar al sub4 necesario ────────
  // Opción A: cambiar KV MKUP (mantener ajuste actual)
  // sub3 = sub4 - ajuste → kvMkup = sub3 / usd
  const sub3NecA   = sub4Nec - c.ajuste;
  const kvMkupSug  = c.usd > 0 ? sub3NecA / c.usd : null;

  // Opción B: cambiar AJUSTE USD (mantener KV MKUP actual)
  // sub4 = sub3 + ajuste → ajuste = sub4 - sub3_actual
  const ajusteSug  = sub4Nec - c.sub3;

  // Opción C: cambiar MARGEN EXTRA (sub5E sube/baja)
  const margenSug  = wsNec - sub5ENec - c.shopmy;  // margen que haría cuadrar WS

  // Opción D: SHOP MY manual necesario (mantener todo lo demás)
  const shopmySug  = wsNec - sub5ENec - c.margen;

  // ── Diferencias respecto a valores actuales ────────────────
  const deltaKv     = kvMkupSug  != null ? kvMkupSug  - c.kvMkup  : null;
  const deltaAjuste = ajusteSug  - c.ajuste;
  const deltaMargen = margenSug  - c.margen;
  const deltaShopmy = shopmySug  - c.shopmy;

  // ── Brecha total entre RT actual y RT objetivo ────────────
  const brecha      = rt - c.rt;   // positivo = hay que subir precio
  const brechaWS    = wsNec - c.ws;

  return {
    rtObjetivo,
    wsNec:      Math.round(wsNec),
    sub5ENec:   Math.round(sub5ENec),
    sub4Nec:    Math.round(sub4Nec),
    // Valores sugeridos redondeados a 2 decimales
    kvMkupSug:  kvMkupSug != null ? Math.round(kvMkupSug * 100) / 100 : null,
    ajusteSug:  Math.round(ajusteSug * 100) / 100,
    margenSug:  Math.round(margenSug * 100) / 100,
    shopmySug:  Math.round(shopmySug * 100) / 100,
    // Deltas (cambio necesario)
    deltaKv:    deltaKv    != null ? Math.round(deltaKv    * 100) / 100 : null,
    deltaAjuste: Math.round(deltaAjuste * 100) / 100,
    deltaMargen: Math.round(deltaMargen * 100) / 100,
    deltaShopmy: Math.round(deltaShopmy * 100) / 100,
    // Brecha general
    brecha:     Math.round(brecha * 100) / 100,
    brechaWS:   Math.round(brechaWS * 100) / 100,
    // Valores actuales para referencia
    actual: {
      kvMkup:  c.kvMkup,
      ajuste:  c.ajuste,
      shopmy:  Math.round(c.shopmy),
      margen:  c.margen,
      ws:      Math.round(c.ws),
      rt:      Math.round(c.rt),
    }
  };
}


/**
 * Calcula el total de materiales (telas) de una referencia.
 */
function calcTtlMat(row) {
  return (row.m || []).reduce((sum, m) => sum + D(m.mts) * D(m.precio), 0);
}


/**
 * Calcula el total de insumos variables de una referencia.
 */
function calcTtlVar(row) {
  return (row.ins || []).reduce((sum, i) => sum + D(i.cant) * D(i.precio), 0);
}


/**
 * Calcula el total de insumos fijos por prenda.
 */
function calcTtlFijos() {
  return FIJOS.reduce((sum, f) => sum + D(f.precio) * D(f.qty), 0);
}


/**
 * Retorna los parámetros globales del panel de Consolidado.
 */
function getParams() {
  const el = id => document.getElementById(id);
  if (!el('p-trm')) return getDefaultParams();

  const v = id => D(el(id)?.value);
  return {
    trm:     v('p-trm'),           // Tasa de cambio COP/USD
    exp:     pct(v('p-exp')),      // % Exportación → decimal
    aran:    pct(v('p-aran')),     // % Aranceles → decimal
    amer:    pct(v('p-amer')),     // % Amerindias bodega → decimal
    fact:    pct(v('p-fact')),     // % Factoring → decimal
    rtMkup:  v('p-rt'),            // Multiplicador RT (ej: 2.4)
    ten11:   pct(v('p-10e')),      // % Comisión 10Eleven (ShopMy) → decimal
    iva:     pct(v('p-iva')),      // % IVA → decimal
    imprev:  pct(v('p-imprev')),   // % Imprevistos → decimal
    finTasa: pct(v('p-fintasa')),  // % Tasa financiera total del periodo → decimal
    seg:     v('p-seg'),           // Seguro anual total COP
    np:      v('p-np') || 1        // Número de prendas en la colección
  };
}


/**
 * Valores por defecto cuando el panel de Consolidado no está en el DOM.
 */
function getDefaultParams() {
  return {
    trm:     3600,    // TRM COP/USD
    exp:     0.08,    // 8% exportación
    aran:    0.10,    // 10% aranceles
    amer:    0.03,    // 3% Amerindias
    fact:    0.04,    // 4% factoring
    rtMkup:  2.4,     // multiplicador retail
    ten11:   0.15,    // 15% comisión 10Eleven/ShopMy
    iva:     0.19,    // 19% IVA Colombia
    imprev:  0.10,    // 10% imprevistos
    finTasa: 0.2775,  // 27.75% tasa financiera total del periodo (calibrado con Excel)
    seg:     15000000,
    np:      5000
  };
}


/**
 * FUNCIÓN PRINCIPAL: Calcula la cadena de precios completa
 * para una referencia. Replica el orden exacto del Excel
 * NUEVA_FORMULACION_PARA_COSTEO.
 *
 * COLUMNAS EDITABLES POR FILA (en amarillo en el Excel):
 *   tRow.kvMkup  → KV MKUP          (ej: 2.8)
 *   tRow.ajuste  → AJUSTE USD (5)   (ej: 5)
 *   tRow.shopmy  → MARGEN SHOP MY   (ej: 42)
 *   tRow.margen  → MARGEN EXTRA     (ej: 37)
 *
 * @param {Object} tRow  - Fila de TELAS (materiales y taller)
 * @param {Object} iRow  - Fila de INSUMOS (puede ser null)
 * @param {Object} p     - Parámetros globales de getParams()
 * @returns {Object} Todos los valores intermedios y finales
 */
function calcRow(tRow, iRow, p) {

  // ── BLOQUE 1: COSTOS DE PRODUCCIÓN COP ─────────────────────
  const mat  = calcTtlMat(tRow);            // Total materiales (telas)
  const insV = iRow ? calcTtlVar(iRow) : 0; // Total insumos variables
  const insF = calcTtlFijos();              // Total insumos fijos
  const ins  = insV + insF;                 // Total insumos (var + fijos)
  const tal  = D(tRow.taller);              // Costo confección/taller
  const seg  = p.seg / p.np;               // Seguro por prenda

  // SUB TL 1: Suma base de producción
  const sub1 = mat + ins + tal + seg;

  // ── BLOQUE 2: COSTOS FINANCIEROS ───────────────────────────
  // Costo financiero IVA: SUB TL 1 × IVA% × TasaFinanciera%
  // La tasa financiera es la tasa TOTAL del periodo (no mensual × meses)
  // Valor calibrado con Excel: IVA=19% × FinTasa=27.75% = 5.2725% sobre sub1
  const finIva = sub1 * p.iva * p.finTasa;

  // Imprevistos: 10% sobre (sub1 + finIva)
  const imprev = (sub1 + finIva) * p.imprev;

  // SUB TL 2: Costo total de producción en COP
  const sub2 = sub1 + finIva + imprev;

  // ── BLOQUE 3: CONVERSIÓN A USD Y KV MARKUP ─────────────────
  // Convertir de COP a USD usando TRM
  const usd = sub2 / p.trm;

  // KV MKUP: editable por fila (amarillo), default 2.8
  const kvMkup = D(tRow.kvMkup) || 2.8;
  const kv     = usd * kvMkup;

  // SUB TL 3: resultado tras KV Markup
  const sub3 = kv;

  // ── BLOQUE 4: AJUSTE USD — editable por fila, default 5 ────
  // Si no se ha editado, arranca en 5 USD por referencia
  const ajuste = tRow.ajuste != null ? D(tRow.ajuste) : 5;
  const sub4   = sub3 + ajuste;             // SUB TL 4: con ajuste aplicado

  // ── BLOQUE 5: AMERINDIAS ───────────────────────────────────
  // Costo bodega Amerindias sobre SUB TL 4
  const amerA = sub4 * p.amer;
  const sub5A = sub4 + amerA;               // SUB TL 5 + AMER

  // ── BLOQUE 6: FACTORING ────────────────────────────────────
  // Factoring (costo de cobrar la cartera) sobre SUB TL 5
  const factA = sub5A * p.fact;
  const sub6  = sub5A + factA;              // SUB TL 6 + FACTORING

  // ── BLOQUE 7: EXPORTACIÓN Y ARANCELES ──────────────────────
  const expA  = sub6 * p.exp;              // Exportación
  const araA  = sub6 * p.aran;             // 10% Aranceles
  const sub5E = sub6 + expA + araA;        // SUB TL 5 + EXPORT Y ARAN

  // ── BLOQUE 8: MÁRGENES EDITABLES (amarillo) ────────────────
  // MARGEN SHOP MY: usa el % de 10Eleven (p.ten11) por defecto.
  // Si el usuario lo editó manualmente (tRow.shopmy != null), usa ese valor.
  // Esto permite reemplazar la comisión 10Eleven por un valor personalizado.
  const shopmy = tRow.shopmy != null
    ? D(tRow.shopmy)          // valor manual ingresado por el usuario
    : sub5E * p.ten11;        // 15% calculado automáticamente desde 10Eleven

  // MARGEN EXTRA: margen adicional (editable por fila, default 0)
  const margen = D(tRow.margen);

  // ── BLOQUE 9: PRECIOS FINALES ───────────────────────────────
  // WS USD: Precio Wholesale = sub5E + ShopMy + MargenExtra
  const ws = sub5E + shopmy + margen;

  // RT MKUP: multiplicador retail (global, ej: 2.4)
  const rtMkup = p.rtMkup;

  // PRIMER RT: WS × RT Markup (paso intermedio)
  const primerRt = ws * rtMkup;

  // RT: precio retail final (igual a primerRt en esta versión)
  const rt = primerRt;

  // Precio Venta KV SAS COP: WS reconvertido a pesos colombianos
  const cop = ws * p.trm;

  // Precio Retail COP: RT reconvertido a pesos
  const rtCop = rt * p.trm;

  return {
    // Producción COP
    mat, ins, tal, seg, sub1,
    // Financiero
    finIva, imprev, sub2,
    // USD · Markup
    usd, kvMkup, kv, sub3,
    // Ajuste
    ajuste, sub4,
    // Amerindias
    amerA, sub5A,
    // Factoring
    factA, sub6,
    // Exportación
    expA, araA, sub5E,
    // Márgenes editables
    shopmy, margen,
    // Precios finales
    ws, rtMkup, primerRt, rt, cop, rtCop
  };
}
