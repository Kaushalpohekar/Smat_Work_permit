const db = require('../db');
const { validationResult } = require('express-validator');

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

    if (!category_id) {
        return res.status(400).json({ error: 'Category ID is required' });
    }

    // Ensure category_id is a valid number
    const sanitizedCategoryId = parseInt(category_id, 10);
    if (isNaN(sanitizedCategoryId)) {
        return res.status(400).json({ error: 'Invalid Category ID' });
    }

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
    const { form_id } = req.params;

    if (!form_id) {
        return res.status(400).json({ error: 'Form ID is required' });
    }

    const fetchQueQuery = `
        SELECT q.*, a.answer_text 
        FROM questions q
        LEFT JOIN answers a ON q.question_id = a.question_id
        WHERE q.form_id = $1
    `;

    try {
        const sanitizedFormId = sanitizeInput(form_id);

        const fetchresult = await db.query(fetchQueQuery, [sanitizedFormId]);

        if (fetchresult.rows.length === 0) {
            return res.status(404).json({ error: 'No questions available for the specified form ID' });
        }

        res.status(200).json(fetchresult.rows);
    } catch (err) {
        console.error('Error fetching questions:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
}

// async function getForms(req, res) {
//     const { category_id } = req.params;

//     if (!category_id) {
//         return res.status(400).json({ error: 'Category ID is required' });
//     }

//     const fetchFormQuery = `
//         SELECT f.*, q.question_text, a.answer_text 
//         FROM forms f
//         LEFT JOIN questions q ON f.form_id = q.form_id
//         LEFT JOIN answers a ON q.question_id = a.question_id
//         WHERE f.category_id = $1
//     `;

//     try {
//         const sanitizedCategoryId = sanitizeInput(category_id);

//         const fetchresult = await db.query(fetchFormQuery, [sanitizedCategoryId]);

//         if (fetchresult.rows.length === 0) {
//             return res.status(404).json({ error: 'No forms available for the specified category' });
//         }

//         const forms = {};
//         fetchresult.rows.forEach(row => {
//             if (!forms[row.form_id]) {
//                 forms[row.form_id] = {
//                     form_id: row.form_id,
//                     form_name: row.form_name,
//                     category_id: row.category_id,
//                     questions: [],
//                 };
//             }
//             forms[row.form_id].questions.push({
//                 question_id: row.question_id,
//                 question_text: row.question_text,
//                 answer_text: row.answer_text
//             });
//         });

//         const formsArray = Object.values(forms);
//         res.status(200).json(formsArray);
//     } catch (err) {
//         console.error('Error fetching forms:', err);
//         res.status(500).json({ error: 'Failed to fetch forms for requested category.' });
//     }
// }

module.exports = {
    getCategories,
    getQuestions,
    getForms
};
