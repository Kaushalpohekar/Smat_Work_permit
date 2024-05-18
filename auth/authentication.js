const db = require('../db');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Schema = require('../schema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { reset } = require('nodemon');
const nodemailer =require('nodemailer');
const { fstat } = require('fs');
app.use(bodyParser.json());
const jwtUtils = require('jwt-utils'); 
const path = require('path');
const fs =require('fs');


function sendTokenEmail(PersonalEmail,VerificationToken,FirstName,LastName){

    const emailId=uuidv4();
    
    const transporter=nodemailer.createTransport({
        host:'smtp.gmail.com',
        port: 465,
        auth:{
            user:'kpohekar19@gmai.com',
            pass:'woptjevenzhqmrpp',
        },

    });
    const templatePath =path.join(__dirname,'');
    fs.readFile(templatePath,'utf8',async(err,templateData)=>{
        if(err){
            console.error('Error reading email template:',err);
            return;
        }
        const compiledTemplate = ejs.compile(templateData);

        const html=compiledTemplate({VerificationToken,FirstName,LastName});

        const mailOptions={
            from:'email@gmail.com',
            to:PersonalEmail,
            sunject:'Registration Token',
            html:html,
        };

        try{
            const info =await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
        }catch(error){
            console.error('Error sending email:',error);
        }
    });
}




async function register(req, res) {
    try {
        const { FirstName, LastName, PersonalEmail, UserPassword, CompanyEmail, ContactNumber, CompanyName } = req.body;
        const user=await Schema.findOne({PersonalEmail});
        if(user){
            return res.status(404).json({message:"User already exists."});
        }

        const hashedPassword = await bcrypt.hash(UserPassword, 10);

        const verificationToken = jwt.sign({PersonalEmail:PersonalEmail},'JWT_TOKEN');

        const data = await Schema.create({ FirstName, LastName, PersonalEmail, UserPassword: hashedPassword, CompanyEmail, ContactNumber, CompanyName });

        const newData = await data.save();


        res.status(201).json({ message: "User registered successfully", newData });

        sendTokenEmail(PersonalEmail,verificationToken,FirstName,LastName);

    } catch (error) {
        console.error('Error registering new User : ', error);
        res.status(500).json({ message: 'Error creating New User', error });
    }
}


async function login(req,res){

    const {PersonalEmail,UserPassword}=req.body;
    try{
        const user=await Schema.findOne({PersonalEmail});
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        const passwordMatch = await bcrypt.compare(UserPassword,user.UserPassword);
        if(!passwordMatch){
            return res.status(401).json({message:"Invalid credintails"});
        }

        const token=jwt.sign({PersonalEmail:user.PersonalEmail},'JWT_TOKEN');
        res.status(200).json({message:'Login successfully',token});

    }catch(error){
        console.error('error while logging in:',error);
        res.status(500).json({message:"error while logging in",error});

    }
}

async function getUserDetails(req,res){
    try {
        const {PersonalEmail} = req.body;
        const user = await Schema.findOne({ PersonalEmail});
        if(!user){
            return res.status(404).json({message:'User not found'});
        }

        res.status(200).json({message:"User details",user});

    }catch (error){
        console.error('Error fetching user details: ',error);
        res.status(500).json({message:'Error fetching data'});

    }
}


// async function setUserOnline(req,res){
//     const PersonalEmail=req.params.PersonalEmail;
//     try{
//         const user =await Schema.findOne({PersonalEmail:PersonalEmail});
//         if (!user){
//             return res.status(404).json({message:'User not found!'});
//         }
//         const updateResult=await Schema.updateOne(
//             {PersonalEmail:PersonalEmail},
//             {$set:{is_Online:true}}
//         );
//         if(updateResult.modifiedCount!==1){
//             return res.status(404).json({message:'Error updateing user'});
//         }
//         res.status(200).json({message:'Status Updated Successfully'});

//     }catch(error){
//         console.error('error occured',error);
//         res.status(500).json({message:'Error occured'});

//     }
// }


async function setUserOnline(req, res) {
    const { PersonalEmail } = req.body; // Ensure the request is sending the PersonalEmail in the body
    
    try {
      const user = await Schema.findOne({ PersonalEmail });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }
      
      const updateResult = await Schema.updateOne(
        { PersonalEmail },
        { $set: { is_Online: 1 } }
      );
      
      if (updateResult.modifiedCount !== 1) {
        return res.status(400).json({ message: 'Error updating user' }); // Simple error message
      }
      
      res.status(200).json({ message: 'Status Updated Successfully' });
    } catch (error) {
      console.error('Error occurred:', error);
      res.status(500).json({ message: 'Internal Server Error' }); // More specific error message
    }
  }
  
  



//FORGOT PASSWORD
  async function forgotPassword(req, res) {
    const { personalEmail } = req.body;
  
    try {
      // Find the user by their personalEmail
      const user = await Schema.findOne({ personalEmail });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Generate a reset token
      const resetToken = jwt.sign({ personalEmail }, 'JWT_TOKEN', { expiresIn: '1h' }); 
      // Store the reset token in the database
      const resetTokenEntry = new resetToken({
        userId: user._id,
        token: resetToken
      });
  
      await resetTokenEntry.save();
  
      // Send the reset token via email
      sendTokenEmail(personalEmail, resetToken);
  
      res.json({ message: 'Reset token sent to your email' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  

module.exports = {
    register,
    login,
    getUserDetails,
    setUserOnline,
    forgotPassword,

};
