
//BIBLIOTECAS
const mongoose = require('mongoose')
require('../db/mongoose')
bcrypt = require('bcrypt'),
SALT_WORK_FACTOR = 10;
Schema = mongoose.Schema

mongoose.models = {}

//ESQUEMA DO CAMPO USER
const UserSchema = new Schema({ 
    name: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    email: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    password: {
        type: String,
        trim: true,
        required: true,
        default: false
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    },
    active: {
        type: Boolean,
        required: true,
        default: false
    }
})


//FUNÇÃO EXECUTADA QUANDO UM USUÁRIO É SALVO
//É CRIADO UM HASH DA SENHA DE FORMA QUE A SENHA NÃO SEJA SALVA COMO PLAIN TEXT NO BANCO
UserSchema.pre('save', function(next) {
    var user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

//COMPARA DUAS SENHAS, UMA DE ENTRADA (em plain text), E A DO BANCO (em modo hash)
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

const User = mongoose.model('User',UserSchema)

module.exports = User