const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
// const CircularJSON = require('circular-json');
// const secure = require('../token/secure');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
//const { logExecution } = require('../superadmin/SA');
const { v4: uuidv4 } = require('uuid');
const { error } = require('console');




encryptKey = "SenseLive-Smart-Work-Permit";

  


//forms
// function formscreate(req,res){
//     const { form_name,organization,created_by,category,form_type}=req.body;
//     const form_id=uuidv4();
//     const created_at= new Date();
//     const formcreate=`INSERT INTO public.forms(form_id,form_name,organization,created_at,created_by,category,form_type) VALUES($1,$2,$3,$4,$5,$6,$7)`;

//     db.query(formcreate,[form_id,form_name,organization,created_at,created_by,category,form_type],(error,result)=>{
//         if(error){
//             console.error('Error creating form:',error);
//         return res.status(500).json({message:'Internal server error'});
//             }
//             res.status(201).json({message:'Form created successfully',form_id});
//     });
// }

// function formread(req,res){
//     const selectQuery=`SELECT * FROM forms`;

//     db.query(selectQuery,(error,result)=>{
//     if(error){
//         console.error('Error fetching forms:',error);
//         return res.status(500).json({message:'Internal server error'});

//     }
//     res.stautus(200).json(result.rows);
// });
// }

// function getformsById(req,res){
//     const {form_id}=req.params;
//     const selectQuery=`SELECT * FROM forms WHERE form_id=$1`;
//     db.query(selectQuery,[form_id],(error,result)=>{
//         if(error){
//             console/error('Error fetching form:',error);
//             return res.status(500).json({message:'Internal server error'});
//         }
//         if(result.rows.length ===0){
//             return res.status(404).json({message:'Form not found'});
//         }
//         res.status(200).json(result.rows[0]);
//     });
// }

// function updateForm(req,res){
//     const {form_id}=req.params;
//     const { form_name,organization,created_by,category,form_type}=req.body;

//     const updateQuery=`UPDATE form SET form_name = $1, organization = $2, created_by = $3, category = $4, form_type = $5
//     WHERE form_id = $6`;
//     db.query(updateForm,[form_name, organization, created_by, category, form_type, form_id],(error,result)=>{
//         if(error){
//             console.error('Error updating form:',error);
//             return res.status(500).json({message:'Internal server error'});
//         }
//         if(result.rowsCount === 0){
//             return res.status(404).json({message:'Form not found'});
//         }
//         res.status(200).json({message:'Form updated sucessfully'})

//     });
// }

// function deleteForm(req, res) {
//     const { form_id } = req.params;
  
//     const deleteQuery = 'DELETE FROM form WHERE form_id = $1';
  
//     db.query(deleteQuery, [form_id], (error, result) => {
//       if (error) {
//         console.error('Error deleting form:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//       }
  
//       if (result.rowCount === 0) {
//         return res.status(404).json({ message: 'Form not found' });
//       }
  
//       res.status(200).json({ message: 'Form deleted successfully' });
//     });
//   }
  

// module.exports={
// //forms
// formscreate,
// formread,
// getformsById,
// updateForm,
// deleteForm,





// }