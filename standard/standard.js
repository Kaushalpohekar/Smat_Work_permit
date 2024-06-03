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

//Insert api for these function

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


async function createQuestions(req, res) {
    const { form_name, question_text, question_type } = req.body;

    const fetchFormId = async (formName) => {
        const query = `SELECT form_id FROM public.forms WHERE form_name = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [formName], (error, result) => {
                if (error) {
                    console.error('Error fetching form ID', error);
                    reject(error);
                } else if (result.rows.length === 0) {
                    reject(new Error('Form not found'));
                } else {
                    resolve(result.rows[0].form_id);
                }
            });
        });
    };

    try {
        const form_id = await fetchFormId(form_name);

        const createQuery = `INSERT INTO public.questions (form_id, question_text, question_type) VALUES ($1, $2, $3) RETURNING *`;

        db.query(createQuery, [form_id, question_text, question_type], (error, result) => {
            if (error) {
                console.error('Error inserting data', error);
                res.status(500).json({ message: 'Error inserting data' });
            } else {
                res.status(201).json(result.rows[0]);
            }
        });
    } catch (error) {
        console.error('Error fetching form ID', error);
        res.status(500).json({ message: 'Error fetching form ID' });
    }
}

async function createForms(req, res) {
    const { category_name, plant_name, form_name, form_description, created_by_username } = req.body;

    const fetchCategoryId = async (categoryName) => {
        const query = `SELECT category_id FROM public.categories WHERE name = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [categoryName], (error, result) => {
                if (error) {
                    console.error('Error fetching category ID', error);
                    reject(error);
                } else if (result.rows.length === 0) {
                    reject(new Error('Category not found'));
                } else {
                    resolve(result.rows[0].category_id);
                }
            });
        });
    };

    const fetchPlantId = async (plantName) => {
        const query = `SELECT plant_id FROM public.plants WHERE name = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [plantName], (error, result) => {
                if (error) {
                    console.error('Error fetching plant ID', error);
                    reject(error);
                } else if (result.rows.length === 0) {
                    reject(new Error('Plant not found'));
                } else {
                    resolve(result.rows[0].plant_id);
                }
            });
        });
    };

    const fetchUserId = async (username) => {
        const query = `SELECT user_id FROM public.users WHERE username = $1`;
        return new Promise((resolve, reject) => {
            db.query(query, [username], (error, result) => {
                if (error) {
                    console.error('Error fetching user ID', error);
                    reject(error);
                } else if (result.rows.length === 0) {
                    reject(new Error('User not found'));
                } else {
                    resolve(result.rows[0].user_id);
                }
            });
        });
    };

    try {
        const category_id = await fetchCategoryId(category_name);
        const plant_id = await fetchPlantId(plant_name);
        const created_by = await fetchUserId(created_by_username);

        const query = `INSERT INTO public.forms (category_id, plant_id, form_name, form_description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`;

        db.query(query, [category_id, plant_id, form_name, form_description, created_by], (error, result) => {
            if (error) {
                console.error('Error inserting data', error);
                res.status(500).json({ message: "Error entering data" });
            } else {
                res.status(201).json(result.rows[0]);
            }
        });
    } catch (error) {
        console.error('Error fetching IDs', error);
        res.status(500).json({ message: "Error fetching IDs" });
    }
}


module.exports={
    getCategories,
    getQuestions,
    getForms,

    //insert apis for the following code 
    insertCategories,
    createQuestions,
    createForms,



}