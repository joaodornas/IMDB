const mongoose = require('mongoose')
require('../db/mongoose')

mongoose.models = {}

//MODELO PARA ACTOR
const Actor = mongoose.model('Actor',{
    name: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    movieID : {
        type: String,
        trim: true,
        required: true,
        default: false
    }
})

module.exports = Actor