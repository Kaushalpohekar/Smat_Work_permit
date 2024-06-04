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


// async function getQuestions(req, res) {
//     const { form_id } = req.params;

//     if (!form_id) {
//         return res.status(400).json({ error: 'Form ID is required' });
//     }

//     const fetchQueQuery = `
//         SELECT q.*, a.answer_text 
//         FROM questions q
//         LEFT JOIN answers a ON q.question_id = a.question_id
//         WHERE q.form_id = $1
//     `;

//     try {
//         const sanitizedFormId = sanitizeInput(form_id);

//         const fetchresult = await db.query(fetchQueQuery, [sanitizedFormId]);

//         if (fetchresult.rows.length === 0) {
//             return res.status(404).json({ error: 'No questions available for the specified form ID' });
//         }

//         res.status(200).json(fetchresult.rows);
//     } catch (err) {
//         console.error('Error fetching questions:', err);
//         res.status(500).json({ error: 'Failed to fetch questions' });
//     }
// }

async function getQuestions(req, res) {
    const form_id = req.params.form_id;

    if (!form_id) {
        return res.status(400).json({ error: 'Form ID is required' });
    }

    try {
        const query = `
            SELECT q.question_id, q.question_text, q.question_type, o.option_id, o.option_text
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
            const { question_id, question_text, question_type, option_id, option_text } = row;
            let question = acc.find(q => q.question_id === question_id);

            if (!question) {
                question = {
                    question_id,
                    question_text,
                    question_type,
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


async function getDepartments (req, res) {
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
        
        
        const result = await db.query(query,[department_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No departments available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getPlants (req, res) {
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
        
        
        const result = await db.query(query,[plant_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No plants available for the specified request' });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

async function getOrganizations (req, res) {
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
        
        
        const result = await db.query(query,[organization_id]);
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


// async function createQuestions(req, res) {
//     const { form_name, question_text, question_type } = req.body;

//     const fetchFormId = async (formName) => {
//         const query = `SELECT form_id FROM public.forms WHERE form_name = $1`;
//         return new Promise((resolve, reject) => {
//             db.query(query, [formName], (error, result) => {
//                 if (error) {
//                     console.error('Error fetching form ID', error);
//                     reject(error);
//                 } else if (result.rows.length === 0) {
//                     reject(new Error('Form not found'));
//                 } else {
//                     resolve(result.rows[0].form_id);
//                 }
//             });
//         });
//     };

//     try {
//         const form_id = await fetchFormId(form_name);

//         const createQuery = `INSERT INTO public.questions (form_id, question_text, question_type) VALUES ($1, $2, $3) RETURNING *`;

//         db.query(createQuery, [form_id, question_text, question_type], (error, result) => {
//             if (error) {
//                 console.error('Error inserting data', error);
//                 res.status(500).json({ message: 'Error inserting data' });
//             } else {
//                 res.status(201).json(result.rows[0]);
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching form ID', error);
//         res.status(500).json({ message: 'Error fetching form ID' });
//     }
// }

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
                res.status(201).json({ message: "Form Successfully Created!"});
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




module.exports = {
    getCategories,
    getQuestions,
    getForms,
    getDepartments,
    getPlants,
    getOrganizations,
    
    insertCategories,
    createQuestions,
    createForms
}
