
const mongoose = require('mongoose');
const mongoURI = "mongodb://3.109.132.244:27017/SWP"

const connectToMongo = async () => {
try {
    mongoose.set('strictQuery', false)
    mongoose.connect(mongoURI) 
    console.log('connected to mongoDB successfully')
}
catch(error) {
    console.log(error)
    process.exit()
}
}
module.exports = connectToMongo;