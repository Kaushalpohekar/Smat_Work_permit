const db = require('../db');
const { v4: uuidv4 } = require('uuid');



// async function createCategory(req,res){
// const {title,subtitle,icon}=req.body;
// const category_id = uuidv4();

// const CreateCategoryQuery = `INSERT INTO public.category (title,subtitle,icon,category_id) VALUES ($1,$2,$3,$4) RETURNING category_id`

// db.query(CreateCategoryQuery,[title,subtitle,icon,category_id],(error,result)=>{
//     if(error){
//         console.error('Error creating category:',error);
//         res.status(500).json({message:'Failed to create category'});
//     }

//     else{
//         res.status(201).json({categoryId:result.rows[0].category_id,message:'Category created successfully'});
//     }
// })
// }

async function createCategory(req, res) {
    const { name, subtitle, icon, form_type } = req.body;
    const department_id = req.params.department_id;
    
    if (!name || !form_type || !department_id) {
        return res.status(400).json({ message: 'Name, form_type, and department_id are required' });
    }

    const category_id = uuidv4();

    const checkCategoryQuery = `
      SELECT category_id 
      FROM public.categories 
      WHERE category_id = $1
    `;

    const insertCategoryQuery = `
      INSERT INTO public.categories (category_id, name, subtitle, icon, form_type, department_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    try {
        
        const checkResult = await db.query(checkCategoryQuery, [category_id]);
        if (checkResult.rows.length > 0) {
            return res.status(409).json({ message: 'Category ID already exists' });
        }

         
        const values = [category_id, name, subtitle, icon, form_type, department_id];
        const insertResult = await db.query(insertCategoryQuery, values);

        return res.status(201).json({ message: 'Category inserted successfully', category: insertResult.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error while inserting category', error });
    }
}





async function updateCategory(req, res) {
    const category_id = req.params.category_id;
    const { name, subtitle, icon } = req.body;
    const updateCategoryQuery = `
        UPDATE public.categories 
        SET name = $1, subtitle = $2, icon = $3 
        WHERE category_id = $4
        RETURNING *
    `;

    try {
        const result = await db.query(updateCategoryQuery, [name, subtitle, icon, category_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Failed to update category' });
    }
}




async function deleteCategory(req, res) {
    const category_id = req.params.category_id;
    const deleteCategoryQuery = `DELETE FROM public.categories WHERE category_id = $1`;

    try {
        const result = await db.query(deleteCategoryQuery, [category_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Failed to delete category' });
    }
}


async function getCategoryById(req, res) {
    const category_id = req.params.category_id;

    const getCategoryQuery = `SELECT * FROM public.categories WHERE category_id = $1`;

    try {
        const result = await db.query(getCategoryQuery, [category_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
}



async function getAllCategories(req, res) {
    const getAllCategoriesQuery = `SELECT * FROM public.categories`;

    try {
        const result = await db.query(getAllCategoriesQuery, []);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
}



//forms queries

// async function createForm(req,res){
//     const { category_id }=req.params;
//     const {form_name,organization, created_by,form_type,start_date,start_time,end_date,end_time,name,worker}=req.body;

//     const categoryQuery=`SELECT title, subtitle, icon FROM public.categories WHERE category_id = $1`;

//     const categoryResult = await db.query(categoryQuery,[category_id]);

//     if(categoryResult.rows.length === 0){
//         return res.status(404).json({message:'category not found'});
//     }

//     const {title, subtitle, icon}=categoryResult.rows[0];

//     // Generate formUID
//     const formUIDQuery = `SELECT COUNT(*) FROM public.forms WHERE category_id = $1`;
//     const formCountResult = await db.query(formUIDQuery, [category_id]);
//     const formCount = formCountResult.rows[0].count + 1;
//     const formUID = `${title.slice(0, 3).toUpperCase()}${formCount.toString().padStart(7, '0')}`;

//     const form_id = uuidv4();

   
//     const insertFormQuery = `
//     INSERT INTO public.forms (form_name,organization, created_by, form_type, form_uid, title, subtitle, icon, start_date, start_time, end_date, end_time, "name", worker, category_id) 
//     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
//     RETURNING form_id`;

//     db.query(insertFormQuery,[form_name,organization, created_by, form_type, formUID, title, subtitle, icon, start_date, start_time, end_date, end_time, name, worker, category_id],(error,result)=>{
//         if(error){
//             console.error('Error creating form:',error);
//             res.status(500).json({message:'Failed to create form'});
//         }

//         else{
//             res.status(201).json({formId:result.rows[0].form_id,message:'Form created successfully'});
//         }
//     })

// }



async function createForm(req, res) {
    const { category_id } = req.params;
    const { form_name, form_description, organization, created_by, form_type, start_date, start_time, end_date, end_time, name, worker, plant_id } = req.body;

    try {
        const categoryQuery = `
            SELECT "name", subtitle, icon 
            FROM public.categories 
            WHERE category_id = $1
        `;
        const categoryResult = await db.query(categoryQuery, [category_id]);

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const { name: title, subtitle, icon } = categoryResult.rows[0];

        const formUIDQuery = `
            SELECT COUNT(*) 
            FROM public.forms 
            WHERE category_id = $1
        `;
        const formCountResult = await db.query(formUIDQuery, [category_id]);
        const formCount = parseInt(formCountResult.rows[0].count, 10) + 1;
        const formUID = `${title.slice(0, 3).toUpperCase()}${formCount.toString().padStart(7, '0')}`;

        const form_id = uuidv4();

        const insertFormQuery = `
            INSERT INTO public.forms (
                form_id, form_name, form_description, organization, created_by, form_type, 
                form_uid, title, subtitle, icon, start_date, start_time, 
                end_date, end_time, name, worker, category_id, plant_id
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING form_id
        `;

        const insertFormResult = await db.query(insertFormQuery, [
            form_id, form_name, form_description, organization, created_by, form_type, 
            formUID, title, subtitle, icon, start_date, start_time, 
            end_date, end_time, name, worker, category_id, plant_id
        ]);

        res.status(201).json({ formId: insertFormResult.rows[0].form_id, message: 'Form created successfully' });
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ message: 'Failed to create form' });
    }
}

async function getFormById(req,res){
    const {form_id}=req.params;
    const getFormQuery = `SELECT * FROM public.forms WHERE form_id =$1`;
    db.query(getFormQuery,[form_id],(error,result)=>{
        if(error){
            console.error('Error fetching form: ',error);
            res.status(500).json({message:'Failed to fetch form'});
        }
        if(result.rows.length===0){
            return res.status(404).json({message:'Form not found'});
        }
        else{
            res.status(200).json(result.rows[0]);
        }
    });
}


async function getAllForms(req,res){
    const getAllformsQuery =`SELECT * FROM public.forms`;
    db.query(getAllformsQuery,[],(error,result)=>{
        if(error){
            console.error('Error fetching forms:',error);
            res.status(500).json({message:'Failed to fetch forms'});
        }
        else{
            res.status(200).json(result.rows);
        }
    });
}

async function updateForm(req, res) {
    const { form_id } = req.params;
    const { form_name, organization, created_by, form_type, start_date, start_time, end_date, end_time, name, worker } = req.body;

    const updateQuery = `
        UPDATE public.forms 
        SET form_name = $1, organization = $2, created_by = $3, form_type = $4, 
        start_date = $5, start_time = $6, end_date = $7, end_time = $8, name = $9, worker = $10
        WHERE form_id = $11
        RETURNING *
    `;

    db.query(updateQuery, [form_name, organization, created_by, form_type, start_date, start_time, end_date, end_time, name, worker, form_id], (error, result) => {
        if (error) {
            console.error('Error updating form:', error);
            res.status(500).json({ message: 'Failed to update form' });
        } else {
            if (result.rows.length === 0) {
                res.status(404).json({ message: 'Form not found' });
            } else {
                res.status(200).json({ message: 'Form updated successfully', form: result.rows[0] });
            }
        }
    });
}


async function deleteForm(req,res){
const {form_id}=req.params;
const deleteFormQuery=`DELETE FROM public.forms WHERE form_id = $1 RETURNING *`;
db.query(deleteFormQuery,[form_id],(error,result)=>{
    if(error){
        console.error('Error deleting forms:',error);
        res.status(500).json({message:'Failed to delete form'});
    }
    if(result.rows.length === 0){
        res.status(404).json({message:'Form not found'});

    }
    else{
        res.status(200).json({message:'Form deleted successfully', form:result.rows[0]});
    }
})
}


// form Questions
async function createQuestion(req, res) {
    const { form_id } = req.params;
    const { question_text, question_type, options } = req.body;
    const questionId = uuidv4();

    try {
        const insertQuestionQuery = `
            INSERT INTO public.questions (question_id, form_id, question_text, question_type) 
            VALUES ($1, $2, $3, $4)
            RETURNING question_id
        `;

        const questionResult = await db.query(insertQuestionQuery, [questionId, form_id, question_text, question_type]);
        const insertedQuestionId = questionResult.rows[0].question_id;

        if ((question_type === 'multiple_choice' || question_type === 'radio_button') && Array.isArray(options)) {
            const insertOptionsQuery = `
                INSERT INTO public.options (option_id, question_id, option_text) 
                VALUES ($1, $2, $3)
            `;

            const optionsPromises = options.map(async (optionText) => {
                const optionId = uuidv4();
                await db.query(insertOptionsQuery, [optionId, insertedQuestionId, optionText]);
            });

            await Promise.all(optionsPromises);
        } else if (question_type === 'yes_no') {
            const insertYesOptionQuery = `
                INSERT INTO public.options (option_id, question_id, option_text) 
                VALUES ($1, $2, $3)
            `;
            const insertNoOptionQuery = `
                INSERT INTO public.options (option_id, question_id, option_text) 
                VALUES ($1, $2, $3)
            `;

            const yesOptionId = uuidv4();
            const noOptionId = uuidv4();

            await db.query(insertYesOptionQuery, [yesOptionId, insertedQuestionId, 'Yes']);
            await db.query(insertNoOptionQuery, [noOptionId, insertedQuestionId, 'No']);
        }

        res.status(201).json({ questionId: insertedQuestionId, message: 'Question created successfully' });
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ message: 'Failed to create question' });
    }
}



async function updateQuestion(req, res) {
    const questionId = req.params.question_id;
    const { question_text, question_type, options } = req.body;

    const updateQuery = `
        UPDATE public.questions 
        SET question_text = $1, question_type = $2 
        WHERE question_id = $3
    `;

    try {
        // Update the question text and type
        await db.query(updateQuery, [question_text, question_type, questionId]);

        if (question_type === 'multiple_choice' && Array.isArray(options)) {
            // Delete existing options
            await db.query(`DELETE FROM public.options WHERE question_id = $1`, [questionId]);

            // Insert new options
            const insertOptionsQuery = `
                INSERT INTO public.options (option_id, question_id, option_text) 
                VALUES ($1, $2, $3)
            `;
            const promises = options.map(optionText => {
                const option_id = uuidv4();
                return db.query(insertOptionsQuery, [option_id, questionId, optionText]);
            });

            await Promise.all(promises);
        }

        res.status(200).json({ message: 'Question updated successfully' });
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ message: 'Failed to update question' });
    }
}


async function deleteQuestion(req,res){
    const questionId = req.params.question_id;
    const deleteQuestionQuery = `DELETE FROM questions WHERE question_id = $1`;
    db.query(deleteQuestionQuery,[questionId],(error)=>{
        if(error){
            console.error('Error deleting question:',error);
            res.status(500).json({message:'Failed to delete question'});
        }
        else{
            res.status(200).json({message:'Question deleted successfully'});
        }
    })
}


async function getQuestionByFormId(req, res) {
    const { form_id } = req.params;
    const getQuestionQuery = `SELECT * FROM public.questions WHERE form_id = $1`;

    try {
        const result = await db.query(getQuestionQuery, [form_id]);
        const questions = result.rows;
        
        res.status(200).json({ questions });
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({ message: 'Failed to get questions' });
    }
}

module.exports={
    //category
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getAllCategories,

    //forms queries
    createForm,
    getFormById,
    getAllForms,
    updateForm,
    deleteForm,

    //form questions
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionByFormId,
}

