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

module.exports = {
	getUserSubmissions,
    approveSubmission,
    rejectSubmission
}