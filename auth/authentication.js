const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
// const CircularJSON = require('circular-json');
// const secure = require('../token/secure');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
// const { logExecution } = require('../superadmin/SA');
const { v4: uuidv4 } = require('uuid');
const { error } = require('console');




encryptKey = "SenseLive-Smart-Work-Permit";


function sendTokenEmail(personal_email,verificationToken,first_name,last_name){
    const transporter =nodemailer.createTransport({
        host:'smtp.gmail.com',
        port:465,
        secure:true,
        auth:{
            user:'kpohekar19@gmail.com',
            pass:'woptjevenzhqmrpp',
        },
    });

    const templatePath =path.join(__dirname,);
    fs.readFile(templatePath,'utf8',(err,templateData)=>{
        if(err){
            console.error('Error reading email template:',err);
            return;
        }

        const compiledTemplate=ejs.compile(templateData);

        const html = compiledTemplate({resetToken});

        const mailOptions={
            from:'kpohekar19@gmail.com',
            to:personal_email,
            subject:'Reset Password Link',
            html:html,
        };
        transporter.sendMail(mailOptions,(err,info)=>{
            if(err){
                console.error('Error sending email:',err);
            }else{
                console.log('Email sent:',info.response);
            }
        });
    });

}



function register(req,res){
    const {
        personal_email,
        password_hash,
        first_name,
        role,
        organization,
        company_email,
        last_name
    }=req.body;

    const user_id=uuidv4();

    const username = `${first_name} ${last_name}`;
    const emailCheckQuery = `SELECT * FROM users WHERE comapany_email=$1`;
    db.query(emailCheckQuery,[company_email],(error,Result)=>{
        if(error){
            console.error('Error during email check:',error);
            return res.status(500).json({message:'Internal server error'});
        }
        if(Result.rows.length > 0){
            console.log('Company email already exist');
            return res.status(500).json({message:'company email already exists'});
        }

        const p_emailCheckQuery=`SELECT * FROM users WHERE personal_email=$1`;

        db.query(p_emailCheckQuery,[personal_email],(error,result)=>{
            if (error){
                console.error('Error during personal email check:',error);
                return res.status(500).json({message:'Internal server error'});
            }
            if(result.rows.length > 0){
                console.log('Personal email already exists');
                return res.status(400).json({message:'User personal email already exists'});
            }

            bcrypt.hash(password_hash,10,(error,hashedPassword)=>{
                if(error){
                    console.error('Error during password hashing:',error);
                    return res.status(500).jaon({message:'Internal server error'});
                }
                const verificationToken=jwtUtils.generateToken({personal_email});

                const insertQuery=`INSERT INTO users (username,personal_email,password_hash,first_name,role,organization,created_at,company_email,last_name,user_id) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9)`;
                db.query(insertQuery,[username,personal_email,password_hash,first_name,role,organization,created_at,company_email,last_name,user_id],
                    (error,insertResult)=>{
                        if(error){
                            console.error('Error during user insertion:',error);
                            return res.status(500).json({message:'Internal server error'});
                        }

                        console.log('User registered successfully');
                        sendTokenEmail(personal_email,verificationToken,first_name,last_name);
                        res.json({message:'Registration successfuul. Check your email for the verfication token'});
                    }
                )
            })
        })
    })
}

module.exports={
register,

};