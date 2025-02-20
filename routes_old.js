const express = require('express');
const router = express.Router();
const {authenticateUser} = require('./token/jwtUtils.js');

// Import controllers
const auth = require('./auth/authentication.js');
const dashboard = require('./dashboard/dashboard.js');
const standard = require('./standard/standard.js');
const authorizer = require('./authorized/authorized.js');
const admin = require('./admin/admin.js');
const organizationAdmin = require('./dashboard/organization.js');

const ceat = require('./ceat/ceat.js');
//ceat ROUTES
router.post('/ceatInsertData' ,authenticateUser , ceat.insertData);
router.post('/ceatInsertDataBct',authenticateUser , ceat.insertDataBct);
router.get('/getAllSubmissions' ,authenticateUser , ceat.getAllSubmissions); 
router.get('/getSubmissionById/:submissionId',authenticateUser , ceat.getSubmissionById);
router.get('/getSubmissionByIdBct/:submissionId',authenticateUser , ceat.getSubmissionByIdBct);
router.get('/getAllSubmissionsByUser/:user_id',authenticateUser , ceat.getAllSubmissionsByUser);
router.get('/getUserName/:user_id' ,authenticateUser , ceat.getUserName);
router.put('/approveStatus/:submissionId/:userId',authenticateUser , ceat.approveStatus);
router.put('/rejectStatus/:submissionId/:userId' ,authenticateUser , ceat.rejectStatus);
router.get('/bctIds',authenticateUser , ceat.getBCTid);
router.get('/getSubmissionByIntervalCeat/:user_id/:interval' ,authenticateUser , ceat.getUserSubmissionsCeat);
router.get('/getSubmissionByIntervalCeatCount/:user_id/:interval',authenticateUser , ceat.getUserSubmissionStatusCeatCounts);
router.post('/approveSubmissionCeat',authenticateUser , ceat.approveSubmissionCeat);

// Authentication
router.post('/forgot', auth.forgotPassword);
router.get('/profilePicture/:user_id', auth.getProfilePicture);
router.get('/user', auth.getUserDetails);
router.post('/login', auth.login);
router.post('/register', auth.register);
router.post('/reset-password', auth.resetPassword);
router.post('/resend-forgot', auth.resendResetToken);
router.post('/tokens', auth.getAllTokens);
router.put('/updateEmail/:user_id', auth.updateEmail);
router.put('/updatePassword/:user_id', auth.updatePassword);
router.put('/updateProfile', auth.insertOrUpdateUserProfilePhoto);
router.put('/updateUser/:user_id', auth.updateUser);
router.put('/users/:User_id/block', auth.block);

// Dashboard
router.post('/answer/:user_id',authenticateUser, dashboard.postAns);

// Standard
router.get('/getCategories/:department_id/:form_type',authenticateUser ,standard.getCategories);
router.get('/getDepartments/:department_id',authenticateUser , standard.getDepartments);
router.get('/getForms/:category_id',authenticateUser , standard.getForms);
router.get('/getOrganizations/:organization_id',authenticateUser , standard.getOrganizations);
router.get('/getPlants/:plant_id',authenticateUser , standard.getPlants);
router.get('/getQuestions/:form_id',authenticateUser , standard.getQuestions);
router.get('/getSubmissionByInterval/:user_id/:interval',authenticateUser , standard.getUserSubmissions);
router.get('/getSubmissionByIntervalCount/:user_id/:interval',authenticateUser , standard.getUserSubmissionStatusCounts);
router.get('/getSubmissionCount/:form_type/:user_id',authenticateUser , standard.getSubmissionCount);
router.get('/getSubmissionDetails/:submission_id' ,authenticateUser , standard.getSubmissionDetails);
router.get('/getAuthorizers/:department_id',authenticateUser , standard.getAuthorizersByDepartment);
router.post('/createForms',authenticateUser , standard.createForms);
router.post('/createQuestions',authenticateUser , standard.createQuestions);
router.post('/insertCategories',authenticateUser , standard.insertCategories);
router.post('/insertDetails',authenticateUser , standard.insertSubmissionDetails);

// Authorizer
router.get('/getApprovedCounts/:user_id/:interval',authenticateUser , authorizer.getApprovedCounts);
router.get('/getFormTypeBar/:user_id/:interval',authenticateUser , authorizer.getFormTypeBar);
router.get('/getFormTypePercentages/:user_id/:interval',authenticateUser , authorizer.getFormTypePercentages);
router.get('/getStatusCounts/:user_id/:interval',authenticateUser , authorizer.getStatusCounts);
router.get('/getSubmissionByIntervalAuthorizer/:category_id/:user_id/:interval',authenticateUser , authorizer.getUserSubmissions);
router.get('/getSubmissionCountAuth/:form_type/:user_id',authenticateUser , authorizer.getSubmissionCount);
router.get('/profileDetails/:user_id',authenticateUser , authorizer.getUserDetails);
router.post('/signature',authenticateUser , authorizer.insertOrUpdateSignature);
router.put('/approveSubmission' ,authenticateUser , authorizer.approveSubmission);
router.put('/rejectSubmission' ,authenticateUser , authorizer.rejectSubmission);

// Organization Admin - Categories
router.delete('/deleteCategory/:category_id' ,authenticateUser , organizationAdmin.deleteCategory);
router.get('/getAllCategory',authenticateUser , organizationAdmin.getAllCategories);
router.get('/getCategory/:category_id',authenticateUser , organizationAdmin.getCategoryById);
router.post('/createCategory/:department_id',authenticateUser , organizationAdmin.createCategory);
router.put('/updateCategory/:category_id' ,authenticateUser , organizationAdmin.updateCategory);

// Organization Admin - Forms
router.delete('/deleteForms/:form_id',authenticateUser , organizationAdmin.deleteForm);
router.get('/FormById/:form_id',authenticateUser , organizationAdmin.getFormById);
router.get('/getAllForms',authenticateUser , organizationAdmin.getAllForms);
router.post('/createForms/:category_id',authenticateUser , organizationAdmin.createForm);

// Organization Admin - Questions
router.delete('/deletequestion/:question_id',authenticateUser , organizationAdmin.deleteQuestion);
router.get('/getquestionbyid/:form_id',authenticateUser , organizationAdmin.getQuestionByFormId);
router.post('/questionCreate/:form_id',authenticateUser , organizationAdmin.createQuestion);
router.put('/updatequestion/:question_id',authenticateUser , organizationAdmin.updateQuestion);

// Admin
router.delete('/deleteDepartment/:department_id',authenticateUser , admin.deleteDepartmentByDepartmentId);
router.delete('/deletePlant/:plant_id',authenticateUser , admin.deletePlantByPlantId);
router.get('/categoriesData/:department_id',authenticateUser , admin.CategoriesByDepartmentId);
router.get('/departmentsData/:plant_id',authenticateUser , admin.departmentsByPlantId);
router.get('/organizationData/:organization_id',authenticateUser , admin.organizationByOrganizationId);
router.get('/plantsData/:organization_id',authenticateUser , admin.plantsByOrganizationId);
router.get('/prevForms/:category_id',authenticateUser , admin.previousFormsByCategories);
router.get('/roles' ,authenticateUser , admin.userRoles);
router.get('/usersDataByDepartments/:department_id',authenticateUser , admin.userByDepartmentId);
router.get('/usersDataByOrganization/:organization_id',authenticateUser , admin.usersByOrganizationId);
router.post('/addDepartment/:plant_id',authenticateUser , admin.addDepartmentInPlants);
router.post('/addPlant/:organization_id',authenticateUser , admin.addPlantsInOrganization);
router.post('/addForm' ,authenticateUser , admin.addFormData);
router.put('/updateDepartment/:department_id',authenticateUser , admin.updateDepartmentByDepartmentId);
router.put('/updatePlant/:plant_id' ,authenticateUser , admin.updatePlantByPlantId);

router.delete('/deletePlant/:plant_id',authenticateUser , admin.deletePlantByPlantId);
router.delete('/deleteDepartment/:department_id',authenticateUser , admin.deleteDepartmentByDepartmentId);

//admin
router.get('/organizationData/:organization_id',authenticateUser ,admin.organizationByOrganizationId);
router.get('/plantsData/:organization_id',authenticateUser ,admin.plantsByOrganizationId);
router.get('/departmentsData/:plant_id',authenticateUser ,admin.departmentsByPlantId);
router.get('/usersDataByDepartments/:department_id',authenticateUser ,admin.userByDepartmentId);
router.get('/usersDataByOrganization/:organization_id',authenticateUser ,admin.usersByOrganizationId);
router.get('/categoriesData/:department_id',authenticateUser ,admin.CategoriesByDepartmentId);
router.get('/prevForms/:category_id',authenticateUser ,admin.previousFormsByCategories);
router.get('/formData/:form_id',authenticateUser ,admin.FormByFormId);
router.get('/roles',authenticateUser ,admin.userRoles);

router.post('/addPlant/:organization_id',authenticateUser ,admin.addPlantsInOrganization);
router.post('/addDepartment/:plant_id',authenticateUser ,admin.addDepartmentInPlants);
router.post('/addUser',authenticateUser ,admin.addUser);
router.post('/addCategory/:department_id',authenticateUser ,admin.addCategory);

router.put('/updatePlant/:plant_id',authenticateUser ,admin.updatePlantByPlantId);
router.put('/updateDepartment/:department_id',authenticateUser ,admin.updateDepartmentByDepartmentId);
router.put('/updateUser/:user_id',authenticateUser ,admin.updateUser);

router.delete('/deletePlant/:plant_id',authenticateUser ,admin.deletePlantByPlantId);
router.delete('/deleteForm/:form_id',authenticateUser ,admin.deleteFormByFormId);
router.delete('/deleteUser/:user_id',authenticateUser ,admin.deleteUser);
router.delete('/deleteDepartment/:department_id',authenticateUser ,admin.deleteDepartmentByDepartmentId);

router.post('/addForm',authenticateUser ,admin.addFormData);

module.exports=router;
