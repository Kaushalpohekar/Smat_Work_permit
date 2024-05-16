const express = require('express');
const router = express.Router();
const auth =require("./auth/authentication")

router.post('/createuser',auth.register);
router.post('/login',auth.login);



module.exports = router;
