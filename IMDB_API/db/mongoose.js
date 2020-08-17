const mongoose = require('mongoose')

//CONEXAO COM O BANCO MONGODB
mongoose.connect('mongodb://127.0.0.1:27017/imdb', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
})

