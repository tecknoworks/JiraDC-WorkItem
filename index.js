const express = require('express')
const bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors')
const fetch = require("node-fetch");
const app = express()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
const BASE_API_URL = "http://localhost:8081";
const WorkItem = require('./models/workItem')
const LinkComponents = require('./models/linkComponents')
const LinkLabels = require('./models/linkLabels')

const port = 8084

var mongoDB = 'mongodb+srv://cata:cata@cluster0.wcbqw.mongodb.net/first?retryWrites=true&w=majority';
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.post('/workItem', async (req, res) => {
    let newWorkItem = req.body
    var addWorkItem=new WorkItem({project:newWorkItem.project,issue_type:newWorkItem.issue_type, epic_name:newWorkItem.epic_name, summary:newWorkItem.summary,description:newWorkItem.description,priority:newWorkItem.priority,linked_issue:newWorkItem.linked_issue,issue:newWorkItem.issue,assignee:newWorkItem.assignee,epic_link:newWorkItem.epic_link,sprint:newWorkItem.sprint })
    await WorkItem.create(addWorkItem)

    if(req.body.labels !== undefined){
    await Promise.all(req.body.labels.map(label => {
        let addLinkLabel= new LinkLabels({work_item: addWorkItem._id, label: label._id})
        LinkLabels.create(addLinkLabel)
    }))
    }
    if(req.body.components !== undefined){
        await Promise.all(req.body.components.map(component => {
            let addLinkComponent= new LinkComponents({work_item: addWorkItem._id, component: component._id})
            LinkComponents.create(addLinkComponent)
        }))
    }
    res.send(newWorkItem)
})

app.get('/workItem', async (req, res) =>{
    const record= await WorkItem.find({})
    res.json(record)
})

app.get('/workItem/epic', async (req, res) =>{
    
    var epic=" "
    await fetch(`${BASE_API_URL}/issue/epic`, { method: 'GET'})
    .then(res => res.json())
    .then(data => epic = data) 
    const record= await WorkItem.find({'issue_type':epic[0]._id})
    res.json(record)
})

app.get('/workItem', async (req, res) =>{
    const record= await WorkItem.find({})
    res.json(record)
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })