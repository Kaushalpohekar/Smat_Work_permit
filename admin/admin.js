const db = require('../db');
const { v4: uuidv4 } = require('uuid');

function sanitizeInput(input) {
    return input.replace(/[^\w\s.-]/gi, '');
}

async function organizationByOrganizationId(req, res) {
    const { organization_id } = req.params;
    const query = `SELECT * FROM organizations WHERE organization_id = $1`;
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

async function plantsByOrganizationId(req, res) {
    const { organization_id } = req.params;
    const query = `SELECT * FROM plants WHERE organization_id = $1`;
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
        FROM departments d
        LEFT JOIN users u ON d.department_id = u.department_id
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
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
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
    const query = `SELECT * FROM users WHERE organization_id = $1`;
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
    const query = `SELECT * FROM categories WHERE department_id = $1`;
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
    const query = `SELECT * FROM forms WHERE category_id = $1`;
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
    
    const queryOne = `SELECT 1 FROM organizations WHERE organization_id = $1`;
    const queryTwo = `
        INSERT INTO plants (plant_id, organization_id, name, location, created_at) 
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
    
    const queryOne = `SELECT 1 FROM plants WHERE plant_id = $1`;
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

async function updatePlantByPlantId(req, res) {
    const { plant_id } = req.params;
    const { name, location } = req.body;

    const queryUpdate = `
        UPDATE plants 
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
      INSERT INTO forms (form_id, form_name, form_description, created_by, category_id, plant_id, created_at)
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
        INSERT INTO questions (question_id, question_text, question_type, form_id, created_at)
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
            INSERT INTO options (option_id, option_text, question_id, created_at)
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
    const query = `SELECT * FROM roles WHERE name != 'SuperAdmin';`;
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
        UPDATE departments 
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
        DELETE FROM plants 
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

async function deleteDepartmentByDepartmentId(req, res) {
    const { department_id } = req.params;

    const queryDelete = `
        DELETE FROM departments 
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

module.exports = {
    organizationByOrganizationId,
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
    deleteDepartmentByDepartmentId,
    userRoles,
    addFormData    
}