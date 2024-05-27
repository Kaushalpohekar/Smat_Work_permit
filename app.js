const express = require('express');
const cors = require('cors');
const router = require('./routes'); // Ensure this path is correct
const bodyParser = require('body-parser');


const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

// Use the router for handling routes
app.use(router);

app.get('/', (req, res) => {
  console.log('get request!!')
  res.send('Server is running');
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
