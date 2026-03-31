const { sql, pool } = require('../config/db');

async function getDashboardPayload(userJwt, permissions) {
  const connection = await pool;

  const menusResult = await connection.request()
    .input('idPerfil', sql.Int, userJwt.idPerfil)
    .query(`
      SELECT
        mn.id AS idMenu,
        mn.strNombreMenu,
        mn.intOrdenMenu,
        m.id AS idModulo,
        m.strNombreModulo,
        m.strClaveModulo,
        m.strRuta,
        ISNULL(pp.bitAgregar, 0) AS bitAgregar,
        ISNULL(pp.bitEditar, 0) AS bitEditar,
        ISNULL(pp.bitConsulta, 0) AS bitConsulta,
        ISNULL(pp.bitEliminar, 0) AS bitEliminar,
        ISNULL(pp.bitDetalle, 0) AS bitDetalle
      FROM Menu mn
      INNER JOIN MenuModulo mm ON mm.idMenu = mn.id
      INNER JOIN Modulo m ON m.id = mm.idModulo
      LEFT JOIN PermisosPerfil pp
        ON pp.idModulo = m.id AND pp.idPerfil = @idPerfil
      ORDER BY mn.intOrdenMenu, m.id
    `);

  const visibleMenus = [];
  const map = new Map();

  menusResult.recordset.forEach((row) => {
    const allowed = !!(row.bitAgregar || row.bitEditar || row.bitConsulta || row.bitEliminar || row.bitDetalle);
    if (!map.has(row.idMenu)) map.set(row.idMenu, { id: row.idMenu, nombre: row.strNombreMenu, modulos: [] });
    if (allowed) {
      map.get(row.idMenu).modulos.push({
        id: row.idModulo,
        nombre: row.strNombreModulo,
        clave: row.strClaveModulo,
        ruta: row.strRuta
      });
    }
  });

  map.forEach((menu) => {
    if (menu.modulos.length > 0) visibleMenus.push(menu);
  });

  const userResult = await connection.request()
    .input('idUsuario', sql.Int, userJwt.idUsuario)
    .query(`
      SELECT u.id, u.strNombreUsuario, u.strCorreo, u.strNumeroCelular, u.strImagen, p.strNombrePerfil
      FROM Usuario u
      INNER JOIN Perfil p ON p.id = u.idPerfil
      WHERE u.id = @idUsuario
    `);

  return {
    user: userResult.recordset[0],
    menus: visibleMenus,
    permissions
  };
}

module.exports = { getDashboardPayload };
