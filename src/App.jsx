if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js"
      );

      await registration.update();

      console.log("✅ Service Worker actualizado correctamente");
    } catch (err) {
      console.error("❌ Error al registrar Service Worker:", err);
    }
  });
}
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./Approuter";
import { ToastContainer } from "react-toastify";
import { supabase } from "./components/supabaseClient";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <>
      <RouterProvider router={router} />

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
