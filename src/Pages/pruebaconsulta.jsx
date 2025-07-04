import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bitjxwvxetvnddkjwyuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdGp4d3Z4ZXR2bmRka2p3eXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NDA4ODYsImV4cCI6MjA1NzMxNjg4Nn0.7ESXzg9pwJkl71Q2n1_6q5XLvSh7zbWAgYAqbAPq2nc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const pruebaconsulta = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = async () => {
    const auth_id_cobrador = localStorage.getItem('auth_id_cobrador_actual');

    if (!auth_id_cobrador) {
      console.error('No se encontró auth_id_cobrador_actual en localStorage');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('usuario_id', auth_id_cobrador); // 👈 Filtro exacto

    if (error) {
      console.error('Error al consultar clientes:', error);
    } else {
      setClientes(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h2>Clientes del Cobrador Seleccionado</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>DNI</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id}>
              <td>{cliente.nombre}</td>
              <td>{cliente.telefono}</td>
              <td>{cliente.direccion}</td>
              <td>{cliente.dni}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default pruebaconsulta;
