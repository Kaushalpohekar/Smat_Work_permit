const mongoose =require('mongoose');
const {Schema}=mongoose;


const SchemaMongo =new Schema({
    FirstName:{
        type: String,
        required: true
    },
    LastName:{
        type: String,
        required: true,
    },
    PersonalEmail:{
        type:String,
        required:true,
    },
    UserPassword:{
        type:String,
        required:true,
    },
    CompanyEmail:{
        type:String,
        required:true,
    },
    ContactNumber:{
        type:String,
        required:true,
    },
    CompanyName:{
        type:String,
        required:true,
    },
    UserType:{
        type:String,
    },
    VerificationToken:{
        type:String,
        default:'null',
    },
    Verified:{
        type:String,
        default:'0',
    },
    is_online:{
        type:String,
        default:'0',
    },
    block:{
        type:String,
        default:'0',
    },
});

module.exports=mongoose.model('User_details',SchemaMongo);