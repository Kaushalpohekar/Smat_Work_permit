const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function insertData(req, res) {
    const { data } = req.body;
    const submission_id = uuidv4();
    const status = {
        qaAuditor: data.qaAuditor,
        auditorName: data.auditorName,
        qaShiftInCharge: data.qaShiftInCharge,
        operationsShiftInCharge: data.operationsShiftInCharge 
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const InsertDataQuery = `
            INSERT INTO audit_submissions (submission_id, submission_data, status)
            VALUES ($1, $2, $3);
        `;
        await client.query(InsertDataQuery, [submission_id, data, status]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Data inserted successfully', submission_id });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during data insertion:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}

async function getAllSubmissions(req, res) {
    const client = await db.connect();

    try {
        const query = 'SELECT submission_id FROM audit_submissions;';
        const result = await client.query(query);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No submissions found' });
        } else {
            res.status(200).json(result.rows);
        }

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function getAllSubmissionsByUser(req, res) {
    const client = await db.connect();
    const userId = req.params.user_id;  // Assume req.dna.user_id contains the user_id

    try {
        const query = 'SELECT submission_id, submission_data FROM audit_submissions;';
        const result = await client.query(query);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No submissions found' });
            return;
        }

        // Filter submissions to find ones containing the user_id
        const filteredSubmissions = result.rows.filter(row => {
            const submissionData = row.submission_data;
            if (submissionData && typeof submissionData === 'object') {
                return Object.values(submissionData).some(value => value === userId);
            }
            return false;
        });

        if (filteredSubmissions.length === 0) {
            res.status(404).json({ message: 'No submissions found for the user' });
        } else {
            res.status(200).json(filteredSubmissions);
        }

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}


async function getSubmissionById(req, res) {
    const submission_id = req.params.submissionId;
    const client = await db.connect();

    try {
        const query = 'SELECT * FROM audit_submissions WHERE submission_id = $1;';
        const result = await client.query(query, [submission_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Submission not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function getUserName(req, res) {
    const user_id = req.params.user_id;
    const client = await db.connect();

    try {
        const query = 'SELECT first_name, last_name FROM users WHERE user_id = $1;';
        const result = await client.query(query, [user_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Error fetching user:', error);  // Corrected log message
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function approveStatus(req, res) {
    const { submissionId, userId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Fetch current status data
        const selectQuery = 'SELECT status FROM audit_submissions WHERE submission_id = $1;';
        const selectResult = await client.query(selectQuery, [submissionId]);

        if (selectResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        let currentStatus = selectResult.rows[0].status;

        if (!currentStatus || typeof currentStatus !== 'object') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid or missing status data in submission' });
        }

        // Update status for matching userId
        let updated = false;
        Object.keys(currentStatus).forEach(role => {
            if (currentStatus[role] === userId) {
                currentStatus[role] = 'approved';
                updated = true;
            }
        });

        if (!updated) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User ID not found in submission status' });
        }

        // Update status in database
        const updateQuery = 'UPDATE audit_submissions SET status = $1 WHERE submission_id = $2;';
        await client.query(updateQuery, [currentStatus, submissionId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Status updated to approved successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving status:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}

async function rejectStatus(req, res) {
    const { submissionId, userId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Fetch current status data
        const selectQuery = 'SELECT status FROM audit_submissions WHERE submission_id = $1;';
        const selectResult = await client.query(selectQuery, [submissionId]);

        if (selectResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        let currentStatus = selectResult.rows[0].status;

        if (!currentStatus || typeof currentStatus !== 'object') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid or missing status data in submission' });
        }

        // Update status for matching userId
        let updated = false;
        Object.keys(currentStatus).forEach(role => {
            if (currentStatus[role] === userId) {
                currentStatus[role] = 'rejected';
                updated = true;
            }
        });

        if (!updated) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User ID not found in submission status' });
        }

        // Update status in database
        const updateQuery = 'UPDATE audit_submissions SET status = $1 WHERE submission_id = $2;';
        await client.query(updateQuery, [currentStatus, submissionId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Status updated to rejected successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting status:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}



module.exports = {
    insertData,
    getAllSubmissions,
    getSubmissionById,
    getAllSubmissionsByUser,
    getUserName,
    approveStatus,
    rejectStatus
};
