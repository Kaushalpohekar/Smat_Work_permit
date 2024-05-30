const bcrypt = require('bcrypt');
const db = require('../db');
const jwtUtils = require('../token/jwtUtils');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');
const { error } = require('console');




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

        const token = jwtUtils.generateToken({ Username: user.username });
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
    const { personalEmail } = req.body;

    try {
        const query = 'SELECT * FROM public.users WHERE personal_email = $1';
        const result = await db.query(query, [personalEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = jwtUtils.generateToken({ personalEmail });
        const userId = result.rows[0].user_id; 

        const insertQuery = 'INSERT INTO public.reset_tokens (user_id, token) VALUES ($1, $2)';
        await db.query(insertQuery, [userId, resetToken]);

        await sendResetTokenEmail(personalEmail, resetToken);

        res.status(200).json({ message: 'Reset token sent to your email' });
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
        const query = 'SELECT * FROM public.swp_reset_tokens WHERE token = $1';
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
        if (!decodedToken) {
            console.log('Invalid Token');
            return res.status(401).json({ message: 'Invalid token' });
        }

        const fetchUserQuery = 'SELECT * FROM public.users WHERE username = $1';
        const userResult = await db.query(fetchUserQuery, [decodedToken.username]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userDetail = userResult.rows[0];
        const fetchCompanyQuery = 'SELECT * FROM public.companies WHERE company_id = $1'; // Assuming companies table and correct column names
        const companyResult = await db.query(fetchCompanyQuery, [userDetail.company_id]);

        if (companyResult.rowCount === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const companyDetails = companyResult.rows[0];
        res.status(200).json({ userDetails: userDetail, companyDetails: companyDetails });
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

module.exports={
  forgotPassword,
  resendResetToken,
  resetPassword,
  register,
  login,
  getUserDetails,
  block,
};