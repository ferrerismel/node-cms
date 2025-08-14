const swaggerUi = require('swagger-ui-express');
const listEndpoints = require('express-list-endpoints');

function capitalize(text) {
  if (!text || typeof text !== 'string') return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getTagsFromPath(routePath) {
  if (routePath.startsWith('/api/')) {
    const parts = routePath.replace('/api/', '').split('/');
    const tag = parts[0] || 'api';
    return [capitalize(tag.replace(/-/g, ' '))];
  }
  if (routePath === '/health') return ['Health'];
  if (routePath === '/') return ['Root'];
  return ['API'];
}

function isPublicEndpoint(routePath) {
  const publicPaths = new Set([
    '/',
    '/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ]);
  return publicPaths.has(routePath);
}

function buildOpenApiSpec(app) {
  const port = process.env.PORT || 3001;
  const endpoints = listEndpoints(app);

  const paths = {};

  endpoints.forEach((endpoint) => {
    const routePath = endpoint.path;

    // Excluir rutas internas/estáticas y comodines
    if (!routePath || routePath === '*' || routePath.startsWith('/uploads')) {
      return;
    }

    // Evitar documentar el propio endpoint de docs si ya estuviera montado
    if (routePath.startsWith('/api/docs')) {
      return;
    }

    endpoint.methods.forEach((method) => {
      const httpMethod = method.toLowerCase();

      if (!paths[routePath]) paths[routePath] = {};

      // No sobrescribir si ya existe un método igual
      if (paths[routePath][httpMethod]) return;

      paths[routePath][httpMethod] = {
        tags: getTagsFromPath(routePath),
        summary: `${method} ${routePath}`,
        responses: {
          200: { description: 'OK' },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
          404: { description: 'Not Found' },
          500: { description: 'Internal Server Error' }
        },
        ...(isPublicEndpoint(routePath) ? {} : { security: [{ BearerAuth: [] }] })
      };
    });
  });

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'CMS Backend API',
      version: '1.0.0',
      description: 'Documentación generada automáticamente a partir de las rutas de Express. Puedes complementar con esquemas y ejemplos cuando lo necesites.'
    },
    servers: [
      { url: `http://localhost:${port}` }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths
  };

  return spec;
}

function setupSwagger(app) {
  // Construir el spec ANTES de registrar las rutas de /api/docs para no incluirlas
  const openApiSpec = buildOpenApiSpec(app);

  // JSON del spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(openApiSpec, null, 2));
  });

  // UI de Swagger
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
}

module.exports = { setupSwagger, buildOpenApiSpec };