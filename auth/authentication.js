const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');
const { error } = require('console');
const mime = require('mime-types');




encryptKey = "SenseLive-Smart-Work-Permit";

async function login(req, res) {
    const { usernameOrEmail, password } = req.body;
    const query = `SELECT * FROM public.users WHERE username = $1 OR personal_email = $2`;

    try {
        const result = await db.query(query, [usernameOrEmail, usernameOrEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User does not exist!' });
        }

        const user = result.rows[0];

        if (user.blocked) {
            return res.status(401).json({ message: 'User is blocked. Please contact support.' });
        }

        if (!user.verified) {
            return res.status(401).json({ message: 'User is not Verified. Please contact support.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwtUtils.generateToken({ user_id: user.user_id });
        res.status(200).json({ token });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function register(req, res) {
    const {
        FirstName,
        LastName,
        CompanyName,
        PersonalEmail,
        CompanyEmail,
        password,
        CompanyAddress,
        ContactNO
    } = req.body;

    const role = 'Admin';
    const user_id = uuidv4();
    const username = `${PersonalEmail}`;
    const organization_id = uuidv4();
    const plant_id = uuidv4();
    const department_id = uuidv4();
    const department_name = 'Management';
    const password_hash = await bcrypt.hash(password, 10);

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const AddOrganizationQuery = `INSERT INTO public.organizations (organization_id, "name", address, created_at) VALUES($1, $2, $3, CURRENT_TIMESTAMP);`;
        await client.query(AddOrganizationQuery, [organization_id, CompanyName, CompanyAddress]);

        const AddPlantQuery = `INSERT INTO public.plants (plant_id, organization_id, "name", "location", created_at) VALUES($1, $2, $3, $4, CURRENT_TIMESTAMP);`;
        await client.query(AddPlantQuery, [plant_id, organization_id, CompanyName, CompanyAddress]);

        const AddDepartmentQuery = `INSERT INTO public.departments (department_id, plant_id, "name", created_at) VALUES($1, $2, $3, CURRENT_TIMESTAMP);`;
        await client.query(AddDepartmentQuery, [department_id, plant_id, department_name]);

        const AdminUUIDQuery = `SELECT role_id FROM public.roles WHERE name = $1;`;
        const roleResult = await client.query(AdminUUIDQuery, [role]);

        if (roleResult.rows.length === 0) {
            throw new Error('Role not found');
        }

        const role_id = roleResult.rows[0].role_id;

        const CheckUserExistQuery = `SELECT * FROM users WHERE personal_email = $1 OR company_email = $2;`;
        const userResult = await client.query(CheckUserExistQuery, [PersonalEmail, CompanyEmail]);

        if (userResult.rows.length > 0) {
            res.status(409).json({ message: 'User Already Exists!' });
            await client.query('ROLLBACK');
            return;
        }

        const InsertUserQuery = `INSERT INTO public.users (user_id, username, personal_email, password_hash, first_name, last_name, role_id, organization_id, department_id, created_at, company_email, verified, block, contact_no) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, false, false, $11);`;
        await client.query(InsertUserQuery, [user_id, username, PersonalEmail, password_hash, FirstName, LastName, role_id, organization_id, department_id, CompanyEmail, ContactNO]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}
  //FORGOT PASSWORD
async function forgotPassword(req, res) {
    const { usernameOrEmail } = req.body;

    try {
        const query = 'SELECT * FROM public.users WHERE personal_email = $1';
        const result = await db.query(query, [usernameOrEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = jwtUtils.generateToken({ usernameOrEmail });
        const userId = result.rows[0].user_id; 

        const insertQuery = 'INSERT INTO public.reset_tokens (user_id, token) VALUES ($1, $2)';
        await db.query(insertQuery, [userId, resetToken]);

        //await sendResetTokenEmail(usernameOrEmail, resetToken);

        res.status(200).json({ message: 'Reset token sent to your email' });
        console.log('http://localhost:4200/l/reset?token=',resetToken);
    } catch (error) {
        console.error('Error during password reset process:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
  
  //RESEND RESET TOKEN
async function resendResetToken(req, res) {
    const { personalEmail } = req.body;

    try {
        const checkUserQuery = 'SELECT * FROM public.users WHERE personal_email = $1';
        const userResult = await db.query(checkUserQuery, [personalEmail]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = userResult.rows[0].user_id;
        const verificationToken = jwtUtils.generateToken({ personalEmail });

        const updateQuery = 'UPDATE public.swp_reset_tokens SET token = $1 WHERE user_id = $2';
        await db.query(updateQuery, [verificationToken, userId]);

        await sendResetTokenEmail(personalEmail, verificationToken);

        res.status(200).json({ message: 'Resend link resent. Check your email for the new token.' });
    } catch (error) {
        console.error('Error during resend reset token process:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
  
  //RESET PASSWORD
async function resetPassword(req, res) {
    const { token, password } = req.body;

    try {
        const query = 'SELECT * FROM public.reset_tokens WHERE token = $1';
        const result = await db.query(query, [token]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Invalid token' });
        }

        const tokenData = result.rows[0];
        const userId = tokenData.user_id;

        const hashedPassword = await bcrypt.hash(password, 10);

        const updateQuery = 'UPDATE public.users SET password = $1 WHERE user_id = $2';
        await db.query(updateQuery, [hashedPassword, userId]);

        const deleteQuery = 'DELETE FROM public.swp_reset_tokens WHERE token = $1';
        await db.query(deleteQuery, [token]);

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error during password reset process:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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

async function getUserDetails(req, res) {
    const token = req.headers.authorization.split(' ')[1];

    try {
        const decodedToken = jwtUtils.verifyToken(token);
        console.log(decodedToken);
        if (!decodedToken) {
            console.log('Invalid Token');
            return res.status(401).json({ message: 'Invalid token' });
        }

        const fetchUserQuery = 'SELECT * FROM public.users WHERE user_id = $1';
        const userResult = await db.query(fetchUserQuery, [decodedToken.user_id]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userDetail = userResult.rows[0];
        const fetchRoleQuery = 'SELECT * FROM public.roles WHERE role_id = $1'; // Assuming companies table and correct column names
        const roleResult = await db.query(fetchRoleQuery, [userDetail.role_id]);

        if (roleResult.rowCount === 0) {
            return res.status(404).json({ message: 'Role not found' });
        }

        const roleDetail = roleResult.rows[0];
        res.status(200).json({ userDetails: userDetail, roleDetails: roleDetail });
    } catch (error) {
        console.error('Error during getUserDetails process:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function block(req, res) {
    const { user_id } = req.params; // Ensure user_id is correctly extracted as a string
    const { action } = req.body;

    if (action !== 'block' && action !== 'unblock') {
        return res.status(400).json({ message: 'Invalid action. Use "block" or "unblock".' });
    }

    const blockValue = action === 'block' ? 1 : 0;

    try {
        const checkQuery = 'SELECT block FROM public.users WHERE user_id = $1';
        const checkResult = await db.query(checkQuery, [user_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentBlockStatus = checkResult.rows[0].block;

        if (currentBlockStatus === blockValue) {
            const statusMessage = blockValue === 1 ? 'already blocked' : 'already unblocked';
            return res.status(200).json({ message: `User is ${statusMessage}` });
        }

        const updateQuery = 'UPDATE public.users SET block = $1 WHERE user_id = $2';
        const updateResult = await db.query(updateQuery, [blockValue, user_id]);

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const successMessage = `User ${action}ed successfully`;
        res.status(200).json({ message: successMessage });
    } catch (error) {
        console.error(`Error during user ${action}ing:`, error);
        res.status(500).json({ message: `Error ${action}ing user` });
    }
}

async function getAllTokens(req, res) {
    const { token } = req.body;
    const matchToken = 'SenseLive-Smart-Work-Permit';

    console.log('Received token:', token);
    
    if (token === matchToken) {
        try {
            const query = 'SELECT * FROM public.reset_tokens';
            const result = await db.query(query);

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'No Tokens Found!' });
            }

            const tokenData = result.rows;

            console.log(tokenData);

            return res.status(200).json({ tokenData });
        } catch (error) {
            console.error('Error during token retrieval process:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
}


async function updateUser(req, res) {
  const user_id = req.params.user_id;
  const { first_name, last_name, designation } = req.body;

  const checkUserExistsQuery = 'SELECT 1 FROM public.users WHERE user_id = $1';
  const updateQuery = `
    UPDATE public.users
    SET first_name = $1,
        last_name = $2
    WHERE user_id = $3
  `;

  try {
    // Check if user exists
    const checkUserResult = await db.query(checkUserExistsQuery, [user_id]);
    if (checkUserResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user details
    const updateResult = await db.query(updateQuery, [first_name, last_name, user_id]);
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ message: 'Error updating user details' });
    }

    return res.status(200).json({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user details:', error);
    return res.status(500).json({ message: 'Error changing user details' });
  }
}

async function updateEmail(req, res) {
  const user_id = req.params.user_id;
  const { company_email, personal_email, contact_no } = req.body;

  const checkUserExistsQuery = 'SELECT 1 FROM public.users WHERE user_id = $1';
  const updateQuery = `
    UPDATE public.users 
    SET company_email = $1,
        personal_email = $2,
        contact_no = $3
    WHERE user_id = $4
  `;

  try {
    // Check if user exists
    const checkUserResult = await db.query(checkUserExistsQuery, [user_id]);
    if (checkUserResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user email details
    const updateResult = await db.query(updateQuery, [company_email, personal_email, contact_no, user_id]);
    if (updateResult.rowCount === 0) {
      return res.status(500).json({ message: 'Error updating user details' });
    }

    return res.status(200).json({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user details:', error);
    return res.status(500).json({ message: 'Error updating user' });
  }
}

async function updatePassword(req, res) {
  const { user_id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    // Step 1: Check if user exists
    const checkUserQuery = `SELECT * FROM public.users WHERE user_id = $1`;
    const userResult = await db.query(checkUserQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Step 2: Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Step 3: Update the password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Hash the new password
    const updateQuery = `UPDATE public.users SET password_hash = $1 WHERE user_id = $2`;
    await db.query(updateQuery, [hashedNewPassword, user_id]);

    // Step 4: Respond with success message
    res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function insertOrUpdateUserProfilePhoto(req, res) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { user_id, profileImage } = req.body;
        const { name, data } = profileImage;

        if (!user_id || !profileImage) {
            return res.status(400).json({ errors: 'Invalid Payload' });
        }

        // Check if user_id exists in the users table (assuming it's already validated in your middleware)

        // Check if user_id exists in the userprofilepictures table
        const userProfilePhotoCheckQuery = 'SELECT 1 FROM public.userprofilepictures WHERE user_id = $1';
        const userProfilePhotoResult = await client.query(userProfilePhotoCheckQuery, [user_id]);

        // Save the file to the profile folder
        const attachmentFileName = `${user_id}_${name}`;
        const attachmentDir = path.join(__dirname, '../profile');
        const absoluteAttachmentPath = path.join(attachmentDir, attachmentFileName);

        if (!fs.existsSync(attachmentDir)) {
            fs.mkdirSync(attachmentDir, { recursive: true });
        }

        const base64Data = data.split(';base64,').pop();
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(absoluteAttachmentPath, buffer);

        // Verify if the file size is correct
        const savedFileSize = fs.statSync(absoluteAttachmentPath).size;
        if (savedFileSize !== buffer.length) {
            throw new Error('File size mismatch after writing');
        }

        const photoPath = `profile/${attachmentFileName}`;

        // Insert or update the record in the userprofilepictures table
        if (userProfilePhotoResult.rowCount > 0) {
            const updatePhotoQuery = `
                UPDATE public.userprofilepictures
                SET photo_name = $1, photo_path = $2
                WHERE user_id = $3
            `;
            await client.query(updatePhotoQuery, [name, photoPath, user_id]);
        } else {
            const insertPhotoQuery = `
                INSERT INTO public.userprofilepictures (user_id, photo_name, photo_path)
                VALUES ($1, $2, $3)
            `;
            await client.query(insertPhotoQuery, [user_id, name, photoPath]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Profile photo inserted/updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error inserting/updating profile photo:', error);
        res.status(500).json({ error: 'Error inserting/updating profile photo' });
    } finally {
        client.release();
    }
}


async function getProfilePicture(req, res) {
    const user_id = req.params.user_id;

    try {
        // Ensure required parameters are provided
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const query = `SELECT photo_path, photo_name as profile_name FROM userprofilepictures WHERE user_id = $1`;

        const result = await db.query(query, [user_id]);

        if (result.rows.length === 0) {
            // No profile photo found, return null
            return res.status(200).json({ profile_photo: null });
        }

        const row = result.rows[0];

        // Read profile photo and convert to base64 if available
        if (row.photo_path !== null) {
            try {
                const fileBuffer = fs.readFileSync(row.photo_path);
                const base64File = fileBuffer.toString('base64');
                const mimeType = mime.lookup(row.profile_name);
                const profile_photo = `data:${mimeType || 'application/octet-stream'};base64,${base64File}`;
                
                // Return the profile photo
                return res.status(200).json({ profile_photo });
            } catch (err) {
                console.error('Error reading profile photo:', err);
                return res.status(500).json({ error: 'Error reading profile photo' });
            }
        } else {
            // Profile photo path is null, return null
            return res.status(200).json({ profile_photo: null });
        }
    } catch (err) {
        console.error('Error fetching user profile photo:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}




module.exports={
  forgotPassword,
  resendResetToken,
  resetPassword,
  register,
  login,
  getUserDetails,
  block,
  getAllTokens,
  updateUser,
  updateEmail,
  updatePassword,
  insertOrUpdateUserProfilePhoto,
  getProfilePicture
};