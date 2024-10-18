const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const mime = require('mime-types');
const nodemailer = require('nodemailer');
const ejs = require('ejs');


function sanitizeInput(input) {
    return input.replace(/[^\w\s.-]/gi, '');
}

async function getCategories(req, res) {
    const { form_type, department_id } = req.params;

    if (!form_type || !department_id) {
        return res.status(400).json({ error: 'Form_type and department_id are required' });
    }

    try {
        const sanitizedFormType = sanitizeInput(form_type);
        const sanitizedDepartmentId = sanitizeInput(department_id);

        const query = `
            SELECT * FROM categories
            WHERE form_type = $1 AND department_id = $2
        `;

        const values = [sanitizedFormType, sanitizedDepartmentId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No categories available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getForms(req, res) {
    const { category_id } = req.params;
    console.log(category_id);

    if (!category_id) {
        return res.status(400).json({ error: 'Category ID is required' });
    }

    // Ensure category_id is a valid number
    const sanitizedCategoryId = sanitizeInput(category_id);

    try {
        const query = `
            SELECT * FROM forms
            WHERE category_id = $1
        `;

        const values = [sanitizedCategoryId];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No forms available for the specified category' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching forms:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getQuestions(req, res) {
    const form_id = req.params.form_id;

    if (!form_id) {
        return res.status(400).json({ error: 'Form ID is required' });
    }

    try {
        const query = `
            SELECT q.question_id, q.question_text, q.question_type, q.created_at, o.option_id, o.option_text
            FROM public.questions q
            LEFT JOIN public.options o ON q.question_id = o.question_id
            WHERE q.form_id = $1
        `;

        const sanitizedFormId = sanitizeInput(form_id);
        const result = await db.query(query, [sanitizedFormId]);
        const data = result.rows;

        if (data.length === 0) {
            return res.status(404).json({ message: "No questions found for the provided form_id" });
        }

        const questions = data.reduce((acc, row) => {
            const { question_id, question_text, question_type, created_at, option_id, option_text } = row;
            let question = acc.find(q => q.question_id === question_id);

            if (!question) {
                question = {
                    question_id,
                    question_text,
                    question_type,
                    sort: created_at,
                    options: []
                };
                acc.push(question);
            }

            if (option_id) {
                question.options.push(option_text);
            }

            return acc;
        }, []);

        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error processing request', error);
        res.status(500).json({ message: "Error processing request" });
    }
}

async function getDepartments(req, res) {
    const department_id = req.params.department_id;
    if (!department_id) {
        return res.status(400).json({ error: 'Department_id is required' });
    }
    try {
        const query =
            `SELECT d.*, u.username, u.role_id, c.name
            FROM departments d
            LEFT JOIN users u ON d.department_id = u.department_id
            LEFT JOIN categories c ON d.department_id = c.department_id
            WHERE d.department_id=$1`;


        const result = await db.query(query, [department_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No departments available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getPlants(req, res) {
    const plant_id = req.params.plant_id;
    if (!plant_id) {
        return res.status(400).json({ error: 'Plant id is required' });
    }
    try {
        const query =
            `SELECT p.*,d.name,d.department_id,c.name,c.mobile_number
            FROM plants p
            LEFT JOIN departments d ON p.plant_id = d.plant_id
            LEFT JOIN contractors c ON p.plant_id = c.plant_id
            WHERE p.plant_id=$1`;


        const result = await db.query(query, [plant_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No plants available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getOrganizations(req, res) {
    const organization_id = req.params.organization_id;
    if (!organization_id) {
        return res.status(400).json({ error: 'Organization id is required' });
    }
    try {
        const query =
            `SELECT o.*,p.name,p.plant_id,p.location
            FROM organizations o
            LEFT JOIN plants p ON p.organization_id = o.organization_id
            WHERE o.organization_id=$1`;


        const result = await db.query(query, [organization_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No organization available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function insertCategories(req, res) {
    const { name, subtitle, icon, form_type, department_name } = req.body;

    const fetchDepartmentId = async (departmentName) => {
        const query = `SELECT department_id FROM public.departments WHERE name = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [departmentName], (error, result) => {
                if (error) {
                    console.error('Error fetching department ID', error);
                    reject(error);
                } else if (result.rows.length === 0) {
                    reject(new Error('Department not found'));
                } else {
                    resolve(result.rows[0].department_id);
                }
            });
        });
    };

    try {
        const department_id = await fetchDepartmentId(department_name);

        const query = `INSERT INTO public.categories (name, subtitle, icon, form_type, department_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

        db.query(query, [name, subtitle, icon, form_type, department_id], (error, result) => {
            if (error) {
                console.error('Error inserting data', error);
                res.status(500).json({ message: "Error inserting data" });
            } else {
                res.status(201).json(result.rows[0]);
            }
        });
    } catch (error) {
        console.error('Error fetching department ID', error);
        res.status(500).json({ message: "Error fetching department ID" });
    }
}

async function createForms(req, res) {
    const { category_id, plant_id, form_name, form_description, created_by } = req.body;

    const checkIfExists = async (tableName, columnName, id) => {
        const query = `SELECT 1 FROM public.${tableName} WHERE ${columnName} = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [id], (error, result) => {
                if (error) {
                    console.error(`Error checking ${columnName} in ${tableName}`, error);
                    reject(error);
                } else {
                    resolve(result.rows.length > 0);
                }
            });
        });
    };

    try {
        const categoryExists = await checkIfExists('categories', 'category_id', category_id);
        if (!categoryExists) {
            return res.status(400).json({ message: "Invalid category_id" });
        }

        const plantExists = await checkIfExists('plants', 'plant_id', plant_id);
        if (!plantExists) {
            return res.status(400).json({ message: "Invalid plant_id" });
        }

        const userExists = await checkIfExists('users', 'user_id', created_by);
        if (!userExists) {
            return res.status(400).json({ message: "Invalid created_by" });
        }

        const query = `INSERT INTO public.forms (category_id, plant_id, form_name, form_description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

        db.query(query, [category_id, plant_id, form_name, form_description, created_by], (error, result) => {
            if (error) {
                console.error('Error inserting data', error);
                res.status(500).json({ message: "Error entering data" });
            } else {
                res.status(201).json({ message: "Form Successfully Created!" });
            }
        });
    } catch (error) {
        console.error('Error checking IDs', error);
        res.status(500).json({ message: "Error checking IDs" });
    }
}

async function createQuestions(req, res) {
    const questions = req.body.questions;

    const checkIfExists = async (tableName, columnName, id) => {
        const query = `SELECT 1 FROM public.${tableName} WHERE ${columnName} = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [id], (error, result) => {
                if (error) {
                    console.error(`Error checking ${columnName} in ${tableName}`, error);
                    reject(error);
                } else {
                    resolve(result.rows.length > 0);
                }
            });
        });
    };

    try {
        // Validate each form
        for (const question of questions) {
            const { form_id } = question;

            const formExists = await checkIfExists('forms', 'form_id', form_id);
            if (!formExists) {
                return res.status(400).json({ message: "Invalid form_id" });
            }
        }

        // Insert questions and get the inserted ids
        const insertedQuestions = [];
        for (const question of questions) {
            const { form_id, question_text, question_type, options } = question;
            const query = `INSERT INTO public.questions (form_id, question_text, question_type) VALUES ($1, $2, $3) RETURNING question_id`;
            const values = [form_id, question_text, question_type];

            const result = await new Promise((resolve, reject) => {
                db.query(query, values, (error, result) => {
                    if (error) {
                        console.error('Error inserting question', error);
                        reject(error);
                    } else {
                        resolve(result.rows[0]);
                    }
                });
            });

            const question_id = result.question_id;
            insertedQuestions.push({ question_id, options });
        }

        // Insert options for each question
        for (const { question_id, options } of insertedQuestions) {
            if (options && options.length > 0) {
                const optionQueries = options.map(option => {
                    const query = `INSERT INTO public.options (question_id, option_text) VALUES ($1, $2)`;
                    const values = [question_id, option];
                    return new Promise((resolve, reject) => {
                        db.query(query, values, (error, result) => {
                            if (error) {
                                console.error('Error inserting option', error);
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                });

                await Promise.all(optionQueries);
            }
        }

        res.status(200).json({ message: "Questions and options successfully created!" });
    } catch (error) {
        console.error('Error processing request', error);
        res.status(500).json({ message: "Error processing request" });
    }
}

async function getAuthorizersByDepartment(req, res) {
    const department_id = req.params.department_id;
    const authorizerRoleId = 'b3d036de-e44e-43d2-8bd4-dd6a0e040bc5'; // UUID for the Authorizer role

    console.log('Department ID:', department_id);
    console.log('Authorizer Role ID:', authorizerRoleId);

    const getQuery = `
        SELECT first_name, last_name, user_id
        FROM public.users
        WHERE department_id = $1 AND role_id = $2
    `;

    try {
        const result = await db.query(getQuery, [department_id, authorizerRoleId]);
        console.log('Query Result:', result.rows);

        if (result.rows.length > 0) {
            res.status(200).json(result.rows);
        } else {
            res.status(404).json({ message: 'No authorizers found for this department' });
        }
    } catch (error) {
        console.error('Error fetching authorizers', error);
        res.status(500).json({ message: 'Error fetching authorizers' });
    }
}

async function insertSubmissionDetails(req, res) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const status = 'opened';
        const { formId, authorizer, requestedBy, startDate, startTime, endDate, endTime, location, remarks, workers, contractors, questions } = req.body;
        const submissionId = uuidv4();
        const insertSubmissionQuery = `INSERT INTO public.submissions (submission_id, form_id, authorizer, requested_by, start_date, start_time, end_date, end_time, location, remark, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
        await client.query(insertSubmissionQuery, [submissionId, formId, authorizer, requestedBy, startDate, startTime, endDate, endTime, location, remarks, status]);

        for (const worker of workers) {
            const workerId = worker.id || uuidv4();
            const insertWorkerQuery = `INSERT INTO public.workers (worker_id, name, mobile_number) VALUES ($1, $2, $3) ON CONFLICT (worker_id) DO NOTHING`;
            await client.query(insertWorkerQuery, [workerId, worker.name, worker.mobileNumber]);
            const insertSubmissionWorkerQuery = `INSERT INTO public.submission_workers (submission_id, worker_id) VALUES ($1, $2)`;
            await client.query(insertSubmissionWorkerQuery, [submissionId, workerId]);
        }

        for (const contractor of contractors) {
            const contractorId = contractor.id || uuidv4();
            const insertContractorQuery = `INSERT INTO public.contractors (contractor_id, name, mobile_number) VALUES ($1, $2, $3) ON CONFLICT (contractor_id) DO NOTHING`;
            await client.query(insertContractorQuery, [contractorId, contractor.name, contractor.mobileNumber]);
            const insertSubmissionContractorQuery = `INSERT INTO public.submission_contractors (submission_id, contractor_id) VALUES ($1, $2)`;
            await client.query(insertSubmissionContractorQuery, [submissionId, contractorId]);
        }

        for (const question of questions) {
            const insertAnswerQuery = `INSERT INTO public.answers (submission_id, question_id, answer_text, remark) VALUES ($1, $2, $3, $4)`;
            await client.query(insertAnswerQuery, [submissionId, question.question_id, question.answer, question.remarks]);

            if (question.attachment && question.attachment.data) {
                console.log(question.attachment.data);
                const originalFileName = question.attachment.file_name;
                const attachmentFileName = `${submissionId}_${originalFileName}`;
                const attachmentDir = path.join(__dirname, '../uploads');
                const absoluteAttachmentPath = path.join(attachmentDir, attachmentFileName);

                try {
                    // Ensure the directory exists
                    if (!fs.existsSync(attachmentDir)) {
                        fs.mkdirSync(attachmentDir);
                    }

                    // Save the attachment file to local storage
                    const base64Data = question.attachment.data.split(';base64,').pop();
                    const buffer = Buffer.from(base64Data, 'base64');
                    fs.writeFileSync(absoluteAttachmentPath, buffer);

                    // Verify if the file size is correct
                    const savedFileSize = fs.statSync(absoluteAttachmentPath).size;
                    if (savedFileSize !== buffer.length) {
                        throw new Error('File size mismatch after writing');
                    }

                    // Insert a record into the attachments table with the relative path
                    const insertAttachmentQuery = `INSERT INTO public.attachments (submission_id, question_id, file_name, file_path) VALUES ($1, $2, $3, $4)`;
                    await client.query(insertAttachmentQuery, [submissionId, question.question_id, attachmentFileName, `uploads/${attachmentFileName}`]);
                } catch (fileError) {
                    throw new Error(`File handling error: ${fileError.message}`);
                }
            }
        }

        const { form, authorizer: authorizerDetails } = await fetchFormAndAuthorizer(client, formId, authorizer);
        
        await sendSubmissionEmail(form, authorizerDetails);
        
        await client.query('COMMIT');
        res.status(201).json({ message: 'Submission details inserted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error inserting submission details:', error);
        res.status(500).json({ error: 'Error inserting submission details' });
    } finally {
        client.release();
    }
}


async function getUserSubmissions(req, res) {
    const user_id = req.params.user_id;
    const interval = req.params.interval;

    try {
        // Ensure user_id is provided
        if (!user_id || !interval) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        let intervalCondition = '';
        let intervalValue = '';

        switch (interval) {
            case '1hour':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
                intervalValue = 'Hour';
                break;
            case '1day':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
                intervalValue = 'Day';
                break;
            case '1week':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
                intervalValue = 'Week';
                break;
            case '1month':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
                intervalValue = 'Month';
                break;
            case '6month':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
                intervalValue = 'Half Year';
                break;
            case '12month':
                intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
                intervalValue = 'Full Year';
                break;
            default:
                return res.status(400).json({ error: 'Invalid interval value' });
        }

        const userFormQuery = `
            SELECT submission_id, remark, status, created_at, form_id, authorizer FROM submissions
            WHERE requested_by = $1 
            ${intervalCondition} ORDER BY created_at DESC`;

        const result = await db.query(userFormQuery, [user_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No Submissions available for the specified request' });
        }

        // Array to hold submission data with form and authorizer details
        let submissionsWithDetails = [];

        // Fetch form data and authorizer details for each submission
        for (let submission of result.rows) {
            const formDataQuery = `
                SELECT form_name FROM forms
                WHERE form_id = $1`;

            const formDataResult = await db.query(formDataQuery, [submission.form_id]);
            if (formDataResult.rows.length === 1) {
                // Fetch authorizer details
                const authorizerDataQuery = `
                    SELECT first_name, last_name FROM users
                    WHERE user_id = $1`;

                const authorizerDataResult = await db.query(authorizerDataQuery, [submission.authorizer]);
                if (authorizerDataResult.rows.length === 1) {
                    // Merge submission data with form data and authorizer details
                    let submissionWithDetails = {
                        ...submission,
                        form_data: formDataResult.rows[0],
                        authorizer_details: authorizerDataResult.rows[0]
                    };
                    submissionsWithDetails.push(submissionWithDetails);
                } else {
                    console.error('Authorizer data not found for user ID:', submission.authorizer);
                }
            } else {
                console.error('Form data not found for submission ID:', submission.submission_id);
            }
        }

        res.status(200).json(submissionsWithDetails);

    } catch (err) {
        console.error('Error fetching user submissions:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getUserSubmissionStatusCounts(req, res) {
    const user_id = req.params.user_id;
    const interval = req.params.interval;

    try {
        // Ensure user_id and interval are provided
        if (!user_id || !interval) {
            return res.status(400).json({ error: 'User ID and interval are required' });
        }

        let intervalCondition = '';

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

        // Query to get status counts
        const statusCountQuery = `
            SELECT status, COUNT(*) as count
            FROM submissions
            WHERE requested_by = $1 
            ${intervalCondition}
            GROUP BY status`;

        // Query to get total count
        const totalCountQuery = `
            SELECT COUNT(*) as total_count
            FROM submissions
            WHERE requested_by = $1 
            ${intervalCondition}`;

        // Execute the queries sequentially
        const statusResult = await db.query(statusCountQuery, [user_id]);
        const totalResult = await db.query(totalCountQuery, [user_id]);

        const statusCounts = {};
        statusResult.rows.forEach(row => {
            statusCounts[row.status] = row.count;
        });

        // Extract total count from the result
        const totalCount = totalResult.rows[0].total_count;

        // Send JSON response with status code 200
        res.status(200).json({ statusCounts, totalCount });

    } catch (err) {
        console.error('Error fetching user submission status counts:', err);
        // Send error response with status code 500
        res.status(500).json({ error: 'Failed to fetch user submission status counts' });
    }
}

async function getSubmissionDetails(req, res) {
    try {
        const submissionId = req.params.submission_id;

        // Fetch submission details
        const submissionQuery = `
            SELECT
                form_id,
                authorizer,
                start_date,
                start_time,
                end_date,
                end_time,
                location,
                remark,
                status,
                requested_by,
                created_at
            FROM
                public.submissions
            WHERE
                submission_id = $1
        `;
        const submissionResult = await db.query(submissionQuery, [submissionId]);
        const submission = submissionResult.rows[0];

        if (!submission) {
            return res.status(404).json({ error: { message: 'Submission not found' } });
        }

        // Fetch first_name and last_name for requested_by
        const requestedByQuery = `
            SELECT
                first_name,
                last_name
            FROM
                public.users
            WHERE
                user_id = $1
        `;
        const requestedByResult = await db.query(requestedByQuery, [submission.requested_by]);
        const requestedByUser = requestedByResult.rows[0];

        // Fetch first_name and last_name for authorizer
        const authorizerQuery = `
            SELECT
                first_name,
                last_name
            FROM
                public.users
            WHERE
                user_id = $1
        `;
        const authorizerResult = await db.query(authorizerQuery, [submission.authorizer]);
        const authorizerUser = authorizerResult.rows[0];

        // Fetch questions for the form
        const questionsQuery = `
            SELECT
                question_id,
                question_text,
                question_type,
                created_at
            FROM
                public.questions
            WHERE
                form_id = $1
        `;
        const questionsResult = await db.query(questionsQuery, [submission.form_id]);
        const questions = questionsResult.rows;

        // Fetch answers for the submission
        const answersQuery = `
            SELECT
                q.question_id,
                q.question_text,
                q.question_type,
                a.answer_text,
                a.remark
            FROM
                public.questions q
            LEFT JOIN
                public.answers a ON q.question_id = a.question_id
            WHERE
                q.form_id = $1
                AND a.submission_id = $2
        `;
        const answersResult = await db.query(answersQuery, [submission.form_id, submissionId]);
        const answers = answersResult.rows;

        const workersQuery = `
            SELECT
                w.name,
                w.mobile_number
            FROM
                public.submission_workers sw
            JOIN
                public.workers w ON sw.worker_id = w.worker_id
            WHERE
                sw.submission_id = $1
        `;
        const workersResult = await db.query(workersQuery, [submissionId]);
        const workers = workersResult.rows;

        const contractorsQuery = `
            SELECT
                c.name,
                c.mobile_number
            FROM
                public.submission_contractors sc
            JOIN
                public.contractors c ON sc.contractor_id = c.contractor_id
            WHERE
                sc.submission_id = $1
        `;
        const contractorsResult = await db.query(contractorsQuery, [submissionId]);
        const contractors = contractorsResult.rows;

        const formQuery = `
            SELECT
                form_name,
                category_id
            FROM
                public.forms
            WHERE
                form_id = $1
        `;
        const formResult = await db.query(formQuery, [submission.form_id]);
        const form = formResult.rows[0];

        const categoryQuery = `
            SELECT
                name,
                subtitle,
                icon
            FROM
                public.categories
            WHERE
                category_id = $1
        `;
        const categoryResult = await db.query(categoryQuery, [form.category_id]);
        const category = categoryResult.rows[0];

        // Prepare response data with questions and answers
        const responseData = {
            submission: {
                form_data: form,
                category_data: category,
                ...submission,
                requested_by: {
                    first_name: requestedByUser.first_name,
                    last_name: requestedByUser.last_name
                },
                authorizer: {
                    first_name: authorizerUser.first_name,
                    last_name: authorizerUser.last_name
                },
            },
            workers: workers,
            contractors: contractors,
            questions: questions.map(question => ({
                questionId: question.question_id,
                questionText: question.question_text,
                questionType: question.question_type,
                sort: question.created_at,
                answer: answers.find(answer => answer.question_id === question.question_id)?.answer_text || '',
                remark: answers.find(answer => answer.question_id === question.question_id)?.remark || ''
            }))
        };

        // Fetch and convert attachments to base64
        for (const question of questions) {
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
            const attachmentResult = await db.query(attachmentQuery, [submissionId, question.question_id]);
            const attachment = attachmentResult.rows[0];

            if (attachment && attachment.file_path) {
                try {
                    // Read file as buffer
                    const fileBuffer = fs.readFileSync(attachment.file_path);

                    // Convert buffer to base64 string
                    const base64File = fileBuffer.toString('base64');
                    const mimeType = mime.lookup(attachment.file_name);
                    const attachmentData = `data:${mimeType || 'application/octet-stream'};base64,${base64File}`;

                    // Add attachment details to the response
                    const questionToUpdate = responseData.questions.find(q => q.questionId === question.question_id);
                    if (questionToUpdate) {
                        questionToUpdate.attachment = {
                            fileName: attachment.file_name,
                            data: attachmentData
                        };
                    }
                } catch (error) {
                    console.error('Error reading attachment file:', error);
                }
            }
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching submission details:', error);
        res.status(500).json({ error: { message: 'Error fetching submission details' } });
    }
}



//getsubmissioncounts
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
            FROM submissions s
            JOIN forms f ON s.form_id = f.form_id
            JOIN categories c ON f.category_id = c.category_id
            WHERE c.form_type = $1 AND s.requested_by = $2
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


async function fetchFormAndAuthorizer(client, formId, authorizerId) {
    // Fetch form details from the database
    const formDetailsQuery = 'SELECT form_name, form_description FROM public.forms WHERE form_id = $1';
    const formDetailsResult = await client.query(formDetailsQuery, [formId]);

    // Fetch authorizer details from the database
    const authorizerDetailsQuery = 'SELECT personal_email, first_name, last_name FROM public.users WHERE user_id = $1';
    const authorizerDetailsResult = await client.query(authorizerDetailsQuery, [authorizerId]);

    if (formDetailsResult.rows.length === 0 || authorizerDetailsResult.rows.length === 0) {
        throw new Error('Form or Authorizer not found');
    }

    return {
        form: formDetailsResult.rows[0],
        authorizer: authorizerDetailsResult.rows[0],
    };
}

async function sendSubmissionEmail(formDetails, authorizerDetails) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,  // Use environment variables for sensitive data
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const templatePath = path.join(__dirname, '../mail.body/submission.ejs');
        const templateData = await fs.promises.readFile(templatePath, 'utf8');
        const compiledTemplate = ejs.compile(templateData);

        const html = compiledTemplate({ formDetails, authorizerDetails });

        const mailOptions = {
            from: 'donotreplysenselive@gmail.com',
            to: authorizerDetails.personal_email,
            subject: `New Submission for Form: ${formDetails.form_name}`,  // Use backticks for dynamic values
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}



module.exports = {
    getCategories,
    getQuestions,
    getForms,
    getDepartments,
    getPlants,
    getOrganizations,
    insertCategories,
    createQuestions,
    createForms,
    getAuthorizersByDepartment,
    insertSubmissionDetails,
    getUserSubmissions,
    getUserSubmissionStatusCounts,
    getSubmissionDetails,
    getSubmissionCount
}
