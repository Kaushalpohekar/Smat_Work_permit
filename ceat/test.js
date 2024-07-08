const nodemailer = require('nodemailer');

// Create a transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'donotreplysenselive@gmail.com', // your Gmail account
        pass: 'xgcklimtlbswtzfq', // your Gmail password or app-specific password
    },
    tls: {
        rejectUnauthorized: false // This is for development/testing only, remove this in production
    }
});

// Define email options
const mailOptions = {
    from: 'donotreplysenselive@gmail.com', // sender address
    to: 'example1@gmail.com, example2@gmail.com', // list of receivers
    subject: 'Test Email from Nodemailer', // Subject line
    text: 'Hello, this is a test email sent using Nodemailer!', // plain text body
    html: '<b>Hello, this is a test email sent using Nodemailer!</b>' // html body
};

// Send email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.error('Error sending email:', error);
    }
    console.log('Email sent:', info.response);
});
