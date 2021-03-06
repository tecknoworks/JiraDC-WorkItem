const mongoose = require('mongoose')

const model = mongoose.Schema({
    project: {
        type: String,
        required: true
    },
    issue_type: {
        type: String,
        required: true
    },
    epic_name: {
        type: String,
        required: false
    },
    summary: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    priority: {
        type: String,
        required: false
    },
    // attachment: {
    //     type: String,
    //     required: false
    // },
    linked_issue: {
        type: String,
        required: false
    },
    issue: {
        type: String,
        required: false
    },
    assignee: {
        type: String,
        required: false
    },
    epic_link: {
        type: String,
        required: false
    },
    sprint: {
        type: String,
        required: false
    },
    status: {
        type: String,
        default: "To do"
    },
    positionInSprint:{
        type: Number,
        default: 0
    },
    key:{
        type: String,
        required: false
    },
    positionInStatus:{
        type: Number,
        default: 0
    }
});

module.exports = new mongoose.model("WorkItem", model)