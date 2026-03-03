import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../Styles/PermisosUsuario.css";

export default function PermisosUsuario() {
  const { id } = useParams(); // auth_id del usuario
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lista de páginas e inputs a manejar
  const paginas = [
    { nombre: "RegistroCliente", label: "Crear cliente" },
    { nombre: "Renovar", label: "Renovar crédito" },
    { nombre: "RenovarMonto", label: "Monto (Renovar)" },
    { nombre: "RenovarInteres", label: "Interés (%) (Renovar)" },
    { nombre: "RenovarFormaPago", label: "Forma de Pago (Renovar)" },
    { nombre: "RegistrarGastos", label: "Registrar gastos" },
  ];

  useEffect(() => {
    const cargarPermisos = async () => {
      setLoading(true);

      try {
        // Obtener IDs de páginas/inputs desde Supabase
        const { data: paginasData, error: paginasError } = await supabase
          .from("paginas")
          .select("*")
          .in("nombre", paginas.map((p) => p.nombre));

        if (paginasError) throw paginasError;

        // Consultar permisos existentes para este usuario
        const { data: permisosData, error: permisosError } = await supabase
          .from("permisos_usuario_pagina")
          .select("*")
          .eq("auth_id", id);

        if (permisosError) throw permisosError;

        // Combinar páginas + permisos
        const permisosCompletos = paginasData.map((pagina) => {
          const permisoUsuario = permisosData.find(
            (p) => p.pagina_id === pagina.id
          );
          return {
            pagina_id: pagina.id,
            nombre: pagina.nombre,
            label: paginas.find((p) => p.nombre === pagina.nombre).label,
            estado: permisoUsuario ? permisoUsuario.estado : true,
            permiso_id: permisoUsuario ? permisoUsuario.id : null,
          };
        });

        setPermisos(permisosCompletos);
      } catch (e) {
        console.error("Error cargando permisos:", e);
      }

      setLoading(false);
    };

    cargarPermisos();
  }, [id]);

  const togglePermiso = async (index) => {
    const permiso = permisos[index];
    const nuevoEstado = !permiso.estado;
    const nuevosPermisos = [...permisos];
    nuevosPermisos[index].estado = nuevoEstado;
    setPermisos(nuevosPermisos);

    try {
      if (permiso.permiso_id) {
        // Actualizar registro existente
        const { error } = await supabase
          .from("permisos_usuario_pagina")
          .update({ estado: nuevoEstado })
          .eq("id", permiso.permiso_id);

        if (error) throw error;
      } else {
        // Crear nuevo registro
        const { data, error } = await supabase
          .from("permisos_usuario_pagina")
          .insert({
            auth_id: id,
            pagina_id: permiso.pagina_id,
            estado: nuevoEstado,
          })
          .select()
          .single();

        if (error) throw error;

        // Guardar el ID del nuevo permiso
        nuevosPermisos[index].permiso_id = data.id;
        setPermisos(nuevosPermisos);
      }
    } catch (e) {
      alert("Error al guardar el permiso");
      console.error(e);
      // Revertir cambio visual si hubo error
      nuevosPermisos[index].estado = !nuevoEstado;
      setPermisos(nuevosPermisos);
    }
  };

  if (loading) return <p className="perm-loading">Cargando permisos...</p>;

const exportarExcel = async () => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select(`
        id,
        nombre,
        dni,
        telefono,
        direccion,
        fecha_registro,
        creditos (
          id,
          monto,
          saldo,
          forma_pago,
          valor_cuota,
          dias_atraso,
          estado
        )
      `)
      .eq("usuario_id", id);

    if (error) throw error;

    const dataFinal = [];

    data.forEach((cliente) => {
      if (cliente.creditos.length > 0) {
        cliente.creditos.forEach((credito) => {
          dataFinal.push({
            Nombre: cliente.nombre,
            DNI: cliente.dni,
            Teléfono: cliente.telefono,
            Dirección: cliente.direccion,
            Fecha_Registro: cliente.fecha_registro,
            Crédito_ID: credito.id,
            Monto_Crédito: credito.monto,
            Saldo: credito.saldo,
            Forma_Pago: credito.forma_pago,
            Valor_Cuota: credito.valor_cuota,
            Días_Atraso: credito.dias_atraso,
            Estado_Crédito: credito.estado,
          });
        });
      } else {
        dataFinal.push({
          Nombre: cliente.nombre,
          DNI: cliente.dni,
          Teléfono: cliente.telefono,
          Dirección: cliente.direccion,
          Fecha_Registro: cliente.fecha_registro,
          Crédito_ID: "",
          Monto_Crédito: "",
          Saldo: "",
          Forma_Pago: "",
          Valor_Cuota: "",
          Días_Atraso: "",
          Estado_Crédito: "Sin crédito",
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataFinal);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(fileData, `Clientes_${id}.xlsx`);
  } catch (error) {
    console.error("Error exportando:", error);
    alert("Error al exportar datos");
  }
};
  return (
    <div className="perm-container">
      <div className="perm-card">
        <button
          className="perm-btn"
          style={{ marginBottom: "15px", background: "#64748b", color: "#e5e7eb" }}
          onClick={() => window.history.back()}
        >
          ← Volver
        </button>

        <h2>🔐 Permisos del cobrador</h2>
        <p className="perm-user">Usuario ID: {id}</p>

        {permisos.map((permiso, i) => (
          <div className="perm-item" key={permiso.pagina_id}>
            <span>{permiso.label}</span>
            <button
              className={`perm-toggle ${permiso.estado ? "on" : "off"}`}
              onClick={() => togglePermiso(i)}
            >
              {permiso.estado ? "✅ Activo" : "🔒 Bloqueado"}
            </button>
          </div>
        ))}

        <hr style={{ margin: "20px 0", opacity: 0.3 }} />

<button
  className="perm-btn"
  style={{
    width: "100%",
    background: "#10b981",
    color: "white",
    marginTop: "10px",
  }}
  onClick={exportarExcel}
>
  📊 Exportar clientes a Excel
</button>
      </div>
    </div>
  );
}
