const express = require('express')
const bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors')
const fetch = require("node-fetch");
const app = express()
var morgan = require('morgan')
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))
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
const workItemServiceUrl = baseUrl + ':8084';
const gitServiceUrl = baseUrl + ':8092';
const port = 8084

var mongoDB = 'mongodb+srv://cata:cata@cluster0.wcbqw.mongodb.net/first?retryWrites=true&w=majority';
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


app.post('/workItem', async (req, res) => {
    let newWorkItem = req.body
    let record = await WorkItem.find({project:newWorkItem.project})
    let project = ""
    let summary = req.body.summary.substring(0,15)
    if(req.body.summary.length>15)
    {
        summary=summary+"..."
    }
    
    await fetch(projectServiceUrl + '/projectId', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({_id:newWorkItem.project})
    })
    .then(res => res.json())
    .then(data => project = data);
    let number = record.length + 1
    let key = project[0].key + String(number)
    var addWorkItem=new WorkItem({project:newWorkItem.project,issue_type:newWorkItem.issue_type, epic_name:newWorkItem.epic_name, summary:newWorkItem.summary,description:newWorkItem.description,priority:newWorkItem.priority,linked_issue:newWorkItem.linked_issue,issue:newWorkItem.issue,assignee:newWorkItem.assignee,epic_link:newWorkItem.epic_link,sprint:newWorkItem.sprint,positionInSprint: record.length + 1 ,key:key , positionInStatus: record.length+1})
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

    fetch(gitServiceUrl + '/addworkitem', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({project_id:project[0]._id ,git_url:project[0].git_url, workitem_id:addWorkItem._id,owner:project[0].owner,repository:project[0].repository})
    })

    var request = {
        project: "PRJ1",
        message: "A new workItem with the key: "+ key + " - " + summary + " was created !"
      };
    await fetch("http://localhost:1106/Project", 
      { 
          method: 'POST',
          mode: "cors",
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
      })
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
    var res = objectArray.reduce(function (acc, obj) {
      var key = obj[property];
      if (!acc[key]) {
        if(key==="Backlog"){
            acc[key] = {items: [], id: 0,closed:false};
        }else{
            acc[key] = {items: [], id: obj.sprint_id,closed:obj.sprint_closed};
        }
      }
      acc[key].items.push(obj);
      return acc;
    }, {});

    return res;
  }

  app.post('/allLinkedComponents', async (req, res) =>{
    let result = [];
    if (req.body.length) {
        for (let index = 0; index < req.body.length; index++) {
            if(req.body[index]!==''){
                const rezComponent = await LinkComponents.find({ 'work_item': req.body[index] })
                result.push(rezComponent[0]);
            }else{
                result.push([]);
            }
            
        }
    }
    res.json(result)
})
app.post('/allLinkedLabels', async (req, res) =>{
    let result = [];
    if (req.body.length) {
        for (let index = 0; index < req.body.length; index++) {
            if(req.body[index]!==''){
                const rezLabel = await LinkLabels.find({ 'work_item': req.body[index] })
                result.push(rezLabel[0]);
            }else{
                result.push([]);
            }
            
        }
    }
    res.json(result)
})
  var issues = [] 
  var priorities = []
  var sprints=[]
  var epiclinks=[]
  var assignees=[]
  var comments=[]
  var labels=[]
  var components=[]
  var commits=[]
async function requestsMicroservices(issueIds,priorityIds,sprintIds,epicLinkIds,assigneeIds,workItemsIds,workItemProjectIds){
   
 fetch(issuesServiceUrl + '/allIssues', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueIds)
    })
    .then(res => res.json())
    .then(data => issues = data);

 fetch(priorityServiceUrl + '/allPriorities', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(priorityIds)
    })
    .then(res => res.json())
    .then(data => priorities = data);
    
 fetch(sprintServiceUrl + '/allsprints', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sprintIds)
    })
    .then(res => res.json())
    .then(data => sprints = data);
 fetch(issueServiceUrl + '/allepiclinks', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(epicLinkIds)
    })
    .then(res => res.json())
    .then(data => epiclinks = data);

 fetch(usersServiceUrl + '/allusersselected', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(assigneeIds)
    })
    .then(res => res.json())
    .then(data => assignees = data);
    fetch(commentsServiceUrl + '/allcomments', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => comments = data);


    fetch(workItemServiceUrl + '/allLinkedComponents', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => components = data);

    fetch(workItemServiceUrl + '/allLinkedLabels', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => labels = data);

    fetch(gitServiceUrl + '/allworkitems', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemProjectIds)
    })
    .then(res => res.json())
    .then(data => commits = data);

}
 
app.post('/workItemProject', async (req, res) =>{
    let result = []
    let record = await WorkItem.find({'project':req.body.id})

    issueIds=record.map(i => i.issue_type);
    priorityIds=record.map(i => i.priority);
    epicLinkIds=record.map(i => i.epic_link);
    assigneeIds=record.map(i => i.assignee);
    sprintIds=record.map(i => i.sprint);
    workItemIds=record.map(i => i._id);
    workItemProjectIds=record.map(i => i.key);

    let microservicesInfo=await requestsMicroservices(issueIds,priorityIds,sprintIds,epicLinkIds,assigneeIds,workItemIds,workItemProjectIds)
    for (let index = 0; index < record.length; index++) {
        if (!issues[index]) {
            issues[index] = { name: "no issue" };
        }
        if (!priorities[index]) {
            priorities[index] = { name: "no priority" };
        }

        let labelsWI=[]
        if(labels[index]===undefined || labels[index]===null)
            labelsWI=[]
        else
            labelsWI=labels[index]
        
        let componentsWI=[]
        if(components[index]===undefined || components[index]===null)
            componentsWI=[]
        else
            componentsWI=components[index]
        
        let commitsWI=[]
        if(commits[index]===undefined || commits[index]===null)
            commitsWI=[]
        else
            commitsWI=commits[index]
            
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
            sprint_id: sprints[index]._id,
            sprint_closed:sprints[index].closed,
            labels: labelsWI,
            components: componentsWI,
            commits:commitsWI,
            status:record[index].status,
            comments:comments[index]===undefined ? []:comments[index],
            positionInSprint:record[index].positionInSprint,
            positionInStatus:record[index].positionInStatus,
            key:record[index].key===undefined ? "" : record[index].key,
        }
        result.push(componentDTO);   
    }  
    var grouped = groupBy(result, 'sprint')
    let hasBacklog=0
    for(let prop in grouped){
        if(prop==="Backlog")
            hasBacklog=1
    }
    if(hasBacklog===0)
        grouped["Backlog"]={items: [], id: 0,closed:false}

    allProjectSprints=[]
    await fetch(sprintServiceUrl + '/sprint/projectid', 
        { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({'id':req.body.id})
        })
        .then(res => res.json())
        .then(data => allProjectSprints = data);
        allProjectSprints.map((s)=>{
            let exists=sprints.find(e=> e._id===s._id)
            if(exists===undefined)
                grouped[s.name]={items: [], id: s._id,closed:s.closed}
        })
    res.json(grouped)
})

var commentsworkItem=[]
var componentsworkItem=[]
var labelsworkItem=[]
var commitsworkItem=[]
async function requestsMicroservicesWorkItem(workItemsIds,workItemProjectIds){
    fetch(commentsServiceUrl + '/allcomments', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => commentsworkItem = data);


    fetch(workItemServiceUrl + '/allLinkedComponents', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => componentsworkItem = data);

    fetch(workItemServiceUrl + '/allLinkedLabels', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemsIds)
    })
    .then(res => res.json())
    .then(data => labelsworkItem = data);

    fetch(gitServiceUrl + '/allworkitems', 
    { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(workItemProjectIds)
    })
    .then(res => res.json())
    .then(data => commitsworkItem = data);
}
app.get('/workItem', async (req, res) =>{
    const record= await WorkItem.find({})
    let workItemIds=record.map(i => i._id);
    let workItemProjectIds=record.map(i => i.key);
    let microservicesInfo=await requestsMicroservicesWorkItem(workItemIds,workItemProjectIds)
    let result=[]

    for (let index = 0; index < record.length; index++) {
      var rez = JSON.parse(JSON.stringify(record[index]));
      if(componentsworkItem[index]===undefined || componentsworkItem[index]===null)
         rez.component = [];
      else
        rez.component = componentsworkItem[index];

        if(labelsworkItem[index]===undefined || labelsworkItem[index]===null)
        rez.label = [];
     else
     rez.label = labelsworkItem[index];

     if(commentsworkItem[index]===undefined || commentsworkItem[index]===null)
     rez.comments = [];
     else
     rez.comments = commentsworkItem[index];

     if(commitsworkItem[index]===undefined || commitsworkItem[index]===null)
     rez.commits = [];
     else
     rez.commits = commitsworkItem[index];

      rez.positionInSprint = record[index].positionInSprint;
      rez.positionInStatus = record[index].positionInStatus;
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

app.put('/updateWorkItem', async (req, res) =>{
    const newObject = req.body
    let summary = req.body.summary.substring(0,15)
    if(req.body.summary.length>15)
    {
        summary=summary+"..."
    }
    const editedObject={project:newObject.project,issue_type:newObject.issue_type, epic_name:newObject.epic_name, summary:newObject.summary,description:newObject.description,priority:newObject.priority,linked_issue:newObject.linked_issue,issue:newObject.issue,assignee:newObject.assignee,epic_link:newObject.epic_link,sprint:newObject.sprint,status:newObject.status }
    const filter={_id:req.body._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
      var request = {
        project: "PRJ1",
        message: "A workItem with the key: "+ update_.key + " - " +summary + " was modified !"
      };
    await fetch("http://localhost:1106/Project", 
      { 
          method: 'POST',
          mode: "cors",
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(request)
      })
    res.send(update_)
})

app.put('/workItemChangePosition', async (req, res) =>{
  
    await Promise.all(req.body.items.map(async(wi) => {  
    const editedObject = { _id:wi._id,positionInSprint:wi.positionInSprint }
    const filter={_id:wi._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
    res.send(update_)
     }
    ))
})

app.put('/workItemChangeSprint', async (req, res) =>{

    await Promise.all(req.body.items.map(async(wi) => {  
    let id_sprint=""
    if(wi.sprint_id!==0){
        id_sprint=wi.sprint_id
    }
    const editedObject = { _id:wi._id,positionInSprint:wi.positionInSprint, sprint:id_sprint }
    const filter={_id:wi._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
      
    res.send(update_)
    }
    ))
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

app.put('/workItemChangePositionStatus', async (req, res) =>{
  
    await Promise.all(req.body.items.map(async(wi) => {  
    const editedObject = { _id:wi._id,positionInStatus:wi.positionInStatus}
    const filter={_id:wi._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
    res.send(update_)
    }
    ))
})

app.put('/workItemChangeStatus', async (req, res) =>{
  
    await Promise.all(req.body.items.map(async(wi) => {  
    const editedObject = { _id:wi._id,positionInStatus:wi.positionInStatus,status:wi.status }
    const filter={_id:wi._id}
    let update_= await WorkItem.findOneAndUpdate(filter, editedObject, {
        new: true,
        upsert: true 
      });
    res.send(update_)
    }
    ))
})

app.post('/workitemIssue', async (req, res) =>{
    let result = [];
    if (req.body.length) {
        for (let index = 0; index < req.body.length; index++) {
            const componentIssue = await LinkComponents.find({ 'component': req.body[index] })
            result.push(componentIssue.length);
        }
    }
    res.json(result)
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })