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
// function postAns(req,res){
//     const answer_id = generateId();
//     const { question_id, answer_text, selected_option_id, user_id } = req.body;
//     const insertAnsQuery  = `INSERT INTO public.answers (answer_id, question_id, answer_text, selected_option_id, user_id)
//                                VALUES ($1, $2, $3, $4, $5)`;
  
//       db.query(insertAnsQuery , [answer_id, question_id, answer_text, selected_option_id, user_id], (insertError , insertResult) =>{
//           if(insertError){
//             console.log(insertError);
//             return res.status(402).json({message:'Error while inserting data',insertError});
//           }
//           return res.status(200).json({message:'Answer inserted successfully',result: insertResult});
//         });
      
   
//   }

function postAns(req, res){
    const answer_id = generateId();
    const { question_id, answer_text, selected_option_id, user_id } = req.body;
  
    const insertAnsQuery = `
      INSERT INTO public.answers (answer_id, question_id, answer_text, selected_option_id, user_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
  
    const selectAnsQuery = `
      SELECT a.*, o.option_text
      FROM public.answers a
      JOIN public.options o ON a.selected_option_id = o.option_id
      WHERE a.answer_id = $1
    `;
  
    // Insert the answer into the database
    db.query(insertAnsQuery, [answer_id, question_id, answer_text, selected_option_id, user_id], (insertError) => {
      if (insertError) {
        console.error(insertError);
        return res.status(402).json({ message: 'Error while inserting data', insertError });
      }
  
      // Retrieve the inserted answer along with the option text
      db.query(selectAnsQuery, [answer_id], (selectError, selectResult) => {
        if (selectError) {
          console.error(selectError);
          return res.status(500).json({ message: 'Error while retrieving data', selectError });
        }
  
        return res.status(200).json({ message: 'Answer inserted successfully', result: selectResult.rows[0] });
      });
    });
  };


module.exports = {
    postAns
}  