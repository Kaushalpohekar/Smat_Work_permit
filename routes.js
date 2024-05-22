const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
//const SA = require('./superadmin/SA.js');

router.post('/register',auth.register);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.get('/user', auth.getUserDetails);
router.post('/login',auth.login);
router.put('/users/:User_id/block', auth.block);



module.exports = router;