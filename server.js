const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { MercadoPagoConfig, Payment, Store } = require('mercadopago');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const test = true;
let valorFicha = 200;
let promo = 4;
const gamepadClients = {};
const ipToPOS = require('./clientes.json');
// Configuración de Express
const app = express();
// CORS en Express
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.34:3000', // Tu IP en red local
    'https://<tu-ngrok>.ngrok-free.app' // Si usas ngrok
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const user_id = test ? ("") : ("");
const store_id = "SUC001";
//const pos_id = [store_id + "POS001", store_id + "POS002"];
const access_token = test ? ('APP_USR-') : ('APP_USR-');

const server = http.createServer(app);

// CORS en Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://192.168.1.34:3000',
      'https://<tu-ngrok>.ngrok-free.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(bodyParser.json());
app.use(express.json());
const mercadopago = new MercadoPagoConfig({
  accessToken: access_token
});


app.post('/crear-sucursal', async (req, res) => {
  try {
    const body = {
      name: 'Sucursal Casa',
      external_id: 'SUC001',
      business_hours: {
        monday: [{ open: '08:00', close: '12:00' }],
        tuesday: [{ open: '09:00', close: '18:00' }],
      },
      location: {
        street_number: '0123',
        street_name: 'Example Street Name.',
        city_name: 'City name.',
        state_name: 'State name.',
        latitude: -34.6037,
        longitude: -58.3816,
        reference: 'Cerca de Mercado Pago',
      },
    };

    const store = await new Store(mercadopago).create({ body });
    res.json(store);
  } catch (error) {
    console.error('Error creando la sucursal:', error);
    res.status(500).json({ error: 'No se pudo crear la sucursal' });
  }
})

// WebSocket
io.on('connection', (socket) => {
  console.log('🧩 Cliente conectado vía WebSocket');
  // Aquí tu lógica WebSocket
});

const net = require('net');

// 1️⃣ Creamos un socket global
const client = new net.Socket();
let isConnected = false;

client.connect(65432, '127.0.0.1', () => {
  isConnected = true;
  console.log('✅ Conectado al servidor de Gamepad');
});

client.on('error', (err) => {
  console.error('❌ Error en la conexión TCP:', err);
});

client.on('close', () => {
  isConnected = false;
  console.log('🔌 Conexión cerrada');
});

// 2️⃣ Función para enviar comandos usando la conexión existente
function sendCommandToGamepad(command) {
  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error('No conectado al servidor de Gamepad'));
      return;
    }

    gamepadClients[ip].socket.write(command + '\n', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

app.post('/enviar-comando', async (req, res) => {
  const { ip, comando } = req.body;

  const client = gamepadClients[ip];
  if (!client) {
    return res.status(404).json({ error: `No hay Gamepad registrado para la IP ${ip}` });
  }

  try {
    client.socket.write(comando + '\n');
    res.json({ success: true, ip, comando });
  } catch (err) {
    res.status(500).json({ error: 'Error enviando comando', details: err.message });
  }
});

app.post('/crear-preferencia', async (req, res) => {
  try {
    const body = req.body;
    const getPos_id = body.pos
    console.log("get_posId", req.body)
    const url = `https://api.mercadopago.com/instore/qr/seller/collectors/${user_id}/stores/${store_id}/pos/${getPos_id}/orders`;

    const paymentData = {
      external_reference: "12345",
      title: "Orden QR",
      description: "Pago con QR",
      notification_url: "https://0b4e-2802-8010-9a1f-b101-fd59-bb69-4e6c-8ec3.ngrok-free.app/webhook",
      total_amount: Number(body.valorFicha),
      items: [
        {
          sku_number: "A123K9191938",
          category: "marketplace",
          title: getPos_id,
          description: "Creditos en arcade " + getPos_id,
          unit_price: Number(body.valorFicha),
          quantity: 1,
          unit_measure: "unit",
          total_amount: Number(body.valorFicha)
        }
      ],
      cash_out: {
        amount: 0
      }
    };

    const response = await fetch(url, {
      method: 'PUT', // Importante: PUT, no POST
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`
      },
      body: JSON.stringify(paymentData)
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {}; // Parsear si hay texto
    } catch (err) {
      console.warn('⚠️ La respuesta no es JSON válido:', text);
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(`Error API pagos: ${JSON.stringify(data)}`);
    }

    //return data;

    res.json(data); // Podés devolver la data para ver la orden creada
  } catch (error) {
    console.error('Error creando el pago:', error);
    res.status(500).json({ error: 'No se pudo crear el pago' });
  }
});

app.get('/getValorFicha', (req, res) => {
  res.json({ valor: valorFicha });
});

app.post('/setValorFicha', (req, res) => {
  const { valor } = req.body;
  if (valor !== undefined) {
    valorFicha = valor;
    res.json({ success: true, nuevoValor: valorFicha });
  } else {
    res.status(400).json({ error: 'Falta el valor' });
  }
});

app.post('/registrar_pc', (req, res) => {
  // lógica para registrar PC
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'Falta la IP' });
  }

  const pos_id = ipToPOS[ip];
  if (!pos_id) {
    return res.status(400).json({ error: `No hay POS configurado para la IP ${ip}` });
  }

  if (!gamepadClients[ip]) {
    // Intentar conectar por TCP
    const client = new net.Socket();
    client.connect(65432, ip, () => {
      console.log(`✅ Conectado al Gamepad en ${ip}`);
      gamepadClients[ip] = {
        socket: client,
        conectado: true,
        ip: ip,
        pos_id: pos_id,
        store_id: store_id,
      };
      console.log(`✅ Data 1 ${JSON.stringify(gamepadClients[ip], null, 2)}`);
    });

    client.on('error', (err) => {
      console.error(`❌ Error al conectar con ${ip}:`, err.message);
    });

    client.on('close', () => {
      console.log(`🔌 Conexión cerrada con ${ip}`);
      delete gamepadClients[ip];
    });
  }

  res.json({ success: true, ip });
  //res.send('PC registrada');
});

app.get('/getClientes', (req, res) => {
  res.json({ clientes: gamepadClients });
});

app.post('/getPos', async (req, res) => {
  const body = req.body;
  const getPos_id = body.pos // Obtenemos el POS correcto

  if (!getPos_id) {
    return res.status(400).json({ error: 'Posición no válida' });
  }
  try {
    const response = await fetch(`https://api.mercadopago.com/pos?external_id=${getPos_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener POS: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('📦 Respuesta completa del POS:', data);
    console.log('✅ POS encontrado:', data);
    res.json(data);

  } catch (error) {
    console.error('❌ Error en /getPos:', error);
    res.status(500).json({ error: 'Error al obtener el POS' });
  }
});

app.get('/test', (req, res) => {
  res.json({ test: test });
})

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Webhook de Mercado Pago
app.post('/webhook', async (req, res) => {
  console.log('Notificación recibida:', JSON.stringify(req.body, null, 2));

  // Aquí puedes emitir un evento a todos los clientes conectados
  io.emit('nuevo-pago', req.body); // o un nombre más descriptivo

  const { topic, resource } = req.body;

  if (topic === 'merchant_order' && resource) {
    // Consultar el estado del pedido
    try {
      const response = await fetch(resource, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      const merchantOrder = await response.json();

      console.log('🔍 Merchant Order:', JSON.stringify(merchantOrder, null, 2));

      // Revisar si hay pagos asociados
      if (merchantOrder.payments && merchantOrder.payments.length > 0) {//if (merchantOrder.payments && merchantOrder.payments.length == 0) {//
        const payment = merchantOrder.payments[0];

        if (payment.status === 'approved') {//if (merchantOrder.payments){
          try {
            console.log('✅ Pago aprobado, agregando crédito');
            // Primero seleccionás el joystick (ejemplo: gamepad 2)

            //await sendCommandToGamepad('select ' + merchantOrder.items[0].title);
            const pos_id = merchantOrder.items[0].title;
            let arcade_ip= "";
            for (const ip in gamepadClients) {
              const gamepad = gamepadClients[ip];
              if(gamepad.pos_id == pos_id){
                arcade_ip = ip;
              }
            }
            for (let i = 0; i < promo; i++) {
              fetch('http://localhost:4000/enviar-comando', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ip: arcade_ip,  // O la IP que corresponda
                  comando: 'press_a'   // O el comando que quieras enviar
                })
              })
                .then(res => res.json())
                .then(data => console.log(data))
                .catch(err => console.error('Error:', err));
              await sleep(100); // Espera 100 ms antes de soltar
              fetch('http://localhost:4000/enviar-comando', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ip: arcade_ip,  // O la IP que corresponda
                  comando: "release_a"   // O el comando que quieras enviar
                })
              })
                .then(res => res.json())
                .then(data => console.log(data))
                .catch(err => console.error('Error:', err));
              await sleep(1000); // Espera 1000 ms antes de la siguiente iteración
            }

          } catch (err) {
            console.error('❌ Error al enviar comando al gamepad:', err);
          }
        } else {
          console.log('⚠️ Pago NO aprobado todavía:', payment.status);
        }
      } else {
        console.log('⚠️ No hay pagos en esta merchant_order');
      }
    } catch (error) {
      console.error('❌ Error al consultar merchant_order:', error);
    }
  }

  res.sendStatus(200);
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Backend escuchando en puerto ${PORT}`));
