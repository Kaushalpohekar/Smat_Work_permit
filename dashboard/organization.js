const db = require('../db');
const { v4: uuidv4 } = require('uuid');



async function createCategory(req,res){
const {title,subtitle,icon}=req.body;
const category_id = uuidv4();

const CreateCategoryQuery = `INSERT INTO public.category (title,subtitle,icon,category_id) VALUES ($1,$2,$3,$4) RETURNING category_id`

db.query(CreateCategoryQuery,[title,subtitle,icon,category_id],(error,result)=>{
    if(error){
        console.error('Error creating category:',error);
        res.status(500).json({message:'Failed to create category'});
    }

    else{
        res.status(201).json({categoryId:result.rows[0].category_id,message:'Category created successfully'});
    }
})
}

async function updateCateogry(req,res){
    const category_id =req.params.category_id;
    const {title, subtitle, icon}=req.body;
    const UpdateCategoryQuery=`UPDATE public.category SET title = $1, subtitle = $2 , icon = $3 WHERE category_id =$4`;

    db.query(UpdateCategoryQuery,[title,subtitle,icon,category_id],(error,result)=>{
        if(error){
            console.error('Error updating category:',error);
            res.status(500).json({message:'Failed to update category'});
        }
        if(result.rowCount === 0){
            return res.status(404).json({message:'Category not found'});
        }
        else{
            res.status(200).json({message:'Category updated successfully'});
        }
    })
}

async function deleteCategory(req,res){
    const category_id = req.params.category_id;
    const deleteCategoryQuery = `DELETE FROM public.category WHERE category_id = $1`;
    db.query(deleteCategoryQuery,[category_id],(error,result)=>{
        if(error){
            console.error('Error deleteing category:',error);
            res.status(500).json({message:'Failed to delete category'});
        }
        if(result.rowCount === 0){
            return res.status(404).json({message:'Category not found'})

        }
        else{
            res.status(200).json({message:'Category deleted successfully'});
        }
    })
}


async function getCategoryById(req,res){
    const category_id=req.params.category_id;

    const getCategoryQuery=`SELECT * FROM public.category WHERE category_id = $1`;
    db.query(getCategoryQuery,[category_id],(error,result)=>{
        if(error){
            console.error('Error fetching category:',error);
            res.status(500).json({message:'Failed to fetch category'});
        }
        if(result.rows.length === 0){
            return res.status(404).json({message:'Category not found'});
        }
        else{
            res.status(200).json(result.rows[0]);
        }
    })
}


async function getAllCategories(req,res){
const getAllCategoriesQuery=`SELECT * FROM public.category`;
db.query(getAllCategoriesQuery,[],(error,result)=>{
    if(error){
        console.error('Error fetching categories:',error);
        res.status(500).json({message:'Failed to fetch categories'});
    }
    else{
        res.status(200).json(result.rows);
    }
})
}





//forms queries

async function createForm(req,res){
    const { category_id }=req.params;
    const {form_name,organization, created_by,form_type,start_date,start_time,end_date,end_time,name,worker}=req.body;

    const categoryQuery=`SELECT title, subtitle, icon FROM public.category WHERE category_id = $1`;

    const categoryResult = await db.query(categoryQuery,[category_id]);

    if(categoryResult.rows.length === 0){
        return res.status(404).json({message:'category not found'});
    }

    const {title, subtitle, icon}=categoryResult.rows[0];

    // Generate formUID
    const formUIDQuery = `SELECT COUNT(*) FROM public.forms WHERE category_id = $1`;
    const formCountResult = await db.query(formUIDQuery, [category_id]);
    const formCount = formCountResult.rows[0].count + 1;
    const formUID = `${title.slice(0, 3).toUpperCase()}${formCount.toString().padStart(7, '0')}`;

    const formId = uuidv4();

    // const insertFormQuery = `
    //          INSERT INTO public.forms (form_name, organization, created_by, form_type, form_uid, title, subtitle, icon, start_date, start_time, end_date, end_time, name, worker, category_id) 
    //          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    //          RETURNING form_id`;
    const insertFormQuery = `
    INSERT INTO public.forms (form_name,organization, created_by, form_type, form_uid, title, subtitle, icon, start_date, start_time, end_date, end_time, "name", worker, category_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING form_id`;

    db.query(insertFormQuery,[form_name,organization, created_by, form_type, formUID, title, subtitle, icon, start_date, start_time, end_date, end_time, name, worker, category_id],(error,result)=>{
        if(error){
            console.error('Error creating form:',error);
            res.status(500).json({message:'Failed to create form'});
        }

        else{
            res.status(201).json({formId:result.rows[0].form_id,message:'Form created successfully'});
        }
    })

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

async function updateform(req,res){
    const {form_id}=req.params;
    const {form_name, organization, created_by, form_type, start_date, start_time, end_date, end_time, name, worker } =req.body;

    const updateQuery =`UPDATE public.forms SET form_name = $1, organization = $2, created_by = $3, form_type = $4, start_date = $5, start_time = $6, end_date = $7, end_time = $8, name = $9, worker = $10
    WHERE form_id = $11
    RETURNING *`;

    db.query(updateQuery),[form_name, organization, created_by, form_type, start_date, start_time, end_date, end_time, name, worker, form_id],(error,result)=>{
        if(error){
            console.error('Error updating forms');
            res.status(500).json({message:'Failed to update form'});
        }
        if(result.rows.length === 0){
             res.status(404).json({message:'form not found'});

        }
        else{
            res.status(200).json({message:'Form updated successfully',form:result.rows[0]});
        }
    }

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

    const insertQuestionQuery = `
        INSERT INTO questions (question_id, form_id, question_text, question_type) 
        VALUES ($1, $2, $3, $4)
        RETURNING question_id`;

    db.query(insertQuestionQuery, [questionId, form_id, question_text, question_type], (error, result) => {
        if (error) {
            console.error('Error creating question:', error);
            res.status(500).json({ message: 'Failed to create question' });
            return;
        }

        if (question_type === 'multiple_choice' && Array.isArray(options)) {
            const insertOptionsQuery = `INSERT INTO options (option_id, question_id, option_text) VALUES ($1, $2, $3)`;
            const promises = options.map(optionText => {
                const option_id = uuidv4();
                return db.query(insertOptionsQuery, [option_id, questionId, optionText]);
            });
            
            Promise.all(promises)
                .then(() => {
                    res.status(201).json({ questionId: result.rows[0].question_id, message: 'Question created successfully' });
                })
                .catch(err => {
                    console.error('Error creating question options:', err);
                    res.status(500).json({ message: 'Failed to create question options' });
                });
        } else if (question_type === 'yes_no') {
            const insertOptionsQuery = `
                INSERT INTO options (option_id, question_id, option_text) 
                VALUES ($1, $2, $3)`;

            const yesOptionId = uuidv4();
            const noOptionId = uuidv4();

            db.query(insertOptionsQuery, [yesOptionId, questionId, 'Yes'], (error) => {
                if (error) {
                    console.error('Error creating "Yes" option:', error);
                    res.status(500).json({ message: 'Failed to create "Yes" option' });
                    return;
                }
                db.query(insertOptionsQuery, [noOptionId, questionId, 'No'], (error) => {
                    if (error) {
                        console.error('Error creating "No" option:', error);
                        res.status(500).json({ message: 'Failed to create "No" option' });
                        return;
                    }
                    res.status(201).json({ questionId: result.rows[0].question_id, message: 'Question created successfully' });
                });
            });
        } else if (question_type === 'radio_button' && Array.isArray(options)) {
            const insertOptionsQuery = `INSERT INTO options (option_id, question_id, option_text) VALUES ($1, $2, $3)`;
            const promises = options.map(optionText => {
                const option_id = uuidv4();
                return db.query(insertOptionsQuery, [option_id, questionId, optionText]);
            });
            
            Promise.all(promises)
                .then(() => {
                    res.status(201).json({ questionId: result.rows[0].question_id, message: 'Question created successfully' });
                })
                .catch(err => {
                    console.error('Error creating question options:', err);
                    res.status(500).json({ message: 'Failed to create question options' });
                });
        } else {
            res.status(201).json({ questionId: result.rows[0].question_id, message: 'Question created successfully' });
        }
    });
}



async function updateQuestion(req, res) {
    const questionId = req.params.question_id;
    const { question_text, question_type, options } = req.body;

    const updateQuery = `UPDATE questions SET question_text = $1, question_type = $2 WHERE question_id = $3`;
    db.query(updateQuery, [question_text, question_type, questionId], async (error, result) => {
        try {
            if (error) {
                console.error('Error updating question:', error);
                res.status(500).json({ message: 'Failed to update question' });
                return;
            }
            
            if (question_type === 'multiple_choice' && Array.isArray(options)) {
                await db.query(`DELETE FROM options WHERE question_id = $1`, [questionId]);

                const insertOptionsQuery = `INSERT INTO options (option_id, question_id, option_text) VALUES ($1, $2, $3)`;
                const promises = options.map(optionText => {
                    const option_id = uuidv4();
                    return db.query(insertOptionsQuery, [option_id, questionId, optionText]);
                });

                await Promise.all(promises);
            }

            res.status(200).json({ message: 'Question updated successfully' });
        } catch (err) {
            console.error('Error updating question:', err);
            res.status(500).json({ message: 'Failed to update question' });
        }
    });
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


async function getQuestionByFormId(req,res){
    const {form_id} = req.params;
    const getQuestionQuery=`SELECT * FROM questions WHERE form_id = $1`;
    db.query(getQuestionQuery,[form_id],(error,result)=>{
        if(error){
            console.error('Error fetching questions:',error);
            res.status(500).json({message:'Failed to get questions'});
        }
        else{
            const questions = result.rows;
            res.status(200).json({questions});
        }

    })
}

module.exports={
    //category
    createCategory,
    updateCateogry,
    deleteCategory,
    getCategoryById,
    getAllCategories,

    //forms queries
    createForm,
    getFormById,
    getAllForms,
    updateform,
    deleteForm,

    //form questions
    createQuestion,
    updateQuestion,
    deleteQuestion,
    getQuestionByFormId,
}