const db = require('../db');


// GENERATES UNIQUE ID
function generateId() {
    const IdLength = 10;
    let Id = '';
  
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  
    for (let i = 0; i < IdLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      Id += characters.charAt(randomIndex);
    }
    return Id;
  }


// POST ANSWERS

// works right but not optimized
// function postAns(req, res) {
//   const user_id = req.params.user_id;
//   const answers = req.body.answers; 

//   if (!Array.isArray(answers) || answers.length === 0) {
//     return res.status(400).json({ message: 'No answers provided' });
//   }

//   const validateOptionQuery = `
//     SELECT option_id, option_text
//     FROM public.options
//     WHERE option_id = $1 AND question_id = $2
//   `;

//   const insertAnsQuery = `
//     INSERT INTO public.answers (answer_id, question_id, answer_text, selected_option_id, user_id)
//     VALUES ($1, $2, $3, $4, $5)
//   `;

//   const processAnswer = (answer, callback) => {
//     const answer_id = generateId();
//     const { question_id, answer_text, selected_option_id } = answer;

//     if (selected_option_id) {
     
//       db.query(validateOptionQuery, [selected_option_id, question_id], (validateError, validateResult) => {
//         if (validateError) {
//           console.error(validateError);
//           return callback({ status: 500, message: 'Error while validating option', error: validateError });
//         }

//         if (validateResult.rows.length === 0) {
//           return callback({ status: 400, message: 'Invalid selected_option_id for the given question_id' });
//         }

//         const option_text = validateResult.rows[0].option_text;

//         // objective ans
//         insertAnswer(answer_id, question_id, option_text, selected_option_id, user_id, callback);
//       });
//     } else {
//       // subjective ans
//       insertAnswer(answer_id, question_id, answer_text, null, user_id, callback);
//     }
//   };

//   const insertAnswer = (answer_id, question_id, answer_text, selected_option_id, user_id, callback) => {
//     db.query(insertAnsQuery, [answer_id, question_id, answer_text, selected_option_id, user_id], (insertError) => {
//       if (insertError) {
//         console.error(insertError);
//         return callback({ status: 500, message: 'Error while inserting data', error: insertError });
//       }

//         callback(null, { status: 200, message: 'Answer inserted successfully'});
  
//     });
//   };

 
//   let responses = [];
//   let errorOccurred = false;

//   const processNextAnswer = (index) => {
//     if (index >= answers.length || errorOccurred) {
//       if (errorOccurred) {
//         return res.status(responses[0].status).json({ message: responses[0].message, error: responses[0].error });
//       } else {
//         return res.status(200).json({ message: 'All answers inserted successfully', results: responses });
//       }
//     }

//     processAnswer(answers[index], (error, response) => {
//       if (error) {
//         errorOccurred = true;
//         responses = [error];
//       } else {
//         responses.push(response);
//       }

//       processNextAnswer(index + 1);
//     });
//   };

//   processNextAnswer(0);
// }

async function postAns(req, res) {
  const user_id = req.params.user_id;
  const answers = req.body.answers;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'No answers provided' });
  }

  const validateOptionQuery = `
    SELECT option_id, option_text
    FROM public.options
    WHERE option_id = $1 AND question_id = $2
  `;

  const insertAnsQuery = `
    INSERT INTO public.answers (answer_id, question_id, answer_text, selected_option_id, user_id)
    VALUES ($1, $2, $3, $4, $5)
  `;

  try {    
    const validationPromises = answers.map(answer => {
      if (answer.selected_option_id) {
        return db.query(validateOptionQuery, [answer.selected_option_id, answer.question_id])
          .then(validateResult => {
            if (validateResult.rows.length === 0) {
              throw new Error(`Invalid selected_option_id ${answer.selected_option_id} for question_id ${answer.question_id}`);
            }
            return { ...answer, option_text: validateResult.rows[0].option_text };
          });
      }
      return Promise.resolve(answer);
    });

    const validatedAnswers = await Promise.all(validationPromises);

    // Insert answers
    const insertPromises = validatedAnswers.map(answer => {
      const answer_id = generateId();
      const { question_id, answer_text, selected_option_id, option_text } = answer;

      const finalAnswerText = selected_option_id ? option_text : answer_text;
      return db.query(insertAnsQuery, [answer_id, question_id, finalAnswerText, selected_option_id, user_id]);
    });

    await Promise.all(insertPromises);

    res.status(200).json({ message: 'All answers inserted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing answers', error: error.message });
  }
};


module.exports = {
    postAns
}  