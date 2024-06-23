const express = require('express');
const router = express.Router();

const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
const standard = require('./standard/standard.js');
const authorizer = require('./authorized/authorized.js');
const admin = require('./admin/admin.js');
const organizationAdmin = require('./dashboard/organization.js');

// Authentication
router.post('/register', auth.register);
router.post('/forgot', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.get('/user', auth.getUserDetails);
router.post('/login', auth.login);
router.put('/users/:User_id/block', auth.block);
router.post('/tokens', auth.getAllTokens);
router.put('/updateUser/:user_id', auth.updateUser);
router.put('/updateEmail/:user_id', auth.updateEmail);
router.put('/updatePassword/:user_id', auth.updatePassword);
router.put('/updateProfile', auth.insertOrUpdateUserProfilePhoto);
router.get('/profilePicture/:user_id', auth.getProfilePicture);
// Dashboard
router.post('/answer/:user_id', dashboard.postAns);

// Standard
router.get('/getCategories/:department_id/:form_type', standard.getCategories);
router.get('/getQuestions/:form_id', standard.getQuestions);
router.get('/getForms/:category_id', standard.getForms);
router.get('/getDepartments/:department_id', standard.getDepartments);
router.get('/getPlants/:plant_id', standard.getPlants);
router.get('/getOrganizations/:organization_id', standard.getOrganizations);
router.post('/insertCategories', standard.insertCategories);
router.post('/createQuestions', standard.createQuestions);
router.post('/createForms', standard.createForms);
router.get('/getSubmissionDetails/:submission_id', standard.getSubmissionDetails);
router.post('/insertDetails', standard.insertSubmissionDetails);
router.get('/getAuthorizers/:department_id', standard.getAuthorizersByDepartment);
router.get('/getSubmissionByInterval/:user_id/:interval', standard.getUserSubmissions);
router.get('/getSubmissionByIntervalCount/:user_id/:interval', standard.getUserSubmissionStatusCounts);
router.get('/getSubmissionCount/:form_type/:user_id', standard.getSubmissionCount);
// Authorizer
router.get('/getSubmissionByIntervalAuthorizer/:category_id/:user_id/:interval', authorizer.getUserSubmissions);
router.put('/approveSubmission', authorizer.approveSubmission);
router.put('/rejectSubmission', authorizer.rejectSubmission);
router.get('/profileDetails/:user_id', authorizer.getUserDetails);
router.get('/getSubmissionCountAuth/:form_type/:user_id', authorizer.getSubmissionCount);
router.get('/getFormTypeBar/:user_id/:interval', authorizer.getFormTypeBar);
router.get('/getFormTypePercentages/:user_id/:interval', authorizer.getFormTypePercentages);
router.get('/getStatusCounts/:user_id/:interval', authorizer.getStatusCounts);
router.get('/getApprovedCounts/:user_id/:interval', authorizer.getApprovedCounts);
router.post('/signature', authorizer.insertOrUpdateSignature);


// Organization Admin - Categories
router.post('/createCategory/:department_id', organizationAdmin.createCategory);
router.put('/updateCategory/:category_id', organizationAdmin.updateCategory);
router.delete('/deleteCategory/:category_id', organizationAdmin.deleteCategory);
router.get('/getCategory/:category_id', organizationAdmin.getCategoryById);
router.get('/getAllCategory', organizationAdmin.getAllCategories);

// Organization Admin - Forms
router.post('/createForms/:category_id', organizationAdmin.createForm);
router.get('/FormById/:form_id', organizationAdmin.getFormById);
router.get('/getAllForms', organizationAdmin.getAllForms);
router.delete('/deleteForms/:form_id', organizationAdmin.deleteForm);

// Organization Admin - Questions
router.post('/questionCreate/:form_id', organizationAdmin.createQuestion);
router.put('/updatequestion/:question_id', organizationAdmin.updateQuestion);
router.delete('/deletequestion/:question_id', organizationAdmin.deleteQuestion);
router.get('/getquestionbyid/:form_id', organizationAdmin.getQuestionByFormId);


// Admin
router.get('/organizationData/:organization_id', admin.organizationByOrganizationId);
router.get('/plantsData/:organization_id', admin.plantsByOrganizationId);
router.get('/departmentsData/:plant_id', admin.departmentsByPlantId);
router.get('/usersDataByDepartments/:department_id', admin.userByDepartmentId);
router.get('/usersDataByOrganization/:organization_id', admin.usersByOrganizationId);
router.get('/categoriesData/:department_id', admin.CategoriesByDepartmentId);
router.get('/prevForms/:category_id', admin.previousFormsByCategories);
router.get('/roles', admin.userRoles);

router.post('/addPlant/:organization_id', admin.addPlantsInOrganization);
router.post('/addDepartment/:plant_id', admin.addDepartmentInPlants);
//categories
router.post('/createCategory/:department_id',organizationAdmin.createCategory);
router.put('/updateCategory/:category_id',organizationAdmin.updateCategory);
router.delete('/deleteCategory/:category_id',organizationAdmin.deleteCategory);
router.get('/getCategory/:category_id',organizationAdmin.getCategoryById);
router.get('/getAllCategory',organizationAdmin.getAllCategories);

//forms
router.post('/createForms',organizationAdmin.createForm);
router.get('/FormById/:form_id',organizationAdmin.getFormById);
router.get('/getAllForms',organizationAdmin.getAllForms);
//router.put('/updateForm/:form_id',organizationAdmin.updateform);
router.delete('/deleteForms/:form_id',organizationAdmin.deleteForm);
router.put('/updatePlant/:plant_id', admin.updatePlantByPlantId);
router.put('/updateDepartment/:department_id', admin.updateDepartmentByDepartmentId);

router.delete('/deletePlant/:plant_id', admin.deletePlantByPlantId);
router.delete('/deleteDepartment/:department_id', admin.deleteDepartmentByDepartmentId);

module.exports = router;
