const mongoose = require('mongoose')
require('../db/mongoose')

mongoose.models = {}

//MODEO PARA VOTE
const Vote = mongoose.model('Vote',{
    movieID: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    userID: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    vote: {
        type: Number,
        required: true,
        default: false
    }
    
})

module.exports = Vote