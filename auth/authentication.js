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



encryptKey = "SenseLive-Smart-Work-Permit";

  
  //FORGOT PASSWORD
  function forgotPassword(req, res) {
    const { personalEmail } = req.body;
  
    const query = 'SELECT * FROM SWP.users WHERE "personal_email" = $1';
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
      const insertQuery = 'INSERT INTO SWP.SWP_reset_tokens ("userId", token) VALUES ($1, $2)';
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
  
    const checkUserQuery = 'SELECT * FROM SWP.users WHERE "personal_email" = $1';
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
  
      const updateQuery = 'UPDATE SWP.swp_reset_tokens SET token = $1 WHERE "userId" = $2';
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
  
    const query = 'SELECT * FROM SWP.swp_reset_tokens WHERE token = $1';
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
        
        const updateQuery = 'UPDATE SWP.users SET Password = $1 WHERE user_id = $2';
        db.query(updateQuery, [hashedPassword, userId], (updateError, updateResult) => {
          if (updateError) {
            console.log('Error updating password:', updateError);
            return res.status(401).json({ message: 'Error updating password' });
          }
  
          // Delete the reset token from the reset_tokens table
          const deleteQuery = 'DELETE FROM SWP.swp_reset_tokens WHERE token = $1';
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
  
  module.exports = {
    forgotPassword,
    resendResetToken,
    resetPassword,
    
   
  }



