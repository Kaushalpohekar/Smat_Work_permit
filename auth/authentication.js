const db = require('../db');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Schema = require('../schema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4:uuid} =require('uuid');
const { reset } = require('nodemon');
const nodemailer =require('nodemailer');
const { fstat } = require('fs');
app.use(bodyParser.json());


function sendTokenEmail(email,token,FirstName,LastName){
    const transporter=nodemailer.createTransport({
        host:'smtp.gmail.com',
        port: 465,
        auth:{
            user:'kpohekar19@gmai.com',
            pass:'woptjevenzhqmrpp',
        },

    });
    const emailId=uuidv4();

    const templatePath =path.join(__dirname,'');
    fs.readFile(templatePath,'utf8',async(err,templateData)=>{
        if(err){
            console.error('Error reading email template:',err);
            return;
        }
        const compiledTemplate = ejs.compile(templateData);

        const html=compiledTemplate({token,FirstName,LastName});

        const mailOptions={
            from:'email@gmail.com',
            to:email,
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

        const hashedPassword = await bcrypt.hash(UserPassword, 10);

        const data = await Schema.create({ FirstName, LastName, PersonalEmail, UserPassword: hashedPassword, CompanyEmail, ContactNumber, CompanyName });

        const newData = await data.save();


        res.status(201).json({ message: "data inserted successfully", newData });
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






module.exports = {
    register,
    login,
    


};
