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

  
  //FORGOT PASSWORD
  function forgotPassword(req, res) {
    const { personalEmail } = req.body;
  
    const query = 'SELECT * FROM public.users WHERE "personal_email" = $1';
    db.query(query, [personalEmail], (fetchUserNameError, result) => {
      if (fetchUserNameError) {
        console.error(fetchUserNameError);
        return res.status(401).json({ message: 'error while fetching username'});
      }
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const resetToken = jwtUtils.generateToken({ personalEmail });
  
      const userId = result.rows[0].userid; 
      const insertQuery = 'INSERT INTO public.SWP_reset_tokens ("userId", token) VALUES ($1, $2)';
      db.query(insertQuery, [userId, resetToken], (insertError) => {
        if (insertError) {
          console.error(insertError);
          return res.status(401).json({ message: 'Error saving reset token' });
        }
        sendResetTokenEmail(personalEmail, resetToken);
        res.json({ message: 'Reset token sent to your email' });
      });
    });
  }
  
  //RESEND RESET TOKEN
  function resendResetToken(req, res) {
    const { personalEmail } = req.body;
  
    const checkUserQuery = 'SELECT * FROM public.users WHERE "personal_email" = $1';
    db.query(checkUserQuery, [personalEmail], (checkError, userResult) => {
      if (checkError) {
        console.log('Error checking user availability:', error);
        return res.status(401).json({ message: 'Error checking user availability' });
      }
  
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userId = userResult[0].UserId;
      const verificationToken = jwtUtils.generateToken({ personalEmail: personalEmail });
  
      const updateQuery = 'UPDATE public.swp_reset_tokens SET token = $1 WHERE "userId" = $2';
      db.query(updateQuery, [verificationToken, userId], (updateError, updateResult) => {
        if (updateError) {
          console.log('Error updating Resend link:', error);
          return res.status(401).json({ message: 'Error updating Resend link'});
        }
  
          sendResetTokenEmail(personalEmail, verificationToken);
          res.status(200).json({ message: 'Resend link resent. Check your email for the new token.' });
      });
    });
  }
  
  //RESET PASSWORD
  function resetPassword(req, res) {
    const { token, password } = req.body;
  
    const query = 'SELECT * FROM public.swp_reset_tokens WHERE token = $1';
    db.query(query, [token], (checkTokenError, result) => {
      if (checkTokenError) {
        console.log('Error during reset password query:', checkTokenError);
        return res.status(401).json({ message: 'Error during reset password query'});
      }
  
      if (result.rowCount === 0) {
        return res.status(402).json({ message: 'Invalid token' });
      }
      const tokenData = result.rows[0];
      const userId = tokenData.userid;
  
      bcrypt.hash(password, 10, (hashError, hashedPassword) => {
        if (hashError) {
          console.log('Error during password hashing:', hashError);
          return res.status(401).json({ message: 'Error during password hashing' });
        }
        
        const updateQuery = 'UPDATE public.users SET Password = $1 WHERE user_id = $2';
        db.query(updateQuery, [hashedPassword, userId], (updateError, updateResult) => {
          if (updateError) {
            console.log('Error updating password:', updateError);
            return res.status(401).json({ message: 'Error updating password' });
          }
  
          // Delete the reset token from the reset_tokens table
          const deleteQuery = 'DELETE FROM public.swp_reset_tokens WHERE token = $1';
          db.query(deleteQuery, [token], (deleteError, deleteResult) => {
            if (deleteError) {
              console.error('Error deleting reset token:', deleteError);
              res.status(401).json({message : 'Error deleting reset token'});
            }
            res.status(200).json({ message: 'Password reset successful'});
          });
        });
      });
    });
  }
  
 








function sendTokenEmail(personal_email, verificationToken) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'kpohekar19@gmail.com',
            pass: 'woptjevenzhqmrpp',
        },
        tls:{
          rejectUnauthorized:false
        }
    });

    const templatePath = path.join(__dirname, '../mail.body/email-template.ejs');
    fs.readFile(templatePath, 'utf8', (err, templateData) => {
        if (err) {
            console.error('Error reading email template:', err);
            return;
        }

        const compiledTemplate = ejs.compile(templateData);

        const html = compiledTemplate({ verificationToken }); // Pass verificationToken to the template

        const mailOptions = {
            from: 'kpohekar19@gmail.com',
            to: personal_email,
            subject: 'Verification Token', // Update subject if necessary
            html: html,
        };
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Error sending email:', err);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    });
}





// function register(req, res) {
//   const {
//       personal_email,
//       password_hash,
//       first_name,
//       role,
//       organization,
//       company_email,
//       last_name
//   } = req.body;

//   const user_id = uuidv4();
//   const username = `${first_name} ${last_name}`;

//   const emailCheckQuery = `SELECT * FROM public.users WHERE company_email = $1`;
//   db.query(emailCheckQuery, [company_email], (error, result) => {
//       if (error) {
//           console.error('Error during company email check:', error);
//           return res.status(500).json({ message: 'Internal server error' });
//       }
//       if (result.rows.length > 0) {
//           console.log('Company email already exists');
//           return res.status(400).json({ message: 'Company email already exists' });
//       }

//       const p_emailCheckQuery = `SELECT * FROM public.users WHERE personal_email = $1`;
//       db.query(p_emailCheckQuery, [personal_email], (error, result) => {
//           if (error) {
//               console.error('Error during personal email check:', error);
//               return res.status(500).json({ message: 'Internal server error' });
//           }
//           if (result.rows.length > 0) {
//               console.log('Personal email already exists');
//               return res.status(400).json({ message: 'User personal email already exists' });
//           }

//           bcrypt.hash(password_hash, 10, (error, hashedPassword) => {
//               if (error) {
//                   console.error('Error during password hashing:', error);
//                   return res.status(500).json({ message: 'Internal server error' });
//               }

//               const verificationToken = jwtUtils.generateToken({ personal_email });
//               const insertQuery = `INSERT INTO public.users (username, personal_email, password_hash, first_name, role, organization, created_at, company_email, last_name, user_id) 
//                                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)`;

//               db.query(insertQuery, [username, personal_email, hashedPassword, first_name, role, organization, company_email, last_name, user_id], (error, insertResult) => {
//                   if (error) {
//                       console.error('Error during user insertion:', error);
//                       return res.status(500).json({ message: 'Internal server error' });
//                   }

//                   console.log('User registered successfully');
//                   sendTokenEmail(personal_email, verificationToken);
//                   res.status(200).json({ message: 'Registration successful. Check your email for the verification token'});
//               });
//           });
//       });
//   });
// }

// function register(req, res) {
//   const {
//       FirstName: first_name,
//       LastName: last_name,
//       CompanyName: organization,
//       PersonalEmail: personal_email,
//       CompanyEmail: company_email,
//       password: password_hash
//   } = req.body;

//   const role = 'Admin'; // Default role is set to Admin
//   const user_id = uuidv4();
//   const username = `${first_name} ${last_name}`;

//   const emailCheckQuery = `SELECT * FROM public.users WHERE company_email = $1`;
//   db.query(emailCheckQuery, [company_email], (error, result) => {
//       if (error) {
//           console.error('Error during company email check:', error);
//           return res.status(500).json({ message: 'Internal server error' });
//       }
//       if (result.rows.length > 0) {
//           console.log('Company email already exists');
//           return res.status(400).json({ message: 'Company email already exists' });
//       }

//       const p_emailCheckQuery = `SELECT * FROM public.users WHERE personal_email = $1`;
//       db.query(p_emailCheckQuery, [personal_email], (error, result) => {
//           if (error) {
//               console.error('Error during personal email check:', error);
//               return res.status(500).json({ message: 'Internal server error' });
//           }
//           if (result.rows.length > 0) {
//               console.log('Personal email already exists');
//               return res.status(400).json({ message: 'Personal email already exists' });
//           }

//           bcrypt.hash(password_hash, 10, (error, hashedPassword) => {
//               if (error) {
//                   console.error('Error during password hashing:', error);
//                   return res.status(500).json({ message: 'Internal server error' });
//               }

//               const verificationToken = jwtUtils.generateToken({ personal_email });
//               const insertQuery = `INSERT INTO public.users (username, personal_email, password_hash, first_name, role, organization, created_at, company_email, last_name, user_id) 
//                                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)`;

//               db.query(insertQuery, [username, personal_email, hashedPassword, first_name, role, organization, company_email, last_name, user_id], (error, insertResult) => {
//                   if (error) {
//                       console.error('Error during user insertion:', error);
//                       return res.status(500).json({ message: 'Internal server error' });
//                   }

//                   console.log('User registered successfully');
//                   sendTokenEmail(personal_email, verificationToken);
//                   res.status(200).json({ message: 'Registration successful. Check your email for the verification token' });
//               });
//           });
//       });
//   });
// }




function register(req, res) {
  const {
      FirstName: first_name,
      LastName: last_name,
      CompanyName: organization,
      PersonalEmail: personal_email,
      CompanyEmail: company_email,
      password: password_hash
  } = req.body;

  const role = 'Admin'; // Default role is set to Admin
  const user_id = uuidv4();
  const username = `${first_name} ${last_name}`;

  // Check if the organization already exists
  const organizationCheckQuery = `SELECT organization_id FROM public.users WHERE organization = $1`;
  db.query(organizationCheckQuery, [organization], (error, orgResult) => {
      if (error) {
          console.error('Error during organization check:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      let organization_id;
      if (orgResult.rows.length > 0) {
          // Organization already exists, retrieve its organization_id
          organization_id = orgResult.rows[0].organization_id;
      } else {
          // Organization does not exist, generate a new organization_id
          organization_id = uuidv4();
      }

      // Insert the new user with the organization_id
      bcrypt.hash(password_hash, 10, (error, hashedPassword) => {
          if (error) {
              console.error('Error during password hashing:', error);
              return res.status(500).json({ message: 'Internal server error' });
          }

          const verificationToken = jwtUtils.generateToken({ personal_email });
          const insertUserQuery = `INSERT INTO public.users (username, personal_email, password_hash, first_name, role, organization_id, organization, created_at, company_email, last_name, user_id) 
                                  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)`;

          db.query(insertUserQuery, [username, personal_email, hashedPassword, first_name, role, organization_id, organization, company_email, last_name, user_id], (error, insertUserResult) => {
              if (error) {
                  console.error('Error during user insertion:', error);
                  return res.status(500).json({ message: 'Internal server error' });
              }

              console.log('User registered successfully');
              sendTokenEmail(personal_email, verificationToken);
              res.status(200).json({ message: 'Registration successful. Check your email for the verification token' });
          });
      });
  });
}



// function login(req, res) {
//   const { username, password_hash } = req.body;
//   const query = `SELECT * FROM public.users WHERE username = $1`;
  
//   db.query(query, [username], (error, result) => {
//     try {
//       if (error) {
//         console.error('Error during login:', error);
//         throw new Error('Error during login');
//       }
      
//       const rows = result.rows;
      
//       if (rows.length === 0) {
//         return res.status(404).json({ message: 'User does not exist!' });
//       }
      
//       const user = rows[0];
      
//       if (user.verified === '0') {
//         return res.status(401).json({ message: 'User is not verified. Please verify your account.' });
//       }
      
//       if (user.blocked === '1') {
//         return res.status(401).json({ message: 'User is blocked. Please contact support.' });
//       }
      
//       bcrypt.compare(password_hash, user.password_hash, (error, isPasswordValid) => {
//         try {
//           if (error) {
//             console.error('Error during password comparison', error);
//             throw new Error('Error during password comparison');
//           }
          
//           if (!isPasswordValid) {
//             return res.status(401).json({ message: 'Invalid credentials' });
//           }
          
//           const token = jwtUtils.generateToken({ Username: user.username });
//           res.json({ token });
//         } catch (error) {
//           console.error(error);
//           res.status(500).json({ message: 'Internal server error' });
//         }
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Internal server error' });
//     }
//   });
// }

// function resetToken(req,res){
//   const {personal_email}=req.body;

//   const checkUserquery=`SELECT * FROM public.users WHERE personal_email=$1`;
//   db.query(checkUserquery,[personal_email],(error,userResult)=>{
//     if(error){
//       console.error('Error checking user availbility:',error);
//       return res.status(500).json({message:'Internal server error'});
//     }
//     if(userResult.rows.length === 0){
//       return res.status(500).json({message:'User not found'});
//     }
//     if(userResult.rows[0].verified === true){
//       return res.status(400).json({message:'User already verified'});
//     } else {
//       const verificationToken = jwtUtils.generateToken({personal_email:personal_email});

//       const updateQuery = `UPDATE public.users SET verificationToken =$1 WHERE personal_email = $2`;
//       db.query(updateQuery,[verificationToken,personal_email],(error,updatedResult)=>{
//         if(error){
//           console.error('Error updating verfication token:',error);
//           return res.status(500).json({message:'Internal server error'});
//         }
//         try{
//           sendTokenEmail(personal_email,verificationToken);
//           console.log('Verification token resent');
//           res.josn({message:'Verification token resent. Check your email for new token.'});
//         }catch(error){
//           console.error('Error sending verfication token:',error);
//           res.status(500).json({message:'Internal server error'});
//         }
//       });
//     }
//   });
// }


// function login(req, res) {
//   const { usernameOrEmail, password } = req.body;
//   const query = `SELECT * FROM public.users WHERE username = $1 OR personal_email = $2`;

//   db.query(query, [usernameOrEmail, usernameOrEmail], (error, result) => {
//       try {
//           if (error) {
//               console.error('Error during login:', error);
//               throw new Error('Error during login');
//           }

//           const rows = result.rows;

//           if (rows.length === 0) {
//               return res.status(404).json({ message: 'User does not exist!' });
//           }

//           const user = rows[0];

//           // if (user.verified === '0') {
//           //     return res.status(401).json({ message: 'User is not verified. Please verify your account.' });
//           // }

//           if (user.blocked === '1') {
//               return res.status(401).json({ message: 'User is blocked. Please contact support.' });
//           }

//           bcrypt.compare(password, user.password_hash, (error, isPasswordValid) => {
//               try {
//                   if (error) {
//                       console.error('Error during password comparison', error);
//                       throw new Error('Error during password comparison');
//                   }

//                   if (!isPasswordValid) {
//                       return res.status(401).json({ message: 'Invalid credentials' });
//                   }

//                   const token = jwtUtils.generateToken({ Username: user.username });
//                   res.json({ token });
//               } catch (error) {
//                   console.error(error);
//                   res.status(500).json({ message: 'Internal server error' });
//               }
//           });
//       } catch (error) {
//           console.error(error);
//           res.status(500).json({ message: 'Internal server error' });
//       }
//   });
// }

function login(req, res) {
  const { usernameOrEmail, password } = req.body;
  const query = `SELECT * FROM public.users WHERE username = $1 OR personal_email = $2`;

  db.query(query, [usernameOrEmail, usernameOrEmail], (error, result) => {
      try {
          if (error) {
              console.error('Error during login:', error);
              throw new Error('Error during login');
          }

          const rows = result.rows;

          if (rows.length === 0) {
              return res.status(404).json({ message: 'User does not exist!' });
          }

          const user = rows[0];

          // if (user.verified === '0') {
          //     return res.status(401).json({ message: 'User is not verified. Please verify your account.' });
          // }

          if (user.blocked === '1') {
              return res.status(401).json({ message: 'User is blocked. Please contact support.' });
          }

          bcrypt.compare(password, user.password_hash, (error, isPasswordValid) => {
              try {
                  if (error) {
                      console.error('Error during password comparison', error);
                      throw new Error('Error during password comparison');
                  }

                  if (!isPasswordValid) {
                      return res.status(401).json({ message: 'Invalid credentials' });
                  }

                  const token = jwtUtils.generateToken({ Username: user.username });
                  res.json({ token });
              } catch (error) {
                  console.error(error);
                  res.status(500).json({ message: 'Internal server error' });
              }
          });
      } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Internal server error' });
      }
  });
}



function getUserDetails(req, res) {
  const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwtUtils.verifyToken(token);
    if (!decodedToken) {
      console.log('Invalid Token');
      return res.status(401).json({ message: 'Invalid token' });
    }
    const fetchUserQuery = 'SELECT * public.users WHERE "username" = $1';
    const fetchCompanyQuery = `SELECT * FROM public.users WHERE "companyid"= $1`;
    db.query(fetchUserQuery, [decodedToken.userName], (checkUserError, result) => {
      if (checkUserError) {
        console.log('Error executing query:', error);
        return res.status(401).json({ message: 'Error executing user name query'});
      }
      if (result.rowCount === 0) {
        // Log the error and response
        return res.status(404).json({ message: 'User not found' });
      }
      const userDetail = result.rows[0];
      db.query(fetchCompanyQuery, [userDetail.companyId], (fetchCompanyError, fetchCompanyResult) => {
        if(fetchCompanyError){
          console.log(fetchCompanyError);
          return res.status(401).json({message : 'error fetching company details'});
        }
        companyDetails = fetchCompanyResult.rows[0];
        res.status(200).json({getUserDetails : userDetail, companyDetails : companyDetails});
      })
    });
}


function block(req, res) {
  const { user_id } = req.params; // Ensure user_id is correctly extracted as a string
  const { action } = req.body;

  if (action !== 'block' && action !== 'unblock') {
    return res.status(400).json({ message: 'Invalid action. Use "block" or "unblock".' });
  }

  const blockValue = action === 'block' ? 1 : 0;

  const checkQuery = 'SELECT block FROM public.users WHERE user_id = $1';

  db.query(checkQuery, [user_id], (checkError, checkResult) => {
    if (checkError) {
      console.error('Error checking user block status:', checkError);
      return res.status(500).json({ message: 'Error checking user block status' });
    }

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentBlockStatus = checkResult.rows[0].block;

    if (currentBlockStatus === blockValue) {
      const statusMessage = blockValue === 1 ? 'already blocked' : 'already unblocked';
      return res.status(200).json({ message: `User is ${statusMessage}` });
    }

    const updateQuery = 'UPDATE public.users SET block = $1 WHERE user_id = $2';

    db.query(updateQuery, [blockValue, user_id], (updateError, updateResult) => {
      if (updateError) {
        console.error(`Error during user ${action}ing:`, updateError);
        return res.status(500).json({ message: `Error ${action}ing user` });
      }

      if (updateResult.rowCount === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const successMessage = `User ${action}ed successfully`;
      res.status(200).json({ message: successMessage });
    });
  });
}



module.exports={

forgotPassword,
resendResetToken,
resetPassword,
register,
login,
getUserDetails,
block,

};