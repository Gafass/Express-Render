const express = require('express');
const router = express.Router();
const { requireAuth, loadPermissions, requireModuleAccess } = require('../middleware/auth');
const { getDashboardPayload } = require('../services/dashboard-data');

router.use(requireAuth, loadPermissions);

const staticModules = [
  { path: '/principal-1-1', menuName: 'Principal 1', moduleKey: 'principal_1_1', moduleName: 'Principal 1.1' },
  { path: '/principal-1-2', menuName: 'Principal 1', moduleKey: 'principal_1_2', moduleName: 'Principal 1.2' },
  { path: '/principal-2-1', menuName: 'Principal 2', moduleKey: 'principal_2_1', moduleName: 'Principal 2.1' },
  { path: '/principal-2-2', menuName: 'Principal 2', moduleKey: 'principal_2_2', moduleName: 'Principal 2.2' }
];

async function renderStaticView(req, res, next, moduleInfo) {
  try {
    const payload = await getDashboardPayload(req.user, req.permissions);
    res.render('dashboard', {
      ...payload,
      initialModule: moduleInfo
    });
  } catch (error) {
    next(error);
  }
}

staticModules.forEach((moduleInfo) => {
  router.get(moduleInfo.path, requireModuleAccess(moduleInfo.moduleKey, 'consulta'), (req, res, next) => {
    renderStaticView(req, res, next, moduleInfo);
  });
});

module.exports = router;
