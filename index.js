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
const baseUrl = 'http://localhost';
const issuesServiceUrl = baseUrl + ':8086';
const sprintServiceUrl = baseUrl + ':8090';
const priorityServiceUrl = baseUrl + ':8085';
const projectServiceUrl = baseUrl + ':8083';
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

function groupBy(objectArray, property) {
    var res = objectArray.reduce(function (acc, obj) {
      var key = obj[property];
      if (!acc[key]) {
        acc[key] = {items: [], id: obj.sprint_id};

      }
      acc[key].items.push(obj);
      return acc;
    }, {});

    return res;
  }

app.post('/workItemProject', async (req, res) =>{
    console.log(req.body)
    let result = []
    let record = await WorkItem.find({'project':req.body.id})
    issueIds=record.map(i => i.issue_type);
    priorityIds=record.map(i => i.priority);
    sprintIds=[]
    for (let index = 0; index < record.length; index++) {
        sprintIds[index]=record[index].sprint
    }

    issues = [] 
    priorities = []
    sprints=[]
    await fetch(issuesServiceUrl + '/allIssues', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueIds)
    })
    .then(res => res.json())
    .then(data => issues = data);

    await fetch(priorityServiceUrl + '/allPriorities', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(priorityIds)
    })
    .then(res => res.json())
    .then(data => priorities = data);
    
    console.log(sprintIds)
    await fetch(sprintServiceUrl + '/allsprints', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sprintIds)
    })
    .then(res => res.json())
    .then(data => sprints = data);

    for (let index = 0; index < record.length; index++) {
        if (!issues[index]) {
            issues[index] = { name: "no issue" };
        }
        if (!priorities[index]) {
            priorities[index] = { name: "no priority" };
        }
        const componentDTO = {
            _id: record[index]._id,
            project: "projectId",
            issue_type: issues[index].name,
            epic_name: "epicName",
            summary: record[index].summary,
            description: "description",
            priority: priorities[index].name,
            linked_issue: "linkedIssueId",
            issue: "issueId",
            assignee: "assigneeId",
            epic_link: "epicLinkId",
            sprint: sprints[index].name,
            sprint_id: sprints[index]._id,
            labels: "labelsId",
            components: "componentsId",
        }
        result.push(componentDTO);   
    }  

    var grouped = groupBy(result, 'sprint')
    //console.log(grouped)

    res.json(grouped)
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

app.put('/workItem', async (req, res) =>{
    const newObject = req.body
    const filter={_id:req.body._id}
    let update_= await WorkItem.findOneAndUpdate(filter, newObject, {
        new: true,
        upsert: true 
      });
    res.send(update_)
})

app.post('/workItemById', async (req, res) =>{
    const newObject = req.body
    const record= await WorkItem.find({'_id':req.body._id})
    console.log(record)
    res.send(record)
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })