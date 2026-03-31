const express = require('express');
const router = express.Router();
const { sql, pool } = require('../config/db');
const axios = require('axios');
const { signToken, requireAuth, loadPermissions } = require('../middleware/auth');
const { getDashboardPayload } = require('../services/dashboard-data');

const RECAPTCHA_SECRET = '6LebTlYsAAAAAD0Q3XM3e6ah7CctvUEK4OEclWDR';
const RECAPTCHA_SITE = '6LebTlYsAAAAADnLSamRI9p-VJYYovtlyxHeRD-8';

router.get('/', (req, res) => {
  res.render('login', { error: req.query.error || '', siteKey: RECAPTCHA_SITE });
});

router.post('/login', async (req, res) => {
  const { usuario, password, 'g-recaptcha-response': captcha } = req.body;
  try {
    if (!captcha) return res.redirect('/?error=Verifica el reCAPTCHA');

    const captchaResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: RECAPTCHA_SECRET, response: captcha } }
    );

    if (!captchaResponse.data.success) {
      return res.redirect('/?error=Captcha inválido');
    }

    const connection = await pool;
    const result = await connection.request()
      .input('usuario', sql.VarChar(80), usuario)
      .query(`
        SELECT TOP 1
          u.id AS idUsuario,
          u.strNombreUsuario,
          u.strPwd,
          u.idPerfil,
          u.idEstadoUsuario,
          u.strCorreo,
          p.bitAdministrador,
          eu.strNombreEstado
        FROM Usuario u
        INNER JOIN Perfil p ON p.id = u.idPerfil
        INNER JOIN EstadoUsuario eu ON eu.id = u.idEstadoUsuario
        WHERE u.strNombreUsuario = @usuario OR u.strCorreo = @usuario
      `);

    if (!result.recordset.length) return res.redirect('/?error=Usuario o contraseña incorrectos');

    const user = result.recordset[0];
    if (user.strPwd !== password) return res.redirect('/?error=Usuario o contraseña incorrectos');
    if (user.idEstadoUsuario !== 1) return res.redirect('/?error=El usuario no existe o está inactivo');

    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.redirect('/?error=Error interno al iniciar sesión');
  }
});

router.get('/dashboard', requireAuth, loadPermissions, async (req, res, next) => {
  try {
    const payload = await getDashboardPayload(req.user, req.permissions);
    res.render('dashboard', { ...payload, initialModule: null });
  } catch (error) {
    next(error);
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
