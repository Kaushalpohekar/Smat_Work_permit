const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const mime = require('mime-types');
const bcrypt = require('bcrypt');

async function getUserSubmissions(req, res) {
    const user_id = req.params.user_id;
    const interval = req.params.interval;
    const category_id = req.params.category_id;

    try {
        // Ensure required parameters are provided
        if (!user_id || !interval || !category_id) {
            return res.status(400).json({ error: 'User ID, interval, and category ID are required' });
        }

        let intervalCondition = '';

        switch (interval) {
            case '1hour':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '1 hour'";
                break;
            case '1day':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '1 day'";
                break;
            case '1week':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '1 week'";
                break;
            case '1month':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '1 month'";
                break;
            case '6month':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '6 month'";
                break;
            case '12month':
                intervalCondition = "AND s.created_at >= NOW() - INTERVAL '1 year'";
                break;
            default:
                return res.status(400).json({ error: 'Invalid interval value' });
        }

        const query = `
            SELECT s.submission_id, s.remark, s.start_date, s.start_time, s.end_date, s.end_time, s.status, s.created_at, 
                   s.form_id, s.requested_by, f.form_name, u.first_name, u.last_name, u.organization_id, 
                   o.name, 
                   (SELECT COUNT(*) FROM submission_workers sw WHERE sw.submission_id = s.submission_id) as worker_count
            FROM submissions s
            JOIN forms f ON s.form_id = f.form_id
            JOIN users u ON s.requested_by = u.user_id
            JOIN organizations o ON u.organization_id = o.organization_id
            WHERE s.authorizer = $1
            AND f.category_id = $2
            ${intervalCondition}
            ORDER BY s.created_at DESC
        `;

        const result = await db.query(query, [user_id, category_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No submissions available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching user submissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function approveSubmission(req, res) {
    const { approved_by, password, submission_id } = req.body;
    const queryUser = `
        SELECT u.*, s.sign_id 
        FROM public.users u
        LEFT JOIN UserSignaturePhotos s ON u.user_id = s.user_id
        WHERE u.user_id = $1`;
    const querySubmission = `
        UPDATE submissions 
        SET status = 'approved', approved_by = $1, approved_at = NOW() 
        WHERE submission_id = $2 
        RETURNING *`;

    try {
        const userResult = await db.query(queryUser, [approved_by]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User does not exist!' });
        }

        const user = userResult.rows[0];
        
        // Check if user has a signature available
        if (!user.sign_id) {
            return res.status(400).json({ message: 'Signature not found. Upload signature first!' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password does not match' });
        }

        const submissionResult = await db.query(querySubmission, [user.user_id, submission_id]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found!' });
        }

        res.status(200).json({ message: 'Submission approved successfully!' });

    } catch (error) {
        console.error('Error during submission approval:', error);
        if (error.code === '23503') {
            return res.status(404).json({ message: 'User or Submission not found!' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function rejectSubmission(req, res) {
    const { rejected_by, password, submission_id } = req.body;
    const queryUser = `SELECT * FROM public.users WHERE user_id = $1`;
    const querySubmission = `
        UPDATE submissions 
        SET status = 'rejected', rejected_by = $1, rejected_at = NOW() 
        WHERE submission_id = $2 
        RETURNING *`;

    try {
        const userResult = await db.query(queryUser, [rejected_by]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User does not exist!' });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password does not match' });
        }

        const submissionResult = await db.query(querySubmission, [user.user_id, submission_id]);

        if (submissionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Submission not found!' });
        }

        res.status(200).json({ message: 'Submission rejected successfully!' });

    } catch (error) {
        console.error('Error during submission rejection:', error);
        if (error.code === '23503') {
            return res.status(404).json({ message: 'User or Submission not found!' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getUserDetails(req, res) {
    const user_id = req.params.user_id;

    try {
        // Ensure required parameters are provided
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const query = `
            SELECT 
                u.user_id, u.department_id, u.organization_id, u.first_name, u.last_name, 
                u.personal_email, u.company_email, u.contact_no, d."name" as department_name, 
                o."name" as organization_name, o.address as organization_address, 
                p."name" as plant_name, p."location" as plant_location, 
                up.photo_path, up.photo_name as profile_name,
                us.sign_path, us.sign_name as sign_name
            FROM 
                users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                LEFT JOIN organizations o ON u.organization_id = o.organization_id
                LEFT JOIN plants p ON d.plant_id = p.plant_id
                LEFT JOIN userprofilepictures up ON u.user_id = up.user_id
                LEFT JOIN usersignaturephotos us ON u.user_id = us.user_id
            WHERE 
                u.user_id = $1;
        `;

        const result = await db.query(query, [user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No submissions available for the specified request' });
        }

        const submissions = result.rows.map(row => {
            let submission = {
                first_name: row.first_name,
                last_name: row.last_name,
                personal_email: row.personal_email,
                company_email: row.company_email,
                contact_no: row.contact_no,
                department_name: row.department_name,
                organization_name: row.organization_name,
                organization_address: row.organization_address,
                plant_name: row.plant_name,
                plant_location: row.plant_location,
                profile: {
                    name: `${row.first_name} ${row.last_name}`,
                    profile_photo: null
                },
                sign: {
                    name: `${row.first_name} ${row.last_name}`,
                    sign_photo: null
                }
            };

            // Read profile picture and convert to base64 if available
            if (row.profile_path !== null) {
                try {
                    const fileBuffer = fs.readFileSync(row.profile_path);
                    const base64File = fileBuffer.toString('base64');
                    const mimeType = mime.lookup(row.profile_name);
                    submission.profile.profile_photo = `data:${mimeType || 'application/octet-stream'};base64,${base64File}`;
                } catch (err) {
                    console.error('Error reading profile photo:', err);
                    submission.profile.profile_photo = null; // Set to null if error occurs
                }
            }

            // Read signature photo and convert to base64 if available
            if (row.sign_path !== null) {
                try {
                    const fileBuffer = fs.readFileSync(row.sign_path);
                    const base64File = fileBuffer.toString('base64');
                    const mimeType = mime.lookup(row.sign_name);
                    submission.sign.sign_photo = `data:${mimeType || 'application/octet-stream'};base64,${base64File}`;
                } catch (err) {
                    console.error('Error reading signature photo:', err);
                    submission.sign.sign_photo = null; // Set to null if error occurs
                }
            }

            return submission;
        });

        res.status(200).json(submissions);
    } catch (err) {
        console.error('Error fetching user submissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}



module.exports = {
	getUserSubmissions,
    approveSubmission,
    rejectSubmission,
    getUserDetails
}