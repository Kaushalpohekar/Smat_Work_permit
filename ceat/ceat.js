const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const bcrypt = require('bcrypt');

async function insertData(req, res) {
    const { data } = req.body;
    const submission_id = uuidv4();
    const status = {
        qaAuditor: data.qaAuditor,
        auditorName: data.auditorName,
        qaShiftInCharge: data.qaShiftInCharge,
        operationsShiftInCharge: data.operationsShiftInCharge
    }

    const dataForMail = {
        formName: "QUALITY ASSURANCE PROCESS AUDIT CHECK-SHEET - BUILDING",
        process: data.process,
        shift: data.shift,
        date: data.date,
        associateName: data.associateName
    };

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const InsertDataQuery = `
            INSERT INTO audit_submissions (submission_id, submission_data, status)
            VALUES ($1, $2, $3);
        `;
        await client.query(InsertDataQuery, [submission_id, data, status]);

        await client.query('COMMIT');
        fetchEmailAddressesAndSendMails(Object.values(status), dataForMail);

        res.status(201).json({ message: 'Data inserted successfully', submission_id });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during data insertion:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}

async function insertDataBct(req, res) {
    try {
        const { data } = req.body;
        console.log('Request Body:', req.body); // Log the entire request body

        const submission_id = uuidv4();
        const status = {
            checkTyreMadeBy: data.checkTyreMadeBy
        }

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const InsertDataQuery = `
                INSERT INTO bct_submissions (submission_id, submission_data, status)
                VALUES ($1, $2, $3);
            `;
            await client.query(InsertDataQuery, [submission_id, data, status]);

            await client.query('COMMIT');
            //fetchEmailAddressesAndSendMails(Object.values(status), dataForMail);

            res.status(201).json({ message: 'Data inserted successfully', submission_id });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error during data insertion:', error);
            res.status(500).json({ message: 'Internal server error' });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in insertDataBct:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function getAllSubmissions(req, res) {
    const client = await db.connect();

    try {
        const query = 'SELECT submission_id FROM audit_submissions;';
        const result = await client.query(query);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No submissions found' });
        } else {
            res.status(200).json(result.rows);
        }

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function getAllSubmissionsByUser(req, res) {
    const client = await db.connect();
    const userId = req.params.user_id;  // Assume req.dna.user_id contains the user_id

    try {
        const query = 'SELECT submission_id, submission_data FROM audit_submissions;';
        const result = await client.query(query);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No submissions found' });
            return;
        }

        // Filter submissions to find ones containing the user_id
        const filteredSubmissions = result.rows.filter(row => {
            const submissionData = row.submission_data;
            if (submissionData && typeof submissionData === 'object') {
                return Object.values(submissionData).some(value => value === userId);
            }
            return false;
        });

        if (filteredSubmissions.length === 0) {
            res.status(404).json({ message: 'No submissions found for the user' });
        } else {
            // Extract specific fields from the submission_data
            const extractedData = filteredSubmissions.map(row => {
                const submissionData = row.submission_data;
                return {
                    submission_id: row.submission_id,
                    process: submissionData.process,
                    date: submissionData.date,
                    time: submissionData.time,
                    shift: submissionData.shift,
                    associate: submissionData.associate
                };
            });

            res.status(200).json(extractedData);
        }

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function getSubmissionById(req, res) {
    const submission_id = req.params.submissionId;
    const client = await db.connect();

    try {
        const query = 'SELECT * FROM audit_submissions WHERE submission_id = $1;';
        const result = await client.query(query, [submission_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Submission not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function getSubmissionByIdBct(req, res) {
    const submission_id = req.params.submissionId;
    const client = await db.connect();

    try {
        const query = 'SELECT * FROM bct_submissions WHERE submission_id = $1;';
        const result = await client.query(query, [submission_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Submission not found' });
        } else {
            const formData = result.rows[0];
            const formattedData = modifyFormData(formData);
            res.status(200).json(formattedData);
        }

    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

function modifyFormData(formData) {
    const data = [
        {
          formatNo: formData.submission_data.formatNo,
          date: formData.submission_data.date,
          checkTyreMadeBy: formData.submission_data.checkTyreMadeBy,
          size: formData.submission_data.size,
          barcode: formData.submission_data.barcode,
          reasonForCheckTyre: formData.submission_data.reasonForCheckTyre,
          startTime: formData.submission_data.startTime,
          endTime: formData.submission_data.endTime,
          AvgBalancingValue: formData.submission_data.AvgBalancingValue,
          StandardDeviation: formData.submission_data.StandardDeviation,
          Comments: formData.submission_data.Comments,
          status: formData.status.checkTyreMadeBy
        },
        {
          serial: 1,
          parameter: [
            {
              value: 'IL centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.ILCenteringPosL_spec,
                  1: formData.submission_data.ILCenteringPosL_1,
                  2: formData.submission_data.ILCenteringPosL_2,
                  3: formData.submission_data.ILCenteringPosL_3,
                  Avg: formData.submission_data.ILCenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.ILCenteringPosR_spec,
                  1: formData.submission_data.ILCenteringPosR_1,
                  2: formData.submission_data.ILCenteringPosR_2,
                  3: formData.submission_data.ILCenteringPosR_3,
                  Avg: formData.submission_data.ILCenteringPosR_avg
                }
              ]
            },
            {
              value: 'IL width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.ILWidth_spec,
                  1: formData.submission_data.ILWidth_1,
                  2: formData.submission_data.ILWidth_2,
                  3: formData.submission_data.ILWidth_3,
                  Avg: formData.submission_data.ILWidth_avg
                }
              ]
            }
          ]
        },
        {
          serial: 2,
          parameter: [
            {
              value: 'Ply 1 / Cushion ply centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.Ply1CushionplycenteringPosL_spec,
                  1: formData.submission_data.Ply1CushionplycenteringPosL_1,
                  2: formData.submission_data.Ply1CushionplycenteringPosL_2,
                  3: formData.submission_data.Ply1CushionplycenteringPosL_3,
                  Avg: formData.submission_data.Ply1CushionplycenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.Ply1CushionplycenteringPosR_spec,
                  1: formData.submission_data.Ply1CushionplycenteringPosR_1,
                  2: formData.submission_data.Ply1CushionplycenteringPosR_2,
                  3: formData.submission_data.Ply1CushionplycenteringPosR_3,
                  Avg: formData.submission_data.Ply1CushionplycenteringPosR_avg
                }
              ]
            },
            {
              value: 'Ply-1/Cushion Width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.Ply1CushionWidth_spec,
                  1: formData.submission_data.Ply1CushionWidth_1,
                  2: formData.submission_data.Ply1CushionWidth_2,
                  3: formData.submission_data.Ply1CushionWidth_3,
                  Avg: formData.submission_data.Ply1CushionWidth_avg
                }
              ]
            }
          ]
        },
        {
          serial: 3,
          parameter: [{ value: 'Ply 1 angle', specification: formData.submission_data.Ply1Angle_spec, Avg: formData.submission_data.Ply1Angle_avg }]
        },
        {
          serial: 4,
          parameter: [
            {
              value: 'Ply-2 centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.Ply2CenteringPosL_spec,
                  1: formData.submission_data.Ply2CenteringPosL_1,
                  2: formData.submission_data.Ply2CenteringPosL_2,
                  3: formData.submission_data.Ply2CenteringPosL_3,
                  Avg: formData.submission_data.Ply2CenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.Ply2CenteringPosR_spec,
                  1: formData.submission_data.Ply2CenteringPosR_1,
                  2: formData.submission_data.Ply2CenteringPosR_2,
                  3: formData.submission_data.Ply2CenteringPosR_3,
                  Avg: formData.submission_data.Ply2CenteringPosR_avg
                }
              ]
            },
            {
              value: 'Ply-2 width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.Ply2Width_spec,
                  1: formData.submission_data.Ply2Width_1,
                  2: formData.submission_data.Ply2Width_2,
                  3: formData.submission_data.Ply2Width_3,
                  Avg: formData.submission_data.Ply2Width_avg
                }
              ]
            }
          ]
        },
        {
          serial: 5,
          parameter: [{ value: 'Ply 2 angle', specification: formData.submission_data.Ply2Angle_spec, Avg: formData.submission_data.Ply2Angle_avg }]
        },
        {
          serial: 6,
          parameter: [
            {
              value: 'Ply-3/Breaker centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.Ply3BreakerCenteringPosL_spec,
                  1: formData.submission_data.Ply3BreakerCenteringPosL_1,
                  2: formData.submission_data.Ply3BreakerCenteringPosL_2,
                  3: formData.submission_data.Ply3BreakerCenteringPosL_3,
                  Avg: formData.submission_data.Ply3BreakerCenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.Ply3BreakerCenteringPosR_spec,
                  1: formData.submission_data.Ply3BreakerCenteringPosR_1,
                  2: formData.submission_data.Ply3BreakerCenteringPosR_2,
                  3: formData.submission_data.Ply3BreakerCenteringPosR_3,
                  Avg: formData.submission_data.Ply3BreakerCenteringPosR_avg
                }
              ]
            },
            {
              value: 'Ply-3/Breaker width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.Ply3BreakerWidth_spec,
                  1: formData.submission_data.Ply3BreakerWidth_1,
                  2: formData.submission_data.Ply3BreakerWidth_2,
                  3: formData.submission_data.Ply3BreakerWidth_3,
                  Avg: formData.submission_data.Ply3BreakerWidth_avg
                }
              ]
            },
            { value: 'Ply 3/Breaker 1 angle', specification: formData.submission_data.Ply3BreakerAngle_spec, Avg: formData.submission_data.Ply3BreakerAngle_avg }
          ]
        },
        {
          serial: 7,
          parameter: [
            {
              value: 'Ply-4 centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.Ply4CenteringPosL_spec,
                  1: formData.submission_data.Ply4CenteringPosL_1,
                  2: formData.submission_data.Ply4CenteringPosL_2,
                  3: formData.submission_data.Ply4CenteringPosL_3,
                  Avg: formData.submission_data.Ply4CenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.Ply4CenteringPosR_spec,
                  1: formData.submission_data.Ply4CenteringPosR_1,
                  2: formData.submission_data.Ply4CenteringPosR_2,
                  3: formData.submission_data.Ply4CenteringPosR_3,
                  Avg: formData.submission_data.Ply4CenteringPosR_avg
                }
              ]
            },
            {
              value: 'Ply-4 width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.Ply4Width_spec,
                  1: formData.submission_data.Ply4Width_1,
                  2: formData.submission_data.Ply4Width_2,
                  3: formData.submission_data.Ply4Width_3,
                  Avg: formData.submission_data.Ply4Width_avg
                }
              ]
            }
          ]
        },
        {
          serial: 8,
          parameter: [{ value: 'Ply 4/Breaker 2 angle', specification: formData.submission_data.Ply4Breaker2Angle_spec, Avg: formData.submission_data.Ply4Breaker2Angle_avg }]
        },
        {
          serial: 9,
          parameter: [
            { value: 'ComponentSpotting_IL', 1: formData.submission_data.ComponentSpotting_IL },
            { value: 'ComponentSpotting_P1', 1: formData.submission_data.ComponentSpotting_P1 },
            { value: 'ComponentSpotting_P2', 1: formData.submission_data.ComponentSpotting_P2 },
            { value: 'ComponentSpotting_P3Breaker', 1: formData.submission_data.ComponentSpotting_P3Breaker },
            { value: 'ComponentSpotting_P4', 1: formData.submission_data.ComponentSpotting_P4 },
            { value: 'ComponentSpotting_TR', 1: formData.submission_data.ComponentSpotting_TR }
          ]
        },
        {
          serial: 10,
          parameter: [
            {
              value: 'Ply-1 turn up',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.Ply1TurnUpPosL_spec,
                  1: formData.submission_data.Ply1TurnUpPosL_1,
                  2: formData.submission_data.Ply1TurnUpPosL_2,
                  3: formData.submission_data.Ply1TurnUpPosL_3,
                  Avg: formData.submission_data.Ply1TurnUpPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.Ply1TurnUpPosR_spec,
                  1: formData.submission_data.Ply1TurnUpPosR_1,
                  2: formData.submission_data.Ply1TurnUpPosR_2,
                  3: formData.submission_data.Ply1TurnUpPosR_3,
                  Avg: formData.submission_data.Ply1TurnUpPosR_avg
                }
              ]
            }
          ]
        },
        {
          serial: 11,
          parameter: [
            {
              value: 'Tread centering',
              position: [
                {
                  value: 'L',
                  specification: formData.submission_data.TreadCenteringPosL_spec,
                  1: formData.submission_data.TreadCenteringPosL_1,
                  2: formData.submission_data.TreadCenteringPosL_2,
                  3: formData.submission_data.TreadCenteringPosL_3,
                  Avg: formData.submission_data.TreadCenteringPosL_avg
                },
                {
                  value: 'R',
                  specification: formData.submission_data.TreadCenteringPosR_spec,
                  1: formData.submission_data.TreadCenteringPosR_1,
                  2: formData.submission_data.TreadCenteringPosR_2,
                  3: formData.submission_data.TreadCenteringPosR_3,
                  Avg: formData.submission_data.TreadCenteringPosR_avg
                }
              ]
            },
            {
              value: 'Tread width',
              position: [
                {
                  value: '',
                  specification: formData.submission_data.TreadWidth_spec,
                  1: formData.submission_data.TreadWidth_1,
                  2: formData.submission_data.TreadWidth_2,
                  3: formData.submission_data.TreadWidth_3,
                  Avg: formData.submission_data.TreadWidth_avg
                }
              ]
            }
          ]
        },
        {
          serial: 12,
          parameter: [
            {
              value: 'TreadProfile Dist',
              1: formData.submission_data.TreadProfile_Dist_spec,
              2: formData.submission_data.TreadProfile_Dist_1,
              3: formData.submission_data.TreadProfile_Dist_2,
              Avg: formData.submission_data.TreadProfile_Dist_avg
            },
            {
              value: 'TreadProfile Spec',
              1: formData.submission_data.TreadProfile_Spec_spec,
              2: formData.submission_data.TreadProfile_Spec_1,
              3: formData.submission_data.TreadProfile_Spec_2,
              Avg: formData.submission_data.TreadProfile_Spec_avg
            },
            {
              value: 'TreadProfile Op',
              1: formData.submission_data.TreadProfile_Op_spec,
              2: formData.submission_data.TreadProfile_Op_1,
              3: formData.submission_data.TreadProfile_Op_2,
              Avg: formData.submission_data.TreadProfile_Op_avg
            },
            {
              value: 'TreadProfile NOP',
              1: formData.submission_data.TreadProfile_NOP_spec,
              2: formData.submission_data.TreadProfile_NOP_1,
              3: formData.submission_data.TreadProfile_NOP_2,
              Avg: formData.submission_data.TreadProfile_NOP_avg
            }
          ]
        },
        {
          value: 'Balancing',
          1: formData.submission_data.Balancing_1,
          2: formData.submission_data.Balancing_2,
          3: formData.submission_data.Balancing_3,
          4: formData.submission_data.Balancing_4,
          5: formData.submission_data.Balancing_5,
          6: formData.submission_data.Balancing_6,
          7: formData.submission_data.Balancing_7,
          8: formData.submission_data.Balancing_8,
          9: formData.submission_data.Balancing_9,
          10: formData.submission_data.Balancing_10
        }
      ];
    return data;
}

async function getUserName(req, res) {
    const user_id = req.params.user_id;
    const client = await db.connect();

    try {
        const query = 'SELECT first_name, last_name FROM users WHERE user_id = $1;';
        const result = await client.query(query, [user_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'User not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }

    } catch (error) {
        console.error('Error fetching user:', error);  // Corrected log message
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
}

async function approveStatus(req, res) {
    const { submissionId, userId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Fetch current status data
        const selectQuery = 'SELECT status FROM audit_submissions WHERE submission_id = $1;';
        const selectResult = await client.query(selectQuery, [submissionId]);

        if (selectResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        let currentStatus = selectResult.rows[0].status;

        if (!currentStatus || typeof currentStatus !== 'object') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid or missing status data in submission' });
        }

        // Update status for matching userId
        let updated = false;
        Object.keys(currentStatus).forEach(role => {
            if (currentStatus[role] === userId) {
                currentStatus[role] = 'approved';
                updated = true;
            }
        });

        if (!updated) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Action Already Taken!' });
        }

        // Update status in database
        const updateQuery = 'UPDATE audit_submissions SET status = $1 WHERE submission_id = $2;';
        await client.query(updateQuery, [currentStatus, submissionId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Status updated to approved successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving status:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}

async function rejectStatus(req, res) {
    const { submissionId, userId } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Fetch current status data
        const selectQuery = 'SELECT status FROM audit_submissions WHERE submission_id = $1;';
        const selectResult = await client.query(selectQuery, [submissionId]);

        if (selectResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found' });
        }

        let currentStatus = selectResult.rows[0].status;

        if (!currentStatus || typeof currentStatus !== 'object') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid or missing status data in submission' });
        }

        // Update status for matching userId
        let updated = false;
        Object.keys(currentStatus).forEach(role => {
            if (currentStatus[role] === userId) {
                currentStatus[role] = 'rejected';
                updated = true;
            }
        });

        if (!updated) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Action Already Taken!' });
        }

        // Update status in database
        const updateQuery = 'UPDATE audit_submissions SET status = $1 WHERE submission_id = $2;';
        await client.query(updateQuery, [currentStatus, submissionId]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Status updated to rejected successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error rejecting status:', error);
        res.status(500).json({ message: 'Internal server error' });

    } finally {
        client.release();
    }
}


async function fetchEmailAddressesAndSendMails(userIds, data) {
    const client = await db.connect();

    try {
        const selectEmailsQuery = `
            SELECT personal_email FROM users WHERE user_id = ANY($1::uuid[]);
        `;
        const result = await client.query(selectEmailsQuery, [userIds]);

        const emails = result.rows.map(row => row.personal_email);

        // Call function to send emails
        sendMailForApprovalRequest(emails, data);

    } catch (error) {
        console.error('Error fetching email addresses:', error);
    } finally {
        client.release();
    }
}


function sendMailForApprovalRequest(emails, data) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'donotreplysenselive@gmail.com',
            pass: 'xgcklimtlbswtzfq',
        }
    });

    const templatePath = path.join(__dirname, '../mails/request.ejs');
    fs.readFile(templatePath, 'utf8', (err, templateData) => {
        if (err) {
            console.error('Error reading email template:', err);
            return;
        }

        const compiledTemplate = ejs.compile(templateData);
        const html = compiledTemplate({ data: data });

        const mailOptions = {
            from: 'donotreplysenselive@gmail.com',
            to: emails.join(', '),
            subject: 'Request for Approval of Checklist',
            html: html,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });
    });
}

async function approveSubmissionCeat(req, res) {
  const { userId, password } = req.body;

  if (!userId || !password) {
      return res.status(400).json({ message: 'User ID, password are required.' });
  }

  const queryUser = `SELECT * FROM public.users WHERE user_id = $1`;

  try {
      const userResult = await db.query(queryUser, [userId]);

      if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User does not exist!' });
      }

      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
          return res.status(401).json({ message: 'Password does not match' });
      }

      res.status(200).json({ message: 'Password matched successfully!' });

  } catch (error) {
      console.error('Error during submission approval:', error);

      if (error.code === '23503') {
          return res.status(404).json({ message: 'User or submission not found!' });
      }

      res.status(500).json({ message: 'Internal server error' });
  }
}

async function UserSubmissionsBoth(req, res) {
  const client = await db.connect();
  const userId = req.params.user_id;  // Assume req.dna.user_id contains the user_id

  try {
      const query = 'SELECT submission_id, submission_data FROM audit_submissions where submitted_by = $1;';
      const result = await client.query(query, [userId]);

      if (result.rows.length === 0) {
          res.status(404).json({ message: 'No submissions found' });
          return;
      }


          // Extract specific fields from the submission_data
          const extractedData = filteredSubmissions.map(row => {
              const submissionData = row.submission_data;
              return {
                  submission_id: row.submission_id,
                  process: submissionData.process,
                  date: submissionData.date,
                  time: submissionData.time,
                  shift: submissionData.shift,
                  associate: submissionData.associate
              };
          });

  } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: 'Internal server error' });
  } finally {
      client.release();
  }
}

// async function getUserSubmissionsCeat(req, res) {
//   const user_id = req.params.user_id;
//   const interval = req.params.interval;

//   try {
//       // Ensure user_id and interval are provided
//       if (!user_id || !interval) {
//           return res.status(400).json({ error: 'User ID and interval are required' });
//       }

//       let intervalCondition = '';
//       let intervalValue = '';

//       switch (interval) {
//           case '1hour':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
//               intervalValue = 'Hour';
//               break;
//           case '1day':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
//               intervalValue = 'Day';
//               break;
//           case '1week':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
//               intervalValue = 'Week';
//               break;
//           case '1month':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
//               intervalValue = 'Month';
//               break;
//           case '6month':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
//               intervalValue = 'Half Year';
//               break;
//           case '12month':
//               intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
//               intervalValue = 'Full Year';
//               break;
//           default:
//               return res.status(400).json({ error: 'Invalid interval value' });
//       }

//       const userFormQuery = `
//           SELECT submission_id, submission_data, status, created_at From audit_submissions
//           WHERE submitted_by = $1 ${intervalCondition} 
//           ORDER BY created_at DESC`;

//       const result = await db.query(userFormQuery, [user_id]);

//       if (result.rows.length === 0) {
//           return res.status(404).json({ error: 'No Submissions available for the specified request' });
//       }

//       const submissionsWithDetails = result.rows.map(row => {
//           const submissionData = row.submission_data;
//           const statusData = row.status;

//           // Extract required fields from submission_data
//           const { date, time, shift, process, associateName } = submissionData;

//           // Initialize status to 'rejected' by default
//           let overallStatus = 'rejected';

//           // Check if all authorizers are approved
//           const authorizers = ['qaAuditor', 'auditorName', 'qaShiftInCharge', 'operationsShiftInCharge'];
//           const approvedCount = authorizers.filter(key => statusData[key] === 'approved').length;

//           if (approvedCount === authorizers.length) {
//               overallStatus = 'approved';
//           } else if (statusData['qaAuditor'] === 'rejected' || statusData['auditorName'] === 'rejected' ||
//               statusData['qaShiftInCharge'] === 'rejected' || statusData['operationsShiftInCharge'] === 'rejected') {
//               overallStatus = 'rejected';
//           } else {
//               // Default to 'opened' if any authorizer has not approved
//               overallStatus = 'opened';
//           }

//           return {
//               submission_id: row.submission_id,
//               date,
//               time,
//               shift,
//               process,
//               associateName,
//               overallStatus
//           };
//       });

//       res.status(200).json(submissionsWithDetails);

//   } catch (err) {
//       console.error('Error fetching user submissions:', err);
//       res.status(500).json({ error: 'Internal server error' });
//   }
// }
async function getUserSubmissionsCeat(req, res) {
  const user_id = req.params.user_id;
  const interval = req.params.interval;

  try {
      // Ensure user_id and interval are provided
      if (!user_id || !interval) {
          return res.status(400).json({ error: 'User ID and interval are required' });
      }

      let intervalCondition = '';
      let intervalValue = '';

      switch (interval) {
          case '1hour':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
              intervalValue = 'Hour';
              break;
          case '1day':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
              intervalValue = 'Day';
              break;
          case '1week':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
              intervalValue = 'Week';
              break;
          case '1month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
              intervalValue = 'Month';
              break;
          case '6month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
              intervalValue = 'Half Year';
              break;
          case '12month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
              intervalValue = 'Full Year';
              break;
          default:
              return res.status(400).json({ error: 'Invalid interval value' });
      }

      const userFormQuery = `
          SELECT submission_id, submission_data, status, created_at 
          FROM audit_submissions
          WHERE submitted_by = $1 ${intervalCondition} 
          ORDER BY created_at DESC`;

      const result = await db.query(userFormQuery, [user_id]);

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'No Submissions available for the specified request' });
      }

      const submissionsWithDetails = await Promise.all(result.rows.map(async (row) => {
          const submissionData = row.submission_data;
          const statusData = row.status;

          // Extract required fields from submission_data
          const { date, time, shift, process, associateName } = submissionData;

          // Initialize status to 'rejected' by default
          let overallStatus = 'rejected';

          // Check if all authorizers are approved
          const authorizers = ['qaAuditor', 'auditorName', 'qaShiftInCharge', 'operationsShiftInCharge'];
          const approvedCount = authorizers.filter(key => statusData[key] === 'approved').length;

          if (approvedCount === authorizers.length) {
              overallStatus = 'approved';
          } else if (statusData['qaAuditor'] === 'rejected' || statusData['auditorName'] === 'rejected' ||
              statusData['qaShiftInCharge'] === 'rejected' || statusData['operationsShiftInCharge'] === 'rejected') {
              overallStatus = 'rejected';
          } else {
              // Default to 'opened' if any authorizer has not approved
              overallStatus = 'opened';
          }

          // Fetch first name and last name for each authorizer
          const authorizerDetails = {};
          await Promise.all(authorizers.map(async (key) => {
              const uuid = submissionData[key];
              const userQuery = `
                  SELECT first_name, last_name 
                  FROM users 
                  WHERE user_id = $1`;

              const userResult = await db.query(userQuery, [uuid]);
              if (userResult.rows.length > 0) {
                  const { first_name, last_name } = userResult.rows[0];
                  authorizerDetails[key] = `${first_name} ${last_name}`;
              } else {
                  authorizerDetails[key] = 'Unknown User'; // Default if user not found
              }
          }));

          return {
              submission_id: row.submission_id,
              date,
              time,
              shift,
              process,
              associateName,
              overallStatus,
              authorizers: authorizerDetails // Now each key contains the concatenated first_name last_name string
          };
      }));

      res.status(200).json(submissionsWithDetails);

  } catch (err) {
      console.error('Error fetching user submissions:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
}




async function getUserSubmissionStatusCeatCounts(req, res) {
  const user_id = req.params.user_id;
  const interval = req.params.interval;

  try {
      // Ensure user_id and interval are provided
      if (!user_id || !interval) {
          return res.status(400).json({ error: 'User ID and interval are required' });
      }

      let intervalCondition = '';

      switch (interval) {
          case '1hour':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 hour'";
              break;
          case '1day':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 day'";
              break;
          case '1week':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 week'";
              break;
          case '1month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 month'";
              break;
          case '6month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '6 month'";
              break;
          case '12month':
              intervalCondition = "AND created_at >= NOW() - INTERVAL '1 year'";
              break;
          default:
              return res.status(400).json({ error: 'Invalid interval value' });
      }

      // Query to get status counts
      const statusCountQuery = `
          SELECT status, COUNT(*) as count
          FROM submissions
          WHERE requested_by = $1 
          ${intervalCondition}
          GROUP BY status`;

      // Query to get total count
      const totalCountQuery = `
          SELECT COUNT(*) as total_count
          FROM submissions
          WHERE requested_by = $1 
          ${intervalCondition}`;

      // Execute the queries sequentially
      const statusResult = await db.query(statusCountQuery, [user_id]);
      const totalResult = await db.query(totalCountQuery, [user_id]);

      const statusCounts = {};
      statusResult.rows.forEach(row => {
          statusCounts[row.status] = row.count;
      });

      // Extract total count from the result
      const totalCount = totalResult.rows[0].total_count;

      // Send JSON response with status code 200
      res.status(200).json({ statusCounts, totalCount });

  } catch (err) {
      console.error('Error fetching user submission status counts:', err);
      // Send error response with status code 500
      res.status(500).json({ error: 'Failed to fetch user submission status counts' });
  }
}
module.exports = {
    insertData,
    getAllSubmissions,
    getSubmissionById,
    getAllSubmissionsByUser,
    getUserName,
    approveStatus,
    rejectStatus,
    insertDataBct,
    getSubmissionByIdBct,
    approveSubmissionCeat,
    getUserSubmissionsCeat,
    getUserSubmissionStatusCeatCounts
};
