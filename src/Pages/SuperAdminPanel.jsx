import React,{useEffect,useState} from "react"
import { supabase } from "../components/supabaseClient"
import "../Styles/SuperAdminPanel.css"

export default function SuperAdminPanel(){

const [admins,setAdmins] = useState([])
const [dashboard,setDashboard] = useState(null)

const [modalRutas,setModalRutas] = useState(false)
const [modalPagos,setModalPagos] = useState(false)

const [rutasAdmin,setRutasAdmin] = useState([])
const [historialPagos,setHistorialPagos] = useState([])

const [modalPagoOk,setModalPagoOk] = useState(false)
const [mensajePago,setMensajePago] = useState("")

const cargarAdmins = async()=>{
const {data} = await supabase
.from("vista_admin_suscripciones")
.select("*")

if(data) setAdmins(data)
}

const cargarDashboard = async()=>{
const {data} = await supabase
.from("vista_dashboard_superadmin")
.select("*")
.single()

if(data) setDashboard(data)
}

const cargarRutasAdmin = async(adminId)=>{
const {data} = await supabase
.from("vista_rutas_admin")
.select("*")
.eq("admin_id",adminId)

if(data){
setRutasAdmin(data)
setModalRutas(true)
}
}

const cargarPagosAdmin = async(adminId)=>{
const {data} = await supabase
.from("vista_historial_pagos_admin")
.select("*")
.eq("admin_id",adminId)

if(data){
setHistorialPagos(data)
setModalPagos(true)
}
}

const toggleBloqueoRutas = async(adminId,estado)=>{
const nuevoEstado=!estado

await supabase
.from("usuarios")
.update({acceso_activo:nuevoEstado})
.eq("admin_id",adminId)
.eq("rol","cobrador")

cargarAdmins()
}

const enviarRecordatorio = async (adminId) => {

const { error } = await supabase
.from("notificaciones")
.insert({
usuario_id: adminId,
tipo_usuario: "admin",
titulo: "Pago de suscripción",
mensaje: "Recuerda pagar tu suscripción antes del día 5 para evitar suspensión de rutas."
})

if(!error){
alert("Recordatorio enviado")
}

}

const validarPago = async (id) => {

const { data, error } = await supabase
.from("suscripciones_pagos")
.update({ estado: "pagado" })
.eq("id", id)
.select()

console.log("UPDATE RESULT:", data)

if(error){
console.log(error)
setMensajePago("Error al registrar el pago")
}
else if(data.length === 0){
setMensajePago("⚠️ No se encontró el pago para actualizar")
}
else{
setMensajePago("✅ Pago registrado correctamente")
}

setModalPagoOk(true)

};

useEffect(()=>{
cargarAdmins()
cargarDashboard()
},[])

return(

<div className="superadmin-page">

<div className="sap-container">

<h2>Panel SuperAdmin</h2>

{/* DASHBOARD */}

{dashboard &&(

<div className="dashboard-grid">

<div className="dashboard-card card-green">
💰 Ingresos mes
<h2>S/ {dashboard.ingresos_mes}</h2>
</div>

<div className="dashboard-card card-orange">
📥 Pagos pendientes
<h2>{dashboard.pagos_proceso}</h2>
</div>

<div className="dashboard-card card-blue">
👤 Admins
<h2>{dashboard.total_admins}</h2>
</div>

<div className="dashboard-card card-purple">
🛣 Rutas
<h2>{dashboard.total_rutas}</h2>
</div>

</div>

)}

{/* TABLA ADMINS */}

<table className="admin-table">

<thead>

<tr>
<th>Admin</th>
<th>Rutas</th>
<th>Estado pago</th>
<th>Total</th>
<th>Rutas</th>
<th>Acciones</th>
</tr>

</thead>

<tbody>

{admins.map(a=>(

<tr key={a.admin_id}>

<td>{a.admin_nombre}</td>
<td>{a.total_rutas}</td>


<td>
<span className={`estado ${a.estado_pago || "pendiente"}`}>
{a.estado_pago || "pendiente"}
</span>
</td>

<td>S/ {a.total_pagado || 0}</td>

<td>
<span className={a.acceso_activo ? "activo":"bloqueado"}>
{a.acceso_activo ? "🟢 Activas":"🔴 Bloqueadas"}
</span>
</td>

<td>


<button
className="btn btn-rutas"
onClick={()=>cargarRutasAdmin(a.admin_id)}
>
Rutas
</button>

<button
className="btn btn-pagos"
onClick={()=>cargarPagosAdmin(a.admin_id)}
>
Pagos
</button>

<button
className="btn btn-bloquear"
onClick={()=>toggleBloqueoRutas(a.admin_id,a.acceso_activo)}
>
{a.acceso_activo ? "Bloquear":"Activar"}
</button>

<button
className="btn btn-recordatorio"
onClick={()=>enviarRecordatorio(a.admin_id)}
>
Recordar pago
</button>

<button onClick={() => validarPago(a.admin_nombre)}>
Validar pago
</button>


</td>

</tr>

))}

</tbody>

</table>

{/* MODAL RUTAS */}

{modalRutas &&(

<div className="modal-overlay">

<div className="modal-content">

<h3>Rutas del Admin</h3>

<table className="admin-table">

<thead>
<tr>
<th>Ruta</th>
</tr>
</thead>

<tbody>

{rutasAdmin.map(r=>(
<tr key={r.ruta_id}>
<td>{r.ruta_nombre}</td>
</tr>
))}

</tbody>

</table>

<button className="btn" onClick={()=>setModalRutas(false)}>
Cerrar
</button>


</div>

</div>

)}

{/* MODAL PAGOS */}

{modalPagos &&(

<div className="modal-overlay">

<div className="modal-content">

<h3>Historial Pagos</h3>

<div className="table-wrapper">
<table className="admin-table">

<thead>

<tr>
<th>Mes</th>
<th>Año</th>
<th>Total</th>
<th>Estado</th>
<th>Evidencia</th>
</tr>

</thead>

<tbody>

{historialPagos.map(p=>(

<tr key={p.id}>

<td>{p.mes}</td>
<td>{p.anio}</td>
<td>S/ {p.total}</td>
<td>{p.estado}</td>
<td>{p.id}</td>

<td>
{p.url_evidencia &&(
<a href={p.url_evidencia} target="_blank" rel="noreferrer">
Ver comprobante
</a>
)}
</td>

<td>

{p.estado !== "pagado" && (
<button
className="btn btn-validar"
onClick={()=>validarPago(p.id)}
>
Validar pago
</button>
)}

</td>

</tr>

))}

</tbody>

</table>
</div>

{modalPagoOk && (

<div className="modal-overlay">

<div className="modal-content">

<h3>{mensajePago}</h3>

<button
className="btn"
onClick={()=>setModalPagoOk(false)}
>
Cerrar
</button>

</div>

</div>

)}



<button className="btn" onClick={()=>setModalPagos(false)}>
Cerrar
</button>

</div>

</div>

)}

</div>
</div>

)

}