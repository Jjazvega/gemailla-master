import { useMemo } from 'react';

const EXPENSE_RATIO_WARNING = 80;   // gastos > 80% de ingresos
const EXPENSE_RATIO_CRITICAL = 95;  // gastos > 95% de ingresos
const ANOMALY_SPIKE_THRESHOLD = 2.0; // gasto mensual > 2x la media histórica
const MIN_MONTHS_FOR_ANOMALY = 3;   // necesitamos al menos 3 meses para detectar anomalías

export function useFinancialAlerts(transactions = [], monthlyData = [], prediction = null) {
  const alerts = useMemo(() => {
    const result = [];

    if (!transactions.length) return result;

    const ingresos = transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + (t.amount || 0), 0);
    const gastos = transactions.filter(t => t.type === 'gasto').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = ingresos - gastos;

    // ── 1. Ratio gastos/ingresos global ───────────────────────────
    if (ingresos > 0) {
      const ratio = (gastos / ingresos) * 100;
      if (ratio >= EXPENSE_RATIO_CRITICAL) {
        result.push({
          id: 'ratio-critical',
          level: 'critical',
          category: 'threshold',
          title: 'Umbral crítico de gastos',
          message: `Los gastos representan el ${ratio.toFixed(1)}% de los ingresos totales.`,
          detail: 'El margen operativo es prácticamente nulo. Se recomienda acción inmediata.',
          value: `${ratio.toFixed(1)}%`,
        });
      } else if (ratio >= EXPENSE_RATIO_WARNING) {
        result.push({
          id: 'ratio-warning',
          level: 'warning',
          category: 'threshold',
          title: 'Alerta de ratio de gastos',
          message: `Los gastos representan el ${ratio.toFixed(1)}% de los ingresos totales.`,
          detail: `Umbral de advertencia: ${EXPENSE_RATIO_WARNING}%. El margen está en zona de riesgo.`,
          value: `${ratio.toFixed(1)}%`,
        });
      }
    }

    // ── 2. Balance negativo acumulado ─────────────────────────────
    if (balance < 0) {
      result.push({
        id: 'negative-balance',
        level: 'critical',
        category: 'balance',
        title: 'Balance neto negativo',
        message: `Déficit acumulado de $${Math.abs(balance).toLocaleString('es-MX')} MXN.`,
        detail: 'Los gastos totales superan los ingresos. Revisa la estructura de costos.',
        value: `-$${Math.abs(balance).toLocaleString('es-MX')}`,
      });
    }

    // ── 3. Anomalías en flujo mensual (spike de gastos) ───────────
    if (monthlyData.length >= MIN_MONTHS_FOR_ANOMALY) {
      const monthlyGastos = monthlyData.map(m => m.gastos);
      const avgGastos = monthlyGastos.slice(0, -1).reduce((s, v) => s + v, 0) / (monthlyGastos.length - 1);
      const lastMonth = monthlyData[monthlyData.length - 1];

      if (avgGastos > 0 && lastMonth.gastos > avgGastos * ANOMALY_SPIKE_THRESHOLD) {
        result.push({
          id: 'anomaly-spike',
          level: 'warning',
          category: 'anomaly',
          title: 'Anomalía detectada: pico de gastos',
          message: `Gastos en ${lastMonth.month} son ${((lastMonth.gastos / avgGastos) * 100 - 100).toFixed(0)}% superiores a la media histórica.`,
          detail: `Media mensual: $${Math.round(avgGastos).toLocaleString('es-MX')}. Gasto reciente: $${lastMonth.gastos.toLocaleString('es-MX')}.`,
          value: `+${((lastMonth.gastos / avgGastos - 1) * 100).toFixed(0)}%`,
        });
      }

      // Caída brusca de ingresos
      const monthlyIngresos = monthlyData.map(m => m.ingresos);
      const avgIngresos = monthlyIngresos.slice(0, -1).reduce((s, v) => s + v, 0) / (monthlyIngresos.length - 1);
      if (avgIngresos > 0 && lastMonth.ingresos < avgIngresos * 0.6) {
        result.push({
          id: 'anomaly-income-drop',
          level: 'warning',
          category: 'anomaly',
          title: 'Anomalía detectada: caída de ingresos',
          message: `Ingresos en ${lastMonth.month} cayeron un ${((1 - lastMonth.ingresos / avgIngresos) * 100).toFixed(0)}% respecto a la media.`,
          detail: `Media mensual: $${Math.round(avgIngresos).toLocaleString('es-MX')}. Ingresos recientes: $${lastMonth.ingresos.toLocaleString('es-MX')}.`,
          value: `-${((1 - lastMonth.ingresos / avgIngresos) * 100).toFixed(0)}%`,
        });
      }
    }

    // ── 4. Proyección con saldo negativo ──────────────────────────
    if (prediction?.predictions?.length) {
      const negMonths = prediction.predictions.filter(p => p.ingresos_pred - p.gastos_pred < 0);
      if (negMonths.length > 0) {
        result.push({
          id: 'prediction-negative',
          level: negMonths.length >= 2 ? 'critical' : 'warning',
          category: 'prediction',
          title: 'Proyección con saldo negativo',
          message: `${negMonths.length} de los próximos 3 meses proyectan déficit.`,
          detail: `Meses en riesgo: ${negMonths.map(p => p.month).join(', ')}.`,
          value: `${negMonths.length}/3 meses`,
        });
      }

      // Tendencia negativa fuerte
      if (prediction.trend === 'negativa') {
        result.push({
          id: 'prediction-trend',
          level: 'info',
          category: 'prediction',
          title: 'Tendencia financiera negativa',
          message: 'La IA detecta una tendencia decreciente en el flujo de caja.',
          detail: prediction.trend_note || 'Considera revisar tus proyecciones de ingresos.',
          value: '↓ Negativa',
        });
      }
    }

    // ── 5. Concentración de gastos en una sola categoría ─────────
    const catGastos = {};
    transactions.filter(t => t.type === 'gasto').forEach(t => {
      catGastos[t.category] = (catGastos[t.category] || 0) + (t.amount || 0);
    });
    if (gastos > 0) {
      const [topCat, topVal] = Object.entries(catGastos).sort((a, b) => b[1] - a[1])[0] || [];
      if (topCat && topVal / gastos > 0.6) {
        result.push({
          id: 'concentration-risk',
          level: 'info',
          category: 'risk',
          title: 'Concentración de gastos',
          message: `La categoría "${topCat.replace(/_/g, ' ')}" representa el ${((topVal / gastos) * 100).toFixed(0)}% del gasto total.`,
          detail: 'Alta concentración en una sola categoría puede ser un riesgo operativo.',
          value: `${((topVal / gastos) * 100).toFixed(0)}%`,
        });
      }
    }

    return result;
  }, [transactions, monthlyData, prediction]);

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return { alerts, criticalCount, warningCount };
}