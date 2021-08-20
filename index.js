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
const issueServiceUrl = baseUrl + ':8084';
const usersServiceUrl = baseUrl + ':8082';
const commentsServiceUrl = baseUrl + ':8091';
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
    if(req.body.labels !== ""){
    await Promise.all(req.body.labels.map(label => {
        let addLinkLabel= new LinkLabels({work_item: addWorkItem._id, label: label._id})
        LinkLabels.create(addLinkLabel)
    }))
    }
    if(req.body.components !== ""){
        await Promise.all(req.body.components.map(component => {
            let addLinkComponent= new LinkComponents({work_item: addWorkItem._id, component: component._id})
            LinkComponents.create(addLinkComponent)
        }))
    }
    res.send(newWorkItem)
})

app.post('/allepiclinks', async (req, res) =>{
    let result = [];
    if (req.body.length) {
        for (let index = 0; index < req.body.length; index++) {
            if(req.body[index]!==''){
                const issue = await WorkItem.find({ '_id': req.body[index] })
                result.push(issue[0]);
            }else{
                result.push({name:"No Epic"});
            }
        }
    }
    res.json(result)
})

function groupBy(objectArray, property) {
    return objectArray.reduce(function (acc, obj) {
      var key = obj[property];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(obj);
      return acc;
    }, {});
  }
 
app.post('/workItemProject', async (req, res) =>{
    let result = []
    let record = await WorkItem.find({'project':req.body.id})
    issueIds=record.map(i => i.issue_type);
    priorityIds=record.map(i => i.priority);
    epicLinkIds=record.map(i => i.epic_link);
    assigneeIds=record.map(i => i.assignee);
    sprintIds=[]
    for (let index = 0; index < record.length; index++) {
        sprintIds[index]=record[index].sprint
    }

    issues = [] 
    priorities = []
    sprints=[]
    epiclinks=[]
    assignees=[]
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

    await fetch(issueServiceUrl + '/allepiclinks', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(epicLinkIds)
    })
    .then(res => res.json())
    .then(data => epiclinks = data);

    await fetch(usersServiceUrl + '/allusersselected', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(assigneeIds)
    })
    .then(res => res.json())
    .then(data => assignees = data);

    
    for (let index = 0; index < record.length; index++) {
        if (!issues[index]) {
            issues[index] = { name: "no issue" };
        }
        if (!priorities[index]) {
            priorities[index] = { name: "no priority" };
        }

        let components = await LinkComponents.find({ work_item: record[index]._id });
        let labels = await LinkLabels.find({ work_item: record[index]._id });

        comments=[]
    await fetch(commentsServiceUrl + '/allItemComments', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({'_id':record[index]._id})
    })
    .then(res => res.json())
    .then(data => comments = data);

    console.log(comments)

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
            assignee: assignees[index].username,
            epic_link: epiclinks[index].name,
            sprint: sprints[index].name,
            labels: components,
            components: labels,
            status:record[index].status,
            comments:comments
        }
        result.push(componentDTO);   
        console.log(componentDTO)
    }  
    var grouped = groupBy(result, 'sprint')
    res.json(grouped)
})

app.get('/workItem', async (req, res) =>{
    const record= await WorkItem.find({})
    let result=[]
    for (let index = 0; index < record.length; index++) {
      let components = await LinkComponents.find({ work_item: record[index]._id });
      let labels = await LinkLabels.find({ work_item: record[index]._id });

      comments=[]
      await fetch(commentsServiceUrl + '/allItemComments', 
      { 
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({'_id':record[index]._id})
      })
      .then(res => res.json())
      .then(data => comments = data);
  
      console.log(comments)
      var rez = JSON.parse(JSON.stringify(record[index]));
      rez.component = JSON.parse(JSON.stringify(components));
      rez.label = JSON.parse(JSON.stringify(labels));
      rez.comments = comments;

      result.push(rez)
    }
    res.json(result)
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
    const editedObject={project:newObject.project,issue_type:newObject.issue_type, epic_name:newObject.epic_name, summary:newObject.summary,description:newObject.description,priority:newObject.priority,linked_issue:newObject.linked_issue,issue:newObject.issue,assignee:newObject.assignee,epic_link:newObject.epic_link,sprint:newObject.sprint }
    const filter={_id:req.body._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
    res.send(update_)
})

app.post('/workItemById', async (req, res) =>{
    const newObject = req.body
    var record= await WorkItem.find({'_id':req.body._id})
    let components = await LinkComponents.find({ work_item: req.body._id });
    let labels = await LinkLabels.find({ work_item: req.body._id });

    var rez=JSON.parse(JSON.stringify(record))
    rez[0].component=JSON.parse(JSON.stringify(components))
    rez[0].label=JSON.parse(JSON.stringify(labels))

    res.json(rez)
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })