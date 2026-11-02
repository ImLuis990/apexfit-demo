export const environment = {
  production: false,
  // En desarrollo el proxy (proxy.conf.json) redirige /api a http://localhost:8080
  apiUrl: '/api/v1',
  // Dirección de la app de usuarios: el panel no tiene login propio, usa el de esa app.
  usuariosUrl: 'http://localhost:4200',
};
