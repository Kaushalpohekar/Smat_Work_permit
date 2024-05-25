const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
const SA = require('./SuperAdmin/SA.js');

//Authentication
router.post('/register',auth.register);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.get('/user', auth.getUserDetails);
router.post('/login',auth.login);
router.put('/users/:User_id/block', auth.block);


// Dashboard
router.post('/answer/:user_id',dashboard.postAns);



//SuperAdmin
// router.post('/forms', SA.formscreate);
// router.get('/forms', SA.formread);
// router.get('/forms/:form_id', SA.getformsById);
// router.put('/forms/:form_id', SA.updateForm);
// router.delete('/forms/:form_id', SA.deleteForm);

module.exports = router;