const jwt = require('jsonwebtoken');
const secretKey = 'SenseLive-Smart-Work-Permit'; // Replace with your own secret key

// Generate a JWT token
function generateToken(payload) {
  return jwt.sign(payload, secretKey, { expiresIn: '1h' });
}

// Verify and decode a JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    return null;
  }
}

module.exports = { generateToken, verifyToken };