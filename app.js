const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/auth.routes'));
app.use('/', require('./routes/ftp.routes'));
app.use('/', require('./routes/seguridad.routes'));
app.use('/', require('./routes/static.routes'));
app.use('/', require('./routes/crud.routes'));

app.use((req, res) => {
  res.status(404).render('error', { code: 404, message: 'La página solicitada no existe.' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { code: 500, message: err.message || 'Ocurrió un error inesperado.' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
