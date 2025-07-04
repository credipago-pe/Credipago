import { RouterProvider } from "react-router-dom";
import { router } from "./Approuter";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <RouterProvider router={router} />

      {/* Contenedor de notificaciones tipo toast */}
      <ToastContainer
        position="top-center"
        autoClose={3000}
        closeButton={false}
        hideProgressBar={true}
        pauseOnHover={false}
        draggable={false}
      />
    </>
  );
}

export default App;