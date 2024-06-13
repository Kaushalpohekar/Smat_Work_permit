const express = require('express');
const cors = require('cors');
const router = require('./routes'); // Ensure this path is correct
const bodyParser = require('body-parser');


const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

// Use the router for handling routes
app.use(router);

app.get('/', (req, res) => {
  console.log('get request!!')
  res.send('Server is running');
});

app.get('/api/submissions/:submission_id/attachments/:question_id', async (req, res) => {
    const submissionId = req.params.submission_id;
    const questionId = req.params.question_id;

    try {
        // Fetch attachment details to get file path
        const attachmentQuery = `
            SELECT
                file_name,
                file_path
            FROM
                public.attachments
            WHERE
                submission_id = $1
                AND question_id = $2
        `;
        const attachmentResult = await db.query(attachmentQuery, [submissionId, questionId]);
        const attachment = attachmentResult.rows[0];

        if (!attachment || !attachment.file_path) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        // Serve the file using the file path stored in the database
        const filePath = path.join(__dirname, attachment.file_path);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Stream the file to the client
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error retrieving attachment:', error);
        res.status(500).json({ error: 'Error retrieving attachment' });
    }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
