export function calcularTotalRecaudarHoy(creditos) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  console.log("📅 Hoy es:", hoy.toDateString());

  return creditos
    .filter(c => c.estado !== "cancelado" && Number(c.saldo) > 0)
    .reduce((sum, c) => {
      console.log("➡️ Revisando crédito:", c);

      if (c.forma_pago === "diario") {
  console.log("   ✅ Es diario, suma:", Number(c.valor_cuota || 0));
  return sum + Number(c.valor_cuota || 0);
}

if (c.forma_pago === "semanal") {
  const inicio = new Date(c.fecha_inicio);
  inicio.setHours(0, 0, 0, 0);

        console.log("   📌 Inicio:", inicio.toDateString());

        // Coincide el día de la semana
        if (inicio.getDay() === hoy.getDay()) {
          console.log("   ✅ Es semanal y HOY toca, suma:", Number(c.valor_cuota || 0));
          return sum + Number(c.valor_cuota || 0);
        } else {
          console.log("   ❌ Es semanal pero hoy NO toca");
        }
      }

      return sum;
    }, 0);
}
