// utils.js
const fs = require('fs');
const path = require('path');
const rutaClientes = path.join(__dirname, 'clientes.json');
const store_id = "SUC001";

function leerClientes() {
  try {
    if (fs.existsSync(rutaClientes)) {
      const data = fs.readFileSync(rutaClientes, 'utf-8');
      return JSON.parse(data);
    } else {
      return {};  // Devuelve objeto vacío si no existe
    }
  } catch (err) {
    console.error("Error al leer clientes:", err);
    return {};  // Devuelve objeto vacío en caso de error
  }
}

function guardarClientes(clientes) {
  try {
    fs.writeFileSync(rutaClientes, JSON.stringify(clientes, null, 2));
  } catch (err) {
    console.error("Error al guardar clientes:", err);
  }
}

function agregarCliente(ip, port) {
  let clientes = leerClientes();
  if (!clientes || typeof clientes !== 'object') {
    clientes = {};  // Seguridad extra
  }

  const keys = Object.keys(clientes);

  // Buscar el siguiente nombre disponible: PC1, PC2, PC3...
  let index = 1;
  while (clientes[`PC${index}`]) {
    index++;
  }

  const nombre = `PC${index}`;
  const pos_id = `${store_id}POS00${index}`;

  clientes[nombre] = {
    ip,
    connected: false,
    pos_id,
    store_id: store_id,
    client: nombre
  };

  guardarClientes(clientes);

  console.log(`Cliente ${nombre} agregado:`, clientes[nombre]);
  return nombre;
}

module.exports = {
  leerClientes,
  guardarClientes,
  agregarCliente
};
