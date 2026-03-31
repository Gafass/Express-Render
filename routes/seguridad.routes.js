const express = require('express');
const router = express.Router();
const { requireAuth, loadPermissions, requireModuleAccess } = require('../middleware/auth');
const { getDashboardPayload } = require('../services/dashboard-data');

router.use(requireAuth, loadPermissions);

async function renderSeguridadView(req, res, next, viewName, initialModule) {
  try {
    const payload = await getDashboardPayload(req.user, req.permissions);
    res.render(`seguridad/${viewName}`, {
      ...payload,
      initialModule
    });
  } catch (error) {
    next(error);
  }
}

router.get('/seguridad/perfil', requireModuleAccess('perfil', 'consulta'), (req, res, next) => {
  renderSeguridadView(req, res, next, 'perfil', {
    menuName: 'Seguridad',
    moduleKey: 'perfil',
    moduleName: 'Perfil'
  });
});

router.get('/seguridad/modulo', requireModuleAccess('modulo', 'consulta'), (req, res, next) => {
  renderSeguridadView(req, res, next, 'modulo', {
    menuName: 'Seguridad',
    moduleKey: 'modulo',
    moduleName: 'Módulo'
  });
});

router.get('/seguridad/permisos-perfil', requireModuleAccess('permisos_perfil', 'consulta'), (req, res, next) => {
  renderSeguridadView(req, res, next, 'permisos-perfil', {
    menuName: 'Seguridad',
    moduleKey: 'permisos_perfil',
    moduleName: 'Permisos Perfil'
  });
});

router.get('/seguridad/usuario', requireModuleAccess('usuario', 'consulta'), (req, res, next) => {
  renderSeguridadView(req, res, next, 'usuario', {
    menuName: 'Seguridad',
    moduleKey: 'usuario',
    moduleName: 'Usuario'
  });
});

module.exports = router;
