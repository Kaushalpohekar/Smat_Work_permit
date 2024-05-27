const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');

const organizationAdmin = require('./dashboard/organization.js')
const SA = require('./superadmin/SA.js');
const SA = require('/SuperAdmin/SA.js');

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


//Organization Admin

//categoryies
router.post('/createCategory',organizationAdmin.createCategory);
router.put('/updateCategory/:category_id',organizationAdmin.updateCateogry);
router.delete('/deleteCategory/:category_id',organizationAdmin.deleteCategory);
router.get('/getCategory/:category_id',organizationAdmin.getCategoryById);
router.get('/getAllCategory',organizationAdmin.getAllCategories);


//forms

router.post('/createForms/:category_id',organizationAdmin.createForm);
router.get('/FormById/:form_id',organizationAdmin.getFormById);
router.get('/getAllForms',organizationAdmin.getAllForms);
router.put('/updateForm/:form_id',organizationAdmin.updateform);
router.delete('/deleteForms/:form_id',organizationAdmin.deleteForm);
module.exports = router;