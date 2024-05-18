const express = require('express');
const router = express.Router();
const auth =require("./auth/authentication")

router.post('/createuser',auth.register);
router.post('/login',auth.login);
router.get('/UserDetails',auth.getUserDetails);
router.put('/setUserOnline',auth.setUserOnline);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);


module.exports = router;
