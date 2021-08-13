const mongoose = require('mongoose')

const model = mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    work_item: {
        type: String,
        required: true
    },
});

module.exports = new mongoose.model("linkLabels", model)