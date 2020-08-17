const mongoose = require('mongoose')
require('../db/mongoose')

mongoose.models = {}

//MODEO PARA MOVIE
const Movie = mongoose.model('Movie',{
    name: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    genre: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    director: {
        type: String,
        required: true,
        default: false
    }
    
})

module.exports = Movie