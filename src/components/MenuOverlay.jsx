// src/components/MenuOverlay.jsx
import React from "react";
import { IoClose } from "react-icons/io5";

const MenuOverlay = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-64 p-4 h-full shadow-lg overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Menú</h2>
          <button onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>

        <ul className="space-y-3">
          <li>
            <button onClick={() => onSelect("nuevo-cliente")} className="w-full text-left">
              ➕ Nuevo cliente
            </button>
          </li>
          <li>
            <button onClick={() => onSelect("renovar-credito")} className="w-full text-left">
              🔁 Renovar crédito
            </button>
          </li>
          <li>
            <button onClick={() => onSelect("liquidacion")} className="w-full text-left">
              📊 Liquidación
            </button>
          </li>
          <li>
            <button onClick={() => onSelect("ventas")} className="w-full text-left">
              💰 Ventas
            </button>
          </li>
          <li>
            <button onClick={() => onSelect("pagos")} className="w-full text-left">
              📄 Pagos
            </button>
          </li>
          <li>
            <button onClick={() => onSelect("cerrar-sesion")} className="w-full text-left text-red-500">
              🚪 Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MenuOverlay;
