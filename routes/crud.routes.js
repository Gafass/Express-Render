const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sql, pool } = require('../config/db');
const { requireAuth, loadPermissions, requireModuleAccess } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '..', 'uploads', 'users');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Formato de imagen no permitido'));
    cb(null, true);
  }
});

router.use(requireAuth, loadPermissions);

router.get('/api/catalogos/base', async (_req, res, next) => {
  try {
    const connection = await pool;
    const perfiles = await connection.request().query('SELECT id, strNombrePerfil FROM Perfil ORDER BY strNombrePerfil');
    const estados = await connection.request().query('SELECT id, strNombreEstado FROM EstadoUsuario ORDER BY id');
    const modulos = await connection.request().query('SELECT id, strNombreModulo FROM Modulo ORDER BY id');
    const menus = await connection.request().query('SELECT id, strNombreMenu FROM Menu ORDER BY intOrdenMenu, id');
    res.json({ ok: true, perfiles: perfiles.recordset, estados: estados.recordset, modulos: modulos.recordset, menus: menus.recordset });
  } catch (error) { next(error); }
});

router.get('/api/static/:moduleKey', (req, res) => {
  const permission = req.permissions?.[req.params.moduleKey];
  if (!permission || !permission.any) return res.status(403).json({ ok: false, message: 'No tienes permiso' });
  res.json({ ok: true, actions: permission });
});

function boolBody(v) { return v === true || v === 'true' || v === 1 || v === '1' || v === 'on'; }
function onlyDigits(value = '') { return String(value || '').replace(/\D/g, ''); }
function isValidPhone(value = '') { return /^\d{10}$/.test(onlyDigits(value)); }

router.get('/api/perfiles', requireModuleAccess('perfil', 'consulta'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 5; const offset = (page - 1) * limit; const search = (req.query.search || '').trim();
    const connection = await pool;
    const totalResult = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query('SELECT COUNT(*) AS total FROM Perfil WHERE strNombrePerfil LIKE @search');
    const result = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query(`SELECT id, strNombrePerfil, bitAdministrador FROM Perfil WHERE strNombrePerfil LIKE @search ORDER BY id DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);
    res.json({ ok: true, data: result.recordset, page, totalPages: Math.ceil(totalResult.recordset[0].total / limit) || 1 });
  } catch (error) { next(error); }
});
router.get('/api/perfiles/:id', requireModuleAccess('perfil', 'detalle'), async (req, res, next) => { try { const connection = await pool; const result = await connection.request().input('id', sql.Int, req.params.id).query('SELECT id, strNombrePerfil, bitAdministrador FROM Perfil WHERE id = @id'); res.json({ ok: true, data: result.recordset[0] || null }); } catch (error) { next(error); } });
router.post('/api/perfiles', requireModuleAccess('perfil', 'agregar'), async (req, res, next) => { try { const { strNombrePerfil } = req.body; const connection = await pool; await connection.request().input('strNombrePerfil', sql.VarChar(80), strNombrePerfil).input('bitAdministrador', sql.Bit, boolBody(req.body.bitAdministrador)).query('INSERT INTO Perfil (strNombrePerfil, bitAdministrador) VALUES (@strNombrePerfil, @bitAdministrador)'); res.json({ ok: true }); } catch (error) { next(error); } });
router.put('/api/perfiles/:id', requireModuleAccess('perfil', 'editar'), async (req, res, next) => { try { const { strNombrePerfil } = req.body; const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).input('strNombrePerfil', sql.VarChar(80), strNombrePerfil).input('bitAdministrador', sql.Bit, boolBody(req.body.bitAdministrador)).query('UPDATE Perfil SET strNombrePerfil = @strNombrePerfil, bitAdministrador = @bitAdministrador WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });
router.delete('/api/perfiles/:id', requireModuleAccess('perfil', 'eliminar'), async (req, res, next) => { try { const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).query('DELETE FROM Perfil WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });

router.get('/api/modulos', requireModuleAccess('modulo', 'consulta'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 5; const offset = (page - 1) * limit; const search = (req.query.search || '').trim();
    const connection = await pool;
    const totalResult = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query('SELECT COUNT(*) AS total FROM Modulo WHERE strNombreModulo LIKE @search');
    const result = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query(`SELECT id, strNombreModulo, strClaveModulo, strRuta FROM Modulo WHERE strNombreModulo LIKE @search ORDER BY id DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);
    res.json({ ok: true, data: result.recordset, page, totalPages: Math.ceil(totalResult.recordset[0].total / limit) || 1 });
  } catch (error) { next(error); }
});
router.get('/api/modulos/:id', requireModuleAccess('modulo', 'detalle'), async (req, res, next) => { try { const connection = await pool; const result = await connection.request().input('id', sql.Int, req.params.id).query('SELECT id, strNombreModulo, strClaveModulo, strRuta FROM Modulo WHERE id = @id'); res.json({ ok: true, data: result.recordset[0] || null }); } catch (error) { next(error); } });
router.post('/api/modulos', requireModuleAccess('modulo', 'agregar'), async (req, res, next) => { try { const { strNombreModulo, strClaveModulo, strRuta } = req.body; const connection = await pool; await connection.request().input('strNombreModulo', sql.VarChar(80), strNombreModulo).input('strClaveModulo', sql.VarChar(50), strClaveModulo).input('strRuta', sql.VarChar(120), strRuta).query('INSERT INTO Modulo (strNombreModulo, strClaveModulo, strRuta) VALUES (@strNombreModulo, @strClaveModulo, @strRuta)'); res.json({ ok: true }); } catch (error) { next(error); } });
router.put('/api/modulos/:id', requireModuleAccess('modulo', 'editar'), async (req, res, next) => { try { const { strNombreModulo, strClaveModulo, strRuta } = req.body; const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).input('strNombreModulo', sql.VarChar(80), strNombreModulo).input('strClaveModulo', sql.VarChar(50), strClaveModulo).input('strRuta', sql.VarChar(120), strRuta).query('UPDATE Modulo SET strNombreModulo = @strNombreModulo, strClaveModulo = @strClaveModulo, strRuta = @strRuta WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });
router.delete('/api/modulos/:id', requireModuleAccess('modulo', 'eliminar'), async (req, res, next) => { try { const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).query('DELETE FROM Modulo WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });

router.get('/api/permisos-perfil', requireModuleAccess('permisos_perfil', 'consulta'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 5;
    const offset = (page - 1) * limit;
    const idPerfil = parseInt(req.query.idPerfil || '0', 10);
    const connection = await pool;

    if (idPerfil > 0) {
      const totalResult = await connection.request()
        .query('SELECT COUNT(*) AS total FROM Modulo');

      const result = await connection.request()
        .input('idPerfil', sql.Int, idPerfil)
        .query(`
          SELECT
            ISNULL(pp.id, 0) AS id,
            m.id AS idModulo,
            @idPerfil AS idPerfil,
            ISNULL(pp.bitAgregar, 0) AS bitAgregar,
            ISNULL(pp.bitEditar, 0) AS bitEditar,
            ISNULL(pp.bitConsulta, 0) AS bitConsulta,
            ISNULL(pp.bitEliminar, 0) AS bitEliminar,
            ISNULL(pp.bitDetalle, 0) AS bitDetalle,
            p.strNombrePerfil,
            m.strNombreModulo
          FROM Modulo m
          CROSS JOIN Perfil p
          LEFT JOIN PermisosPerfil pp
            ON pp.idModulo = m.id
           AND pp.idPerfil = p.id
          WHERE p.id = @idPerfil
          ORDER BY m.id
          OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
        `);

      return res.json({
        ok: true,
        data: result.recordset,
        page,
        totalPages: Math.ceil(totalResult.recordset[0].total / limit) || 1
      });
    }

    const totalResult = await connection.request().query('SELECT COUNT(*) AS total FROM PermisosPerfil');
    const result = await connection.request().query(`SELECT pp.id, pp.idModulo, pp.idPerfil, pp.bitAgregar, pp.bitEditar, pp.bitConsulta, pp.bitEliminar, pp.bitDetalle, p.strNombrePerfil, m.strNombreModulo FROM PermisosPerfil pp INNER JOIN Perfil p ON p.id = pp.idPerfil INNER JOIN Modulo m ON m.id = pp.idModulo ORDER BY pp.id DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);
    res.json({ ok: true, data: result.recordset, page, totalPages: Math.ceil(totalResult.recordset[0].total / limit) || 1 });
  } catch (error) { next(error); }
});
router.get('/api/permisos-perfil/:id', requireModuleAccess('permisos_perfil', 'detalle'), async (req, res, next) => { try { const connection = await pool; const result = await connection.request().input('id', sql.Int, req.params.id).query('SELECT id, idModulo, idPerfil, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle FROM PermisosPerfil WHERE id = @id'); res.json({ ok: true, data: result.recordset[0] || null }); } catch (error) { next(error); } });
router.post('/api/permisos-perfil', requireModuleAccess('permisos_perfil', 'agregar'), async (req, res, next) => { try { const connection = await pool; await connection.request().input('idModulo', sql.Int, req.body.idModulo).input('idPerfil', sql.Int, req.body.idPerfil).input('bitAgregar', sql.Bit, boolBody(req.body.bitAgregar)).input('bitEditar', sql.Bit, boolBody(req.body.bitEditar)).input('bitConsulta', sql.Bit, boolBody(req.body.bitConsulta)).input('bitEliminar', sql.Bit, boolBody(req.body.bitEliminar)).input('bitDetalle', sql.Bit, boolBody(req.body.bitDetalle)).query('INSERT INTO PermisosPerfil (idModulo, idPerfil, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle) VALUES (@idModulo, @idPerfil, @bitAgregar, @bitEditar, @bitConsulta, @bitEliminar, @bitDetalle)'); res.json({ ok: true }); } catch (error) { next(error); } });
router.put('/api/permisos-perfil/:id', requireModuleAccess('permisos_perfil', 'editar'), async (req, res, next) => {
  try {
    const connection = await pool;
    const id = parseInt(req.params.id || '0', 10);
    const idPerfil = parseInt(req.body.idPerfil || '0', 10);
    const idModulo = parseInt(req.body.idModulo || '0', 10);

    if (id > 0) {
      await connection.request()
        .input('id', sql.Int, id)
        .input('idModulo', sql.Int, idModulo)
        .input('idPerfil', sql.Int, idPerfil)
        .input('bitAgregar', sql.Bit, boolBody(req.body.bitAgregar))
        .input('bitEditar', sql.Bit, boolBody(req.body.bitEditar))
        .input('bitConsulta', sql.Bit, boolBody(req.body.bitConsulta))
        .input('bitEliminar', sql.Bit, boolBody(req.body.bitEliminar))
        .input('bitDetalle', sql.Bit, boolBody(req.body.bitDetalle))
        .query('UPDATE PermisosPerfil SET idModulo=@idModulo, idPerfil=@idPerfil, bitAgregar=@bitAgregar, bitEditar=@bitEditar, bitConsulta=@bitConsulta, bitEliminar=@bitEliminar, bitDetalle=@bitDetalle WHERE id=@id');
    } else {
      const existing = await connection.request()
        .input('idPerfil', sql.Int, idPerfil)
        .input('idModulo', sql.Int, idModulo)
        .query('SELECT TOP 1 id FROM PermisosPerfil WHERE idPerfil = @idPerfil AND idModulo = @idModulo');

      if (existing.recordset[0]?.id) {
        await connection.request()
          .input('id', sql.Int, existing.recordset[0].id)
          .input('idModulo', sql.Int, idModulo)
          .input('idPerfil', sql.Int, idPerfil)
          .input('bitAgregar', sql.Bit, boolBody(req.body.bitAgregar))
          .input('bitEditar', sql.Bit, boolBody(req.body.bitEditar))
          .input('bitConsulta', sql.Bit, boolBody(req.body.bitConsulta))
          .input('bitEliminar', sql.Bit, boolBody(req.body.bitEliminar))
          .input('bitDetalle', sql.Bit, boolBody(req.body.bitDetalle))
          .query('UPDATE PermisosPerfil SET idModulo=@idModulo, idPerfil=@idPerfil, bitAgregar=@bitAgregar, bitEditar=@bitEditar, bitConsulta=@bitConsulta, bitEliminar=@bitEliminar, bitDetalle=@bitDetalle WHERE id=@id');
      } else {
        await connection.request()
          .input('idModulo', sql.Int, idModulo)
          .input('idPerfil', sql.Int, idPerfil)
          .input('bitAgregar', sql.Bit, boolBody(req.body.bitAgregar))
          .input('bitEditar', sql.Bit, boolBody(req.body.bitEditar))
          .input('bitConsulta', sql.Bit, boolBody(req.body.bitConsulta))
          .input('bitEliminar', sql.Bit, boolBody(req.body.bitEliminar))
          .input('bitDetalle', sql.Bit, boolBody(req.body.bitDetalle))
          .query('INSERT INTO PermisosPerfil (idModulo, idPerfil, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle) VALUES (@idModulo, @idPerfil, @bitAgregar, @bitEditar, @bitConsulta, @bitEliminar, @bitDetalle)');
      }
    }

    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.delete('/api/permisos-perfil/:id', requireModuleAccess('permisos_perfil', 'eliminar'), async (req, res, next) => { try { const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).query('DELETE FROM PermisosPerfil WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });

router.get('/api/usuarios', requireModuleAccess('usuario', 'consulta'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 5; const offset = (page - 1) * limit; const search = (req.query.search || '').trim();
    const connection = await pool;
    const totalResult = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query('SELECT COUNT(*) AS total FROM Usuario WHERE strNombreUsuario LIKE @search OR strCorreo LIKE @search');
    const result = await connection.request().input('search', sql.VarChar(100), `%${search}%`).query(`SELECT u.id, u.strNombreUsuario, u.idPerfil, u.strPwd, u.idEstadoUsuario, u.strCorreo, u.strNumeroCelular, u.strImagen, p.strNombrePerfil, eu.strNombreEstado FROM Usuario u INNER JOIN Perfil p ON p.id = u.idPerfil INNER JOIN EstadoUsuario eu ON eu.id = u.idEstadoUsuario WHERE u.strNombreUsuario LIKE @search OR u.strCorreo LIKE @search ORDER BY u.id DESC OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`);
    res.json({ ok: true, data: result.recordset, page, totalPages: Math.ceil(totalResult.recordset[0].total / limit) || 1 });
  } catch (error) { next(error); }
});
router.get('/api/usuarios/:id', requireModuleAccess('usuario', 'detalle'), async (req, res, next) => { try { const connection = await pool; const result = await connection.request().input('id', sql.Int, req.params.id).query('SELECT id, strNombreUsuario, idPerfil, strPwd, idEstadoUsuario, strCorreo, strNumeroCelular, strImagen FROM Usuario WHERE id = @id'); res.json({ ok: true, data: result.recordset[0] || null }); } catch (error) { next(error); } });
router.post('/api/usuarios', requireModuleAccess('usuario', 'agregar'), upload.single('strImagen'), async (req, res, next) => {
  try {
    const telefono = onlyDigits(req.body.strNumeroCelular);
    if (!isValidPhone(telefono)) {
      return res.status(400).json({ ok: false, message: 'El número de teléfono debe tener exactamente 10 dígitos.' });
    }

    const strImagen = req.file ? `/uploads/users/${req.file.filename}` : null;
    const connection = await pool;
    await connection.request()
      .input('strNombreUsuario', sql.VarChar(80), req.body.strNombreUsuario)
      .input('idPerfil', sql.Int, req.body.idPerfil)
      .input('strPwd', sql.VarChar(120), req.body.strPwd)
      .input('idEstadoUsuario', sql.Int, req.body.idEstadoUsuario)
      .input('strCorreo', sql.VarChar(120), req.body.strCorreo)
      .input('strNumeroCelular', sql.VarChar(10), telefono)
      .input('strImagen', sql.VarChar(255), strImagen)
      .query('INSERT INTO Usuario (strNombreUsuario, idPerfil, strPwd, idEstadoUsuario, strCorreo, strNumeroCelular, strImagen) VALUES (@strNombreUsuario, @idPerfil, @strPwd, @idEstadoUsuario, @strCorreo, @strNumeroCelular, @strImagen)');
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.put('/api/usuarios/:id', requireModuleAccess('usuario', 'editar'), upload.single('strImagen'), async (req, res, next) => {
  try {
    const telefono = onlyDigits(req.body.strNumeroCelular);
    if (!isValidPhone(telefono)) {
      return res.status(400).json({ ok: false, message: 'El número de teléfono debe tener exactamente 10 dígitos.' });
    }

    const connection = await pool;
    let strImagen = null;
    if (req.file) { strImagen = `/uploads/users/${req.file.filename}`; }
    else {
      const oldData = await connection.request().input('id', sql.Int, req.params.id).query('SELECT strImagen FROM Usuario WHERE id = @id');
      strImagen = oldData.recordset[0]?.strImagen || null;
    }
    await connection.request()
      .input('id', sql.Int, req.params.id)
      .input('strNombreUsuario', sql.VarChar(80), req.body.strNombreUsuario)
      .input('idPerfil', sql.Int, req.body.idPerfil)
      .input('strPwd', sql.VarChar(120), req.body.strPwd)
      .input('idEstadoUsuario', sql.Int, req.body.idEstadoUsuario)
      .input('strCorreo', sql.VarChar(120), req.body.strCorreo)
      .input('strNumeroCelular', sql.VarChar(10), telefono)
      .input('strImagen', sql.VarChar(255), strImagen)
      .query('UPDATE Usuario SET strNombreUsuario=@strNombreUsuario, idPerfil=@idPerfil, strPwd=@strPwd, idEstadoUsuario=@idEstadoUsuario, strCorreo=@strCorreo, strNumeroCelular=@strNumeroCelular, strImagen=@strImagen WHERE id=@id');
    res.json({ ok: true });
  } catch (error) { next(error); }
});
router.delete('/api/usuarios/:id', requireModuleAccess('usuario', 'eliminar'), async (req, res, next) => { try { const connection = await pool; await connection.request().input('id', sql.Int, req.params.id).query('DELETE FROM Usuario WHERE id = @id'); res.json({ ok: true }); } catch (error) { next(error); } });

module.exports = router;
