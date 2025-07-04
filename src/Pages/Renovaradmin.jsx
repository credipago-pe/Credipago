import React, { useState, useEffect } from 'react';
import { supabase } from "../components/supabaseClient";
import { useNavigate } from 'react-router-dom';
import { useLocation } from "react-router-dom";
import "./../styles/RenovarCredito.css";

const Renovaradmin = () => {
  const location = useLocation();
  const [busqueda, setBusqueda] = useState("");
  const clienteNombreDesdeCancelados = location.state?.clienteNombre || "";
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formularioCredito, setFormularioCredito] = useState({
    monto: '',
    interes: 20,
    saldo: '',
    valor_cuota: '',
    forma_pago: 'diario',
  });
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
  if (location.state?.clienteNombre) {
    setBusqueda(location.state.clienteNombre);
    buscarClientes(location.state.clienteNombre);
  }
}, [location.state]);

  // Buscar clientes en la base de datos
  const buscarClientes = async (searchTerm) => {
    const usuarioId = localStorage.getItem("auth_id_cobrador_actual");
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nombre', `%${searchTerm}%`)
      .eq('usuario_id', usuarioId);

    if (error) {
      console.error('Error al buscar clientes:', error);
    } else {
      setClientes(data);
    }
  };

  // Verificar si un cliente tiene un crédito activo
  const verificarCreditoActivo = async (clienteId) => {
    const { data, error } = await supabase
      .from('creditos')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('estado', 'activo');

    if (error) {
      console.error('Error al verificar crédito activo:', error);
      return false;
    }
    return data && data.length > 0;
  };

  // Seleccionar cliente y verificar crédito activo
  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setMensajeExito('');
    setMensajeError('');

    const tieneCreditoActivo = await verificarCreditoActivo(cliente.id);
    if (tieneCreditoActivo) {
      setMensajeError('Este cliente ya tiene un crédito activo. No puede renovar.');
      setFormularioCredito({
        monto: '',
        interes: 20,
        saldo: '',
        valor_cuota: '',
        forma_pago: 'diario',
      });
      return;
    }
    setFormularioCredito({
      monto: '',
      interes: 20,
      saldo: cliente.saldo || '',
      valor_cuota: '',
      forma_pago: 'diario',
    });
  };

  const manejarFormulario = async (e) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      setMensajeError('Por favor, selecciona un cliente.');
      return;
    }
  
    let { monto, interes, forma_pago } = formularioCredito;
  
    // Convertir valores a números y evitar errores por valores vacíos
    monto = parseFloat(monto) || 0;
    interes = parseFloat(interes) || 0;
  
    if (monto <= 0) {
      setMensajeError('El monto debe ser mayor a 0.');
      return;
    }
  
    const usuarioId = localStorage.getItem("auth_id_cobrador_actual");

const { data, error } = await supabase
  .from('creditos')
  .insert([
    {
      cliente_id: clienteSeleccionado.id,
      monto,
      interes,
      forma_pago,
      estado: 'activo',
      fecha_inicio: new Date().toISOString(),
      fecha_vencimiento: calcularFechaVencimiento(new Date(), forma_pago).toISOString(),
      usuario_id: usuarioId,
    },
  ]);

  
    if (error) {
  setMensajeError('Error al registrar el nuevo crédito: ' + error.message);
} else {
  setMensajeExito('Renovación exitosa !!!');
  setTimeout(() => {
    navigate('/cobrador');
  }, 2000);
}
  };  

  // Función para calcular la fecha de vencimiento
  const calcularFechaVencimiento = (fechaInicio, formaPago) => {
    let fechaVencimiento = new Date(fechaInicio);
    if (formaPago === 'diario') {
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 24);
      if (fechaVencimiento.getDay() === 0) {
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 1);
      }
    } else if (formaPago === 'semanal') {
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 28);
    } else if (formaPago === 'mensual') {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
    }
    return fechaVencimiento;
  };

  return (
    <div className="RenovarCredito">
      <button className="back-button" onClick={() => navigate("/admin/vistacobrador")}>
        Volver
      </button>
      <h1>Renovar Crédito</h1>
      <div>
        <input
         type="text"
         placeholder="Buscar cliente por nombre"
         value={busqueda}
         onChange={(e) => {
         setBusqueda(e.target.value);
         buscarClientes(e.target.value);
        }}
        />

        {clientes.length > 0 && (
          <ul>
            {clientes.map((cliente) => (
              <li key={cliente.id} onClick={() => seleccionarCliente(cliente)}>
                {cliente.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      {mensajeError && <p className="error">{mensajeError}</p>}
      {mensajeExito && (
  <div className="toast-exito">
    <div className="toast-contenido">
      <span className="chulo">✔️</span> {mensajeExito}
    </div>
  </div>

        )}

      {clienteSeleccionado && !mensajeError && (
        <form onSubmit={manejarFormulario}>
          <h2>Datos del Cliente</h2>
          <p>Nombre: {clienteSeleccionado.nombre}</p>
          <p>Saldo actual: 0 {clienteSeleccionado.saldo}</p>

          <label>
            Monto:
            <input
              type="number"
              value={formularioCredito.monto}
              onChange={(e) => setFormularioCredito({ ...formularioCredito, monto: e.target.value })}
            />
          </label>

          <label>
            Forma de pago:
            <select
              value={formularioCredito.forma_pago}
              onChange={(e) => setFormularioCredito({ ...formularioCredito, forma_pago: e.target.value })}
            >
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </select>
          </label>

          <button type="submit">Renovar Crédito</button>
        </form>
      )}
    </div>
    
  );
};

export default Renovaradmin;
