const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
//const SA = require('./superadmin/SA.js');


router.post('/verify', authentication.verifyToken);
router.post('/re-verify-mail', authentication.resendToken);
router.post('/forgot', authentication.forgotPassword);
router.post('/reset-password', authentication.resetPassword);
router.post('/resend-forgot', authentication.resendResetToken);



module.exports = router;