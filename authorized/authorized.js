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
                   (SELECT COUNT(*) FROM swp.submission_workers sw WHERE sw.submission_id = s.submission_id) as worker_count
            FROM swp.submissions s
            JOIN swp.forms f ON s.form_id = f.form_id
            JOIN swp.users u ON s.requested_by = u.user_id
            JOIN swp.organizations o ON u.organization_id = o.organization_id
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
        FROM swp.users u
        LEFT JOIN swp.UserSignaturePhotos s ON u.user_id = s.user_id
        WHERE u.user_id = $1`;
    const querySubmission = `
        UPDATE swp.submissions 
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
    const queryUser = `SELECT * FROM swp.users WHERE user_id = $1`;
    const querySubmission = `
        UPDATE swp.submissions 
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
                swp.users u
                LEFT JOIN swp.departments d ON u.department_id = d.department_id
                LEFT JOIN swp.organizations o ON u.organization_id = o.organization_id
                LEFT JOIN swp.plants p ON d.plant_id = p.plant_id
                LEFT JOIN swp.userprofilepictures up ON u.user_id = up.user_id
                LEFT JOIN swp.usersignaturephotos us ON u.user_id = us.user_id
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
            if (row.photo_path !== null) {
                try {
                    const fileBuffer = fs.readFileSync(row.photo_path);
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

async function getSubmissionCount(req, res) {
    const { form_type, user_id } = req.params;

    // Validate inputs
    if (!form_type) {
        return res.status(400).json({ error: 'form_type is required' });
    }
    
    if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
    }

    try {
        // Query to fetch submission counts grouped by status for a user and form type
        const query = `
            SELECT s.status, COUNT(*) AS count
            FROM swp.submissions s
            JOIN swp.forms f ON s.form_id = f.form_id
            JOIN swp.categories c ON f.category_id = c.category_id
            WHERE c.form_type = $1 AND s.authorizer = $2
            GROUP BY s.status;
        `;

        // Execute the query with form_type and user_id parameters
        const { rows } = await db.query(query, [form_type, user_id]);

        if (rows.length === 0) {
            return res.json({ message: 'No submissions found for the given criteria' });
        }

        // Prepare response object
        const submissionCounts = {};
        rows.forEach(row => {
            submissionCounts[row.status] = row.count;
        });

        // Return the submission counts as JSON response
        res.json(submissionCounts);

    } catch (error) {
        console.error('Error fetching submission counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getFormTypeBar(req, res) {
    const { user_id, interval } = req.params;

    let intervalCondition;

    // Determine interval condition based on user input
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

    try {
        const query = `
            SELECT c.form_type, COUNT(*) AS count
            FROM swp.submissions s
            JOIN swp.forms f ON s.form_id = f.form_id
            JOIN swp.categories c ON f.category_id = c.category_id
            WHERE s.authorizer = $1
            ${intervalCondition}
            AND s.status = 'opened'
            GROUP BY c.form_type;
        `;

        const { rows } = await db.query(query, [user_id]);

        const formTypeCounts = {};

        rows.forEach(row => {
            formTypeCounts[row.form_type] = parseInt(row.count);
        });

        res.json(formTypeCounts);

    } catch (error) {
        console.error('Error fetching form type counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getFormTypePercentages(req, res) {
    const { user_id, interval } = req.params;

    let intervalCondition;

    // Determine interval condition based on user input
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

    try {
        const query = `
            SELECT c.form_type, 
                   COUNT(*) AS count,
                   ROUND((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER (), 2) AS percentage
            FROM swp.submissions s
            JOIN swp.forms f ON s.form_id = f.form_id
            JOIN swp.categories c ON f.category_id = c.category_id
            WHERE s.authorizer = $1
            ${intervalCondition}
            GROUP BY c.form_type;
        `;

        const { rows } = await db.query(query, [user_id]);

        const formTypePercentages = {};

        rows.forEach(row => {
            formTypePercentages[row.form_type] = {
                count: parseInt(row.count),
                percentage: parseFloat(row.percentage)
            };
        });

        res.json(formTypePercentages);

    } catch (error) {
        console.error('Error fetching form type percentages:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getStatusCounts(req, res) {
    const { user_id, interval } = req.params;

    let intervalCondition;

    // Determine interval condition based on user input
    switch (interval) {
        case '1hour':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
            break;
        case '1day':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
            break;
        case '1week':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
            break;
        case '1month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
            break;
        case '6month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
            break;
        case '12month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
            break;
        default:
            return res.status(400).json({ error: 'Invalid interval value' });
    }

    try {
        const query = `
            SELECT status, 
                   COUNT(*) AS count
            FROM swp.submissions
            WHERE authorizer = $1
            ${intervalCondition}
            GROUP BY status;
        `;

        const { rows } = await db.query(query, [user_id]);

        const statusCounts = {};

        rows.forEach(row => {
            statusCounts[row.status] = parseInt(row.count);
        });

        res.json(statusCounts);

    } catch (error) {
        console.error('Error fetching status counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getApprovedCounts(req, res) {
    const { user_id, interval } = req.params;

    let intervalCondition;
    let timeGrouping;

    // Determine interval condition and time grouping based on user input
    switch (interval) {
        case '1hour':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
            timeGrouping = "DATE_TRUNC('hour', created_at)"; // Group by hour
            break;
        case '1day':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
            timeGrouping = "DATE_TRUNC('day', created_at)"; // Group by day
            break;
        case '1week':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
            timeGrouping = "DATE_TRUNC('week', created_at)"; // Group by week
            break;
        case '1month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
            timeGrouping = "DATE_TRUNC('month', created_at)"; // Group by month
            break;
        case '6month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
            timeGrouping = "DATE_TRUNC('month', created_at)"; // Group by 6 months (monthly)
            break;
        case '12month':
            intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
            timeGrouping = "DATE_TRUNC('year', created_at)"; // Group by year
            break;
        default:
            return res.status(400).json({ error: 'Invalid interval value' });
    }

    try {
        const query = `
            SELECT 
                ${timeGrouping} AS time_interval,
                status,
                COUNT(*) AS count
            FROM swp.submissions
            WHERE authorizer = $1
              AND status IN ('approved', 'rejected')
              ${intervalCondition}
            GROUP BY ${timeGrouping}, status
            ORDER BY ${timeGrouping} DESC;
        `;

        const { rows } = await db.query(query, [user_id]);

        const timeSeriesData = {};

        // Aggregate counts based on time intervals and status
        rows.forEach(row => {
            const timestamp = row.time_interval.toISOString();
            if (!timeSeriesData[timestamp]) {
                timeSeriesData[timestamp] = {
                    time: row.time_interval,
                    approve: 0,
                    rejected: 0
                };
            }
            if (row.status === 'approved') {
                timeSeriesData[timestamp].approve = parseInt(row.count);
            } else if (row.status === 'rejected') {
                timeSeriesData[timestamp].rejected = parseInt(row.count);
            }
        });

        // Convert object to array for consistent JSON response
        const timeSeriesArray = Object.values(timeSeriesData);

        res.json(timeSeriesArray);

    } catch (error) {
        console.error('Error fetching status counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function insertOrUpdateSignature(req, res) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { user_id, sign } = req.body;
        const { file_name, data } = sign;

        // Validate request data
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if user_id exists in the users table
        const userCheckQuery = 'SELECT 1 FROM public.users WHERE user_id = $1';
        const userResult = await client.query(userCheckQuery, [user_id]);

        if (userResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user_id exists in the userSignaturePhotos table
        const signatureCheckQuery = 'SELECT 1 FROM public.usersignaturephotos WHERE user_id = $1';
        const signatureResult = await client.query(signatureCheckQuery, [user_id]);

        // Save the file to the sign folder
        const attachmentFileName = `${user_id}_${file_name}`;
        const attachmentDir = path.join(__dirname, '../sign');
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

        const signPath = `sign/${attachmentFileName}`;

        // Insert or update the record in the userSignaturePhotos table
        if (signatureResult.rowCount > 0) {
            const updateSignatureQuery = `
                UPDATE swp.userSignaturePhotos
                SET sign_name = $1, sign_path = $2
                WHERE user_id = $3
            `;
            await client.query(updateSignatureQuery, [file_name, signPath, user_id]);
        } else {
            const insertSignatureQuery = `
                INSERT INTO swp.userSignaturePhotos (user_id, sign_name, sign_path)
                VALUES ($1, $2, $3)
            `;
            await client.query(insertSignatureQuery, [user_id, file_name, signPath]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Signature details inserted/updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error inserting/updating signature details:', error);
        res.status(500).json({ error: 'Error inserting/updating signature details' });
    } finally {
        client.release();
    }
}

module.exports = {
	getUserSubmissions,
    approveSubmission,
    rejectSubmission,
    getUserDetails,
    getSubmissionCount,
    getFormTypeBar,
    getFormTypePercentages,
    getStatusCounts,
    getApprovedCounts,
    insertOrUpdateSignature
}