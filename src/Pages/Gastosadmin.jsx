import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import "../styles/RegistrarGastos.css";

export default function Gastosadmin() {
  const navigate = useNavigate();
  const [gastos, setGastos] = useState([]);
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(dayjs().format("YYYY-MM-DD"));
  const [fechaInicio, setFechaInicio] = useState(dayjs().format("YYYY-MM-DD"));
  const [fechaFin, setFechaFin] = useState(dayjs().format("YYYY-MM-DD"));

  useEffect(() => {
    obtenerGastos();
  }, [fechaInicio, fechaFin]);

  const obtenerGastos = async () => {
  const desde = fechaInicio;
  const hasta = fechaFin;
  const idCobradorActual = localStorage.getItem("auth_id_cobrador_actual");

  const { data, error } = await supabase
    .from("gastos")
    .select("id, concepto, valor, fecha, usuario_id")
    .eq("usuario_id", idCobradorActual) // ✅ Filtramos por auth_id directamente
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error al obtener gastos:", error.message);
  } else {
    setGastos(data || []);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    const idCobradorActual = localStorage.getItem("auth_id_cobrador_actual");
    const { error } = await supabase.from("gastos").insert([
      {
        concepto,
        valor,
        fecha,
        usuario_id: idCobradorActual,
      },
    ]);

    if (!error) {
      setConcepto("");
      setValor("");
      setFecha(dayjs().format("YYYY-MM-DD"));
      obtenerGastos();
    } else {
      console.error("Error al registrar gasto:", error.message);
    }
  };

  return (
    <div className="gastos-contenedor">
      <h2 className="titulo-gastos">🧾 Registrar Gasto</h2>

      <form onSubmit={handleSubmit} className="formulario-gastos">
        <input
          type="text"
          placeholder="Concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          required
        />

        <div className="fila-valor-fecha">
          <input
            type="number"
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            step="0.01"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="boton-registrar">
          Registrar
        </button>
      </form>

      <div className="filtro-fecha-gastos">
        <label>Desde:</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        <label>Hasta:</label>
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
      </div>

      <div className="tabla-scroll-gastos">
        <table className="tabla-gastos">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr><td colSpan="3">No hay registros.</td></tr>
            ) : (
              gastos.map((g, i) => (
                <tr key={i}>
                  <td>{dayjs(g.fecha).format("YYYY-MM-DD")}</td>
                  <td>{g.concepto}</td>
                  <td>${parseFloat(g.valor).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="resumen-gastos">
        <p>🧾 Registros: <strong>{gastos.length}</strong></p>
        <p>💸 Total gastado: <strong>${gastos.reduce((total, g) => total + parseFloat(g.valor), 0).toFixed(2)}</strong></p>
      </div>

      <button className="boton-volver" onClick={() => navigate(-1)}>⬅ Volver</button>
    </div>
  );
}
