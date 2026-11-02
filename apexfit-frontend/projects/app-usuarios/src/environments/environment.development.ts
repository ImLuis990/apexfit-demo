export const environment = {
  production: false,
  // En desarrollo el proxy (proxy.conf.json) redirige /api a http://localhost:8080
  apiUrl: '/api/v1',
  // Dirección del panel: el login (que vive aquí) manda allí a entrenadores y administradores.
  panelUrl: 'http://localhost:4201',
};
