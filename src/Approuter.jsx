import { createBrowserRouter } from "react-router-dom";
import Login from "./components/Login";
import AdminPanel from "./Pages/AdminPanel";
import CobradorPanel from "./Pages/CobradorPanel";
import ClienteDetalle from "./Pages/ClienteDetalle";
import ClientesCancelados from "./Pages/ClientesCancelados";
import DetalleCancelados from "./Pages/DetalleCancelados";
import Liquidacion from "./Pages/Liquidacion";
import RegistrarGastos from "./Pages/RegistrarGastos";
import RegistroCliente from "./Pages/RegistroCliente";
import RegistroCredito from "./Pages/RegistroCredito";
import Renovar from "./Pages/Renovar";
import Pagos from "./Pages/Pagos";
import Ventas from "./Pages/Ventas";
import EnviarMensaje from "./Pages/EnviarMensaje";
import DashboardAdmin from "./Pages/DashboardAdmin";
import RegistrosAdmin from "./Pages/RegistrosAdmin";
import RegistroUsuarios from "./Pages/RegistroUsuarios";
import AdminVistacobrador from "./Pages/AdminVistacobrador";
import PruebaConsulta from './Pages/pruebaconsulta';
import Ventasadmin from './Pages/Ventasadmin';
import Pagosadmin from './Pages/Pagosadmin';
import Gastosadmin from './Pages/Gastosadmin';
import Liquidacionadmin from './Pages/Liquidacionadmin';
import Registroclienteadmin from './Pages/Registroclienteadmin';
import Registrocreditoadmin from './Pages/Registrocreditoadmin';
import Canceladosadmin from './Pages/Canceladosadmin';
import Renovaradmin from './Pages/Renovaradmin';
import AdminCaja from './Pages/Administrador/AdminCaja';
import AdminMapa from "./Pages/AdminMapa";
import ResumenDiario from "./Pages/ResumenDiario";
import Adminclientedetalle from "./Pages/Adminclientedetalle";
import NotFound from "./Pages/NotFound"; // ← asegúrate de importar
import PagoSuscripcion from "./Pages/PagoSuscripcion";
import SuperAdminPanel from "./Pages/SuperAdminPanel";







export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/admin", element: <AdminPanel /> },
  { path: "/cobrador", element: <CobradorPanel /> },
  { path: "/clientedetalle/:id", element: <ClienteDetalle /> },
  { path: "/adminclientedetalle/:id", element: <Adminclientedetalle /> },
  { path: "/clientescancelados", element: <ClientesCancelados /> },
  { path: "/detallecancelados/:creditoId", element: <DetalleCancelados /> },
  { path: "/liquidacion", element: <Liquidacion /> },
  { path: "/gastos", element: <RegistrarGastos /> },
  { path: "/registrocliente", element: <RegistroCliente /> },
  { path: "/registrocredito", element: <RegistroCredito /> },
  { path: "/renovar", element: <Renovar /> },
  { path: "/pagos", element: <Pagos />},
  { path: "/ventas", element: <Ventas /> },
  { path: "/enviar-mensaje/:clienteId", element: <EnviarMensaje /> },
  { path:"/dashboard-admin", element: <DashboardAdmin />},
  { path: "/registros-admin/:id_usuario", element: <RegistrosAdmin /> },
  { path: "/registro-usuarios", element: <RegistroUsuarios /> },
  { path:  "/admin/vistacobrador", element: <AdminVistacobrador />},
  { path: "/pruebaconsulta", element: <PruebaConsulta /> },
  { path: "/admin/ventas", element: <Ventasadmin /> },
  { path: "/admin/Pagos", element: <Pagosadmin /> },
  { path: "/admin/Gastos", element: <Gastosadmin /> },
  { path: "/admin/liqui", element: <Liquidacionadmin /> },
  { path: "/admin/regcliente", element: <Registroclienteadmin /> },
  { path: "/admin/regcredito", element: <Registrocreditoadmin /> },
  { path: "/admin/cancelados", element: <Canceladosadmin /> },
  { path: "/admin/revovar", element: <Renovaradmin /> },
  { path: "/admin/caja/:auth_id", element: <AdminCaja /> },
  { path: "/admin/mapa", element: <AdminMapa /> },
  { path: "/admin/resumen/:auth_id", element: <ResumenDiario /> },
  { path: "*", element: <NotFound /> }, // ← esto captura cualquier ruta no definida
  { path: "/admin/pago-suscripcion", element: <PagoSuscripcion /> },
  { path: "/superadmin", element: <SuperAdminPanel /> },




]);
