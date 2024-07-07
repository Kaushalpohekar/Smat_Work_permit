const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function insertData(req, res) {
    const { data } = req.body;
    const submission_id = uuidv4();

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const InsertDataQuery = `
            INSERT INTO audit_submissions (submission_id, submission_data)
            VALUES ($1, $2);
        `;
        await client.query(InsertDataQuery, [submission_id, data]);

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

module.exports = {
    insertData,
    getAllSubmissions,
    getSubmissionById
};
