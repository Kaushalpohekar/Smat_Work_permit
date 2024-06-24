const express = require('express');
const cors = require('cors');
const router = require('./routes'); // Ensure this path is correct
const https = require('https');
const fs = require('fs');


const app = express();
const port = 4100;

const privateKey = fs.readFileSync('/etc/letsencrypt/live/senso.senselive.in/privkey.pem', 'utf8');
const fullchain = fs.readFileSync('/etc/letsencrypt/live/senso.senselive.in/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: fullchain };

// Middleware to enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json({ limit: '500mb' }));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Use the router for handling routes
app.use('/swp', router);
app.get('/swp/test', (req, res) => {
  console.log('Received GET request to /api/example');
  res.send('Response from Node.js server');
});

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(port, () => {
  console.log(`HTTPS server listening on port ${port}`);
});

