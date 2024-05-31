const db = require('../db');


async function getCategories (req, res) {
    const { form_type, department_id } = req.params;
    if (!form_type || !department_id) {
        return res.status(400).json({ error: 'Form_type and department_id are required' });
    }
    try {
        const query = 
            `SELECT * FROM categories
            WHERE form_type = $1 AND department_id = $2`;
        
        const values = [form_type, department_id];
        const result = await db.query(query, [values]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No categories available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


async function getQuestions(req, res) {
    const form_id = req.params.form_id;
    const fetchQueQuery = `
        SELECT q.*, a.answer_text 
        FROM questions q
        LEFT JOIN answers a ON q.question_id = a.question_id
        WHERE q.form_id = $1
    `;
    try {
        const fetchresult = await db.query(fetchQueQuery, [form_id]);       
        if (fetchresult.rows.length === 0) {
            return res.status(404).json({ error: 'No questions available for the specified form ID' });
        }
        res.json(fetchresult.rows);
    } catch (fetcherror) {
        console.error('Error fetching questions:', fetcherror);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
}


async function getForms(req, res) {
    const category_id = req.params.category_id;
    const fetchFormQuery = `
        SELECT f.*, q.question_text, a.answer_text 
        FROM forms f
        LEFT JOIN questions q ON f.form_id = q.form_id
        LEFT JOIN answers a ON q.question_id = a.question_id
        WHERE f.category_id=$1
    `;
    try {
        const fetchresult = await db.query(fetchFormQuery, [category_id]);     
        if (fetchresult.rows.length === 0) {
            return res.status(404).json({ error: 'No forms available for the specified category' });
        }      
        const forms = {};
        fetchresult.rows.forEach(row => {
            if (!forms[row.form_id]) {
                forms[row.form_id] = {
                    form_id: row.form_id,
                    form_name: row.form_name,
                    category_id: row.category_id,
                    questions: [],
                };
            }
            forms[row.form_id].questions.push({
                question_id: row.question_id,
                question_text: row.question_text,
                answer_text: row.answer_text
            });
        });       
        const formsArray = Object.values(forms);
        res.json(formsArray);
    } catch (fetcherror) {
        console.error('Error fetching forms:', fetcherror);
        res.status(500).json({ error: 'Failed to fetch form for requested category.' });
    }
}



module.exports={
    getCategories,
    getQuestions,
    getForms

}