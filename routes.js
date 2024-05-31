const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
const standard = require('./standard/standard.js')


const organizationAdmin = require('./dashboard/organization.js')

//const SA = require('/superadmin/SA.js');
//const SA = require('/SuperAdmin/SA.js');

//Authentication
router.post('/register',auth.register);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.get('/user', auth.getUserDetails);
router.post('/login',auth.login);
router.put('/users/:User_id/block', auth.block);
router.post('/tokens', auth.getAllTokens);


// Dashboard
router.post('/answer/:user_id',dashboard.postAns);


//Standard
router.get('/getCategories/:department_id/:form_type',standard.getCategories)
router.get('/getQuestions/:form_id',standard.getQuestions)
router.get('/getForms/:category_id',standard.getForms)




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



//questions

router.post('/questionCreate/:form_id',organizationAdmin.createQuestion);
router.put('/updatequestion/:question_id',organizationAdmin.updateQuestion);
router.delete('/deletequestion/:question_id',organizationAdmin.deleteQuestion);
router.get('/getquestionbyid/:form_id',organizationAdmin.getQuestionByFormId);











module.exports=router;