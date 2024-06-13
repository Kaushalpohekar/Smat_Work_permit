const express = require('express');
const router = express.Router();
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
const standard = require('./standard/standard.js')
const admin = require('./admin/admin.js')


const organizationAdmin = require('./dashboard/organization.js')


//Authentication
router.post('/register',auth.register);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.get('/user', auth.getUserDetails);
router.post('/login',auth.login);
router.put('/users/:User_id/block', auth.block);
router.post('/tokens', auth.getAllTokens);
router.put('/updateUserdetails',auth.updateUser);
router.put('/updatemail',auth.updateEmail);
router.put('/profilePicture/:user_id/profile-picture',auth.updateProfilePicture);

// Dashboard
router.post('/answer/:user_id',dashboard.postAns);


//Standard

router.get('/getCategories/:department_id/:form_type',standard.getCategories)
router.get('/getQuestions/:form_id',standard.getQuestions)
router.get('/getForms/:category_id',standard.getForms)
router.get('/getDepartments/:department_id',standard.getDepartments)
router.get('/getPlants/:plant_id',standard.getPlants)
router.get('/getOrganizations/:organization_id',standard.getOrganizations)
router.post('/insertCategories',standard.insertCategories);
router.post('/createQuestions',standard.createQuestions);
router.post('/createForms',standard.createForms);

router.get('/getDetails/:submission_id',standard.getSubmissionDetails);
router.post('/insertDetails', standard.insertSubmissionDetails);
router.get('/getAuthorizers/:department_id',standard.getAuthorizersByDepartment);
router.get('/getSubmissionByInterval/:user_id/:interval', standard.getUserSubmissions);
router.get('/getSubmissionByIntervalCount/:user_id/:interval', standard.getUserSubmissionStatusCounts);

//SuperAdmin
// router.post('/forms', SA.formscreate);
// router.get('/forms', SA.formread);
// router.get('/forms/:form_id', SA.getformsById);
// router.put('/forms/:form_id', SA.updateForm);
// router.delete('/forms/:form_id', SA.deleteForm);


//Organization Admin

//categoryies
router.post('/createCategory/:department_id',organizationAdmin.createCategory);
router.put('/updateCategory/:category_id',organizationAdmin.updateCategory);
router.delete('/deleteCategory/:category_id',organizationAdmin.deleteCategory);
router.get('/getCategory/:category_id',organizationAdmin.getCategoryById);
router.get('/getAllCategory',organizationAdmin.getAllCategories);

//forms
router.post('/createForms/:category_id',organizationAdmin.createForm);
router.get('/FormById/:form_id',organizationAdmin.getFormById);
router.get('/getAllForms',organizationAdmin.getAllForms);
//router.put('/updateForm/:form_id',organizationAdmin.updateform);
router.delete('/deleteForms/:form_id',organizationAdmin.deleteForm);

//questions
router.post('/questionCreate/:form_id',organizationAdmin.createQuestion);
router.put('/updatequestion/:question_id',organizationAdmin.updateQuestion);
router.delete('/deletequestion/:question_id',organizationAdmin.deleteQuestion);
router.get('/getquestionbyid/:form_id',organizationAdmin.getQuestionByFormId);

//admin
router.get('/organizationData/:organization_id',admin.organizationByOrganizationId);
router.get('/plantsData/:organization_id',admin.plantsByOrganizationId);
router.get('/departmentsData/:plant_id',admin.departmentsByPlantId);
router.get('/usersDataByDepartments/:department_id',admin.userByDepartmentId);
router.get('/usersDataByOrganization/:organization_id',admin.usersByOrganizationId);
router.get('/categoriesData/:department_id',admin.CategoriesByDepartmentId);
router.get('/prevForms/:category_id',admin.previousFormsByCategories);
router.get('/roles',admin.userRoles);

router.post('/addPlant/:organization_id',admin.addPlantsInOrganization);
router.post('/addDepartment/:plant_id',admin.addDepartmentInPlants);

router.put('/updatePlant/:plant_id',admin.updatePlantByPlantId);
router.put('/updateDepartment/:department_id',admin.updateDepartmentByDepartmentId);

router.delete('/deletePlant/:plant_id',admin.deletePlantByPlantId);
router.delete('/deleteDepartment/:department_id',admin.deleteDepartmentByDepartmentId);

module.exports=router;