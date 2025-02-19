const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');


async function organizationByOrganizationId(req, res) {
    const { organization_id } = req.params;
    const query = `SELECT * FROM swp.organizations WHERE organization_id = $1`;
    try {
        const result = await db.query(query, [organization_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function FormByFormId(req, res) {
    const { form_id } = req.params;

    const client = await db.connect();

    try {
        const queryForm = `
        SELECT *
        FROM swp.forms WHERE form_id = $1`;
        const valuesForm = [form_id];
        const resultForm = await client.query(queryForm, valuesForm);

        if (resultForm.rows.length === 0) {
        return res.status(404).json({ error: 'Form not found' });
        }

        const form = resultForm.rows[0];

        const queryQuestions = `
        SELECT *
        FROM swp.questions WHERE form_id = $1`;
        const valuesQuestions = [form_id];
        const resultQuestions = await client.query(queryQuestions, valuesQuestions);

        const questions = resultQuestions.rows;

        for (const question of questions) {
        const queryOptions = `
            SELECT *
            FROM swp.options WHERE question_id = $1`;
        const valuesOptions = [question.question_id];
        const resultOptions = await client.query(queryOptions, valuesOptions);

        question.options = resultOptions.rows;
        }

        form.questions = questions;

        res.status(200).json(form);
    } catch (error) {
        console.error('Error fetching form data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}

async function plantsByOrganizationId(req, res) {
    const { organization_id } = req.params;
    const query = `SELECT * FROM swp.plants WHERE organization_id = $1`;
    try {
        const result = await db.query(query, [organization_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plants not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function departmentsByPlantId(req, res) {
    const { plant_id } = req.params;
    const query = `
        SELECT d.department_id, d.name, d.plant_id, COUNT(u.user_id) AS total_users
        FROM swp.departments d
        LEFT JOIN swp.users u ON d.department_id = u.department_id
        WHERE d.plant_id = $1
        GROUP BY d.department_id, d.name, d.plant_id;
    `;
    
    try {
        const result = await db.query(query, [plant_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Departments not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function userByDepartmentId(req, res) {
    const { department_id } = req.params;
    const query = `
        SELECT u.*, r.name as role_name
        FROM swp.users u
        JOIN swp.roles r ON u.role_id = r.role_id
        WHERE u.department_id = $1`;
    try {
        const result = await db.query(query, [department_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No User Found for Selected Department' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function usersByOrganizationId(req, res) {
    const { organization_id } = req.params;
    const query = `SELECT * FROM swp.users WHERE organization_id = $1`;
    try {
        const result = await db.query(query, [organization_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Users not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function CategoriesByDepartmentId(req, res) {
    const { department_id } = req.params;
    const query = `SELECT * FROM swp.categories WHERE department_id = $1`;
    try {
        const result = await db.query(query, [department_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categories not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function previousFormsByCategories(req, res) {
    const { category_id } = req.params;
    const query = `SELECT * FROM swp.forms WHERE category_id = $1`;
    try {
        const result = await db.query(query, [category_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Forms not found' });
        }
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function addPlantsInOrganization(req, res) {
    const { organization_id } = req.params;
    const { name, location } = req.body;
    const plant_id = uuidv4();
    const created_at = new Date().toISOString();  // Current date and time in ISO 8601 format
    
    const queryOne = `SELECT 1 FROM swp.organizations WHERE organization_id = $1`;
    const queryTwo = `
        INSERT INTO swp.plants (plant_id, organization_id, name, location, created_at) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING plant_id`;

    try {
        const resultOne = await db.query(queryOne, [organization_id]);
        if (resultOne.rowCount === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const resultTwo = await db.query(queryTwo, [plant_id, organization_id, name, location, created_at]);
        const newPlantId = resultTwo.rows[0].plant_id;

        return res.status(201).json({ plant_id: newPlantId });
    } catch (error) {
        console.error('Error adding plant:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addDepartmentInPlants(req, res) {
    const { plant_id } = req.params;
    const { name } = req.body;
    const department_id = uuidv4();
    const created_at = new Date().toISOString();  // Current date and time in ISO 8601 format
    
    const queryOne = `SELECT 1 FROM swp.plants WHERE plant_id = $1`;
    const queryTwo = `
        INSERT INTO departments (department_id ,plant_id, name, created_at) 
        VALUES ($1, $2, $3, $4)
        RETURNING department_id`;

    try {
        const resultOne = await db.query(queryOne, [plant_id]);
        if (resultOne.rowCount === 0) {
            return res.status(404).json({ error: 'Plant not found' });
        }

        const resultTwo = await db.query(queryTwo, [department_id ,plant_id, name, created_at]);
        const newDepartmentId = resultTwo.rows[0].department_id;

        return res.status(201).json({ department_id: newDepartmentId });
    } catch (error) {
        console.error('Error adding Department:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addCategory(req, res) {
    const { department_id } = req.params;
    const { name, icon, form_type, subtitle } = req.body;
    const category_id = uuidv4();
    const created_at = new Date().toISOString();  // Current date and time in ISO 8601 format
    
    const query = `
        INSERT INTO swp.categories (category_id, created_at, department_id, name, icon, form_type, subtitle) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING category_id`;

    try {
        const result = await db.query(query, [category_id, created_at, department_id, name, icon, form_type, subtitle]);
        const newCategoryId = result.rows[0].category_id;
        
        return res.status(201).json({ category_id: newCategoryId });
    } catch (error) {
        console.error('Error adding Category:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function updatePlantByPlantId(req, res) {
    const { plant_id } = req.params;
    const { name, location } = req.body;

    const queryUpdate = `
        UPDATE swp.plants 
        SET name = $2, location = $3 
        WHERE plant_id = $1 
        RETURNING plant_id, name, location, organization_id, created_at`;

    try {
        const resultUpdate = await db.query(queryUpdate, [plant_id, name, location]);
        const updatedPlant = resultUpdate.rows[0];

        if (!updatedPlant) {
            return res.status(404).json({ error: 'Plant not found' });
        }

        return res.status(200).json(updatedPlant);
    } catch (error) {
        console.error('Error updating plant:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addFormData(req, res) {
  const { form_name, form_description, created_by, category_id, plant_id, Questions } = req.body;

  const form_id = uuidv4();
  const created_at = new Date().toISOString();

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Insert into forms table
    const queryForm = `
      INSERT INTO swp.forms (form_id, form_name, form_description, created_by, category_id, plant_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING form_id`;
    const valuesForm = [form_id, form_name, form_description, created_by, category_id, plant_id, created_at];

    const resultForm = await client.query(queryForm, valuesForm);
    const newFormId = resultForm.rows[0].form_id;

    // Insert into questions table
    for (const question of Questions) {
      const question_id = uuidv4();
      const { Question, QuestionType } = question;
      const created_at_question = new Date().toISOString();

      const queryQuestion = `
        INSERT INTO swp.questions (question_id, question_text, question_type, form_id, created_at)
        VALUES ($1, $2, $3, $4, $5)`;
      const valuesQuestion = [question_id, Question, QuestionType, newFormId, created_at_question];

      await client.query(queryQuestion, valuesQuestion);

      // Insert into options table if Option exists
      if (question.Option) {
        const options = question.Option.split(',').map(option => option.trim());
        for (const option of options) {
          const option_id = uuidv4();
          const created_at_option = new Date().toISOString();

          const queryOption = `
            INSERT INTO swp.options (option_id, option_text, question_id, created_at)
            VALUES ($1, $2, $3, $4)`;
          const valuesOption = [option_id, option, question_id, created_at_option];

          await client.query(queryOption, valuesOption);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ form_id: newFormId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding form data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
}

async function userRoles(req, res) {
    const query = `SELECT * FROM swp.roles WHERE name != 'SuperAdmin';`;
    try {
        const data = await db.query(query);
        const newdata = data.rows;

        if (!newdata) {
            return res.status(404).json({ error: 'Data not found' });
        }

        return res.status(200).json(newdata);
    } catch (error) {
        console.error('Error getting Data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function updateDepartmentByDepartmentId(req, res) {
    const { department_id } = req.params;
    const { name } = req.body;

    const queryUpdate = `
        UPDATE swp.departments 
        SET name = $2
        WHERE department_id = $1 
        RETURNING department_id ,plant_id, name, created_at`;

    try {
        const resultUpdate = await db.query(queryUpdate, [department_id, name]);
        const updatedDepartment = resultUpdate.rows[0];

        if (!updatedDepartment) {
            return res.status(404).json({ error: 'Department not found' });
        }

        return res.status(200).json(updatedDepartment);
    } catch (error) {
        console.error('Error updating department:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function deletePlantByPlantId(req, res) {
    const { plant_id } = req.params;

    const queryDelete = `
        DELETE FROM swp.plants 
        WHERE plant_id = $1 
        RETURNING plant_id`;

    try {
        const resultDelete = await db.query(queryDelete, [plant_id]);
        const deletedPlant = resultDelete.rows[0];

        if (!deletedPlant) {
            return res.status(404).json({ error: 'Plant not found' });
        }

        return res.status(200).json({ message: 'Plant deleted successfully', plant_id: deletedPlant.plant_id });
    } catch (error) {
        console.error('Error deleting plant:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function deleteFormByFormId(req, res) {
    const { form_id } = req.params;

    const client = await db.connect();

  try {
    await client.query('BEGIN');

    const deleteOptionsQuery = `
      DELETE FROM swp.options
      WHERE question_id IN (
        SELECT question_id
        FROM swp.questions
        WHERE form_id = $1
      )`;
    await client.query(deleteOptionsQuery, [form_id]);

    const deleteQuestionsQuery = `
      DELETE FROM swp.questions
      WHERE form_id = $1`;
    await client.query(deleteQuestionsQuery, [form_id]);

    const deleteFormQuery = `
      DELETE FROM swp.forms
      WHERE form_id = $1`;
    await client.query(deleteFormQuery, [form_id]);

    await client.query('COMMIT');
    res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Internal Server Error' });
    } finally {
    client.release();
    }
}

async function deleteUser(req, res) {
    const { user_id } = req.params;

    const queryDelete = `
        DELETE FROM swp.users 
        WHERE user_id = $1 
        RETURNING user_id`;

    try {
        const resultDelete = await db.query(queryDelete, [user_id]);
        const deletedUser = resultDelete.rows[0];

        if (!deletedUser) {
            return res.status(404).json({ error: 'user not found' });
        }

        return res.status(200).json({ message: 'User deleted successfully', User_id: deletedUser.user_id });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function deleteDepartmentByDepartmentId(req, res) {
    const { department_id } = req.params;

    const queryDelete = `
        DELETE FROM swp.departments 
        WHERE department_id = $1 
        RETURNING department_id`;

    try {
        const resultDelete = await db.query(queryDelete, [department_id]);
        const deletedDepartment = resultDelete.rows[0];

        if (!deletedDepartment) {
            return res.status(404).json({ error: 'Department not found' });
        }

        return res.status(200).json({ message: 'Department deleted successfully', department_id: deletedDepartment.department_id });
    } catch (error) {
        console.error('Error deleting department:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addUser(req, res) {
    const { personal_email, first_name, last_name, role_id, department_id, contact_no, password } = req.body;

    if (!personal_email || !first_name || !last_name || !role_id || !department_id || !contact_no || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const user_id = uuidv4();
    const created_at = new Date().toISOString();
    const verified = false;
    const block = false;
    const username = personal_email;

    try {
        const password_hash = await bcrypt.hash(password, 10);

        // Query to find plant_id using department_id
        const queryDepartment = `
            SELECT plant_id FROM swp.departments WHERE department_id = $1`;
        const resultDepartment = await db.query(queryDepartment, [department_id]);

        if (resultDepartment.rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const plant_id = resultDepartment.rows[0].plant_id;

        // Query to find organization_id using plant_id
        const queryPlant = `
            SELECT organization_id FROM swp.plants WHERE plant_id = $1`;
        const resultPlant = await db.query(queryPlant, [plant_id]);

        if (resultPlant.rows.length === 0) {
            return res.status(404).json({ error: 'Plant not found' });
        }

        const organization_id = resultPlant.rows[0].organization_id;
        const company_email = personal_email; // Assuming company_email is the same as personal_email

        // Insertion query for users table
        const queryInsert = `
            INSERT INTO swp.users (user_id, username, personal_email, password_hash, first_name, last_name, role_id, organization_id, department_id, created_at, company_email, verified, block, contact_no) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING user_id`;

        const values = [user_id, username, personal_email, password_hash, first_name, last_name, role_id, organization_id, department_id, created_at, company_email, verified, block, contact_no];

        const resultInsert = await db.query(queryInsert, values);
        const newUser = resultInsert.rows[0];

        if (!newUser) {
            return res.status(500).json({ error: 'User could not be added' });
        }

        return res.status(201).json(newUser);
    } catch (error) {
        console.error('Error adding user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function updateUser(req, res) {
    const { user_id } = req.params; // Extract user_id from URL parameters
    const { personal_email, first_name, last_name, role_id, department_id, contact_no,password } = req.body;

    if (!user_id || !personal_email || !first_name || !last_name || !role_id || !department_id || !contact_no) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const username = personal_email;

    try {
        // Update query for users table
        const queryUpdate = `
            UPDATE swp.users
            SET username = $2,
                personal_email = $3,
                first_name = $4,
                last_name = $5,
                role_id = $6,
                department_id = $7,
                contact_no = $8
            WHERE user_id = $1
            RETURNING user_id`;

        const values = [user_id, username, personal_email, first_name, last_name, role_id, department_id, contact_no];

        const resultUpdate = await db.query(queryUpdate, values);
        const updatedUser = resultUpdate.rows[0];

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    organizationByOrganizationId,
    FormByFormId,
    plantsByOrganizationId,
    departmentsByPlantId,
    userByDepartmentId,
    usersByOrganizationId,
    CategoriesByDepartmentId,
    previousFormsByCategories,
    addPlantsInOrganization,
    addDepartmentInPlants,
    updatePlantByPlantId,
    updateDepartmentByDepartmentId,
    deletePlantByPlantId,
    deleteFormByFormId,
    deleteDepartmentByDepartmentId,
    userRoles,
    addFormData,
    addUser,
    updateUser,
    addCategory,
    deleteUser
}