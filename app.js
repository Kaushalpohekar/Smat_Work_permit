const cors=require('cors')
const bodyparser=require('body-parser')
const routes=require('./routes')

const express =require('express');

const app= express();
app.use(cors());
app.use(bodyparser.json());
app.use(routes);
const port =6000;



app.listen(port,()=>
    {
        console.log('app listen on  port',port)
    })