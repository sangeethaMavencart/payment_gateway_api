require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const paymentRoutes = require('./paymentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', paymentRoutes);

app.listen(PORT, () => {
  console.log(`Easebuzz server running at http://localhost:${PORT}`);
});
