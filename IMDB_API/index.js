//BIBLIOTECAS NECESSARIAS

var express = require('express');
require("dotenv-safe").config(); // LÊ OS ARQUIVOS .ENV e .ENV.EXAMPLE
var jwt = require('jsonwebtoken');
var User = require('./models/user')
var Movie = require('./models/movie')
var Actor = require('./models/actor')
var Vote = require('./models/vote');
const { count } = require('console');
const mongoose = require('mongoose')
require('./db/mongoose')


var app = express();

//FUNÇÃO QUE VERIFICA NO CABEÇALHO DO HTTP REQUEST SE EXISTE UM TOKEN PARA SER VALIDADO
//CASO NÃO EXISTA UM TOKEN, OU CASO O TOKEN SEJA INVÁLIDO, ELE NÃO AUTENTICA
//CASO SEJA UM TOKEN VÁLIDO, ELE RETORNA O ID DO USUÁRIO QUE ESTÁ SALVO NO CAMPO _ID DO MONGODB
function verifyJWT(req, res, next){

    var token = req.headers['x-access-token'];

    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
    
    jwt.verify(token, process.env.SECRET, function(err, decoded) {
      if (err) 
      {
          return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
      }
      
      req.userId = decoded.id;
      next();
    });
}

app.use(express.json())

//PÁGINA INICIAL PARA EFETUAR LOGIN COM A SENHA E RECEBER UM TOKEN
//CASO SEJA A PRIMEIRA VEZ A SE UTILIZAR A APLICAÇÃO, O USUÁRIO A TENTAR LOGIN É CRIADO COMO PRIMEIRO USUÁRIO
//NO BODY DO REQUEST DEVE HAVER UM JSON COM OS CAMPOS: name, email, password, admin = TRUE (no caso do primeiro usuário), active
//DEPOIS QUE USUÁRIOS SÃO CRIADOS USANDO O ENDPOINT /user/new, NESSE ENDPOINT DE LOGIN A SENHA DO USUÁRIO É VERIFICADA
//CASO A SENHA ESTEJA ERRADA ELE RETORNA 'LOGIN INVÁLIDO', CASO O USUÁRIO TENHA SIDO DESATIVADO, ELE RETORNA 'USUÁRIO DESATIVADO'
//CASO O EMAIL DO USUÁRIO NÃO SEJA ENCONTRADO NO BANCO, ELE RETORNA 'USUÁRIO NÃO ENCONTRADO'
app.post('/login', (req, res, next) => {

    User.countDocuments({}, function (err, count) {
        
        if (count == 0)
        {
            const user = new User(req.body)

            user.save()

            var token = jwt.sign({ id: user._id }, process.env.SECRET, {
            expiresIn: 3000 
        });
        res.json({ auth: true, token: token });
        }
        else
        {
            
            User.find( {email:req.body.email}, function (err,result) {
                user = result[0]
                
                if (result.length > 0)
                {
                    user.comparePassword(req.body.password, function(err, isMatch) {
                    
                        if (user.active)
                        {
                            if (err) 
                            {
                                res.status(500).json({message: 'Login inválido!'});  
                            }
                            else
                            {
                                    const id = user._id
                                var token = jwt.sign({ id }, process.env.SECRET, {
                                    expiresIn: 3000 
                                });
                                res.json({ auth: true, token: token });
                            }
                        }
                        else
                        {
                            res.status(500).json({message: 'Usuário desativado!'});
                        }
                    });

                }
                else
                {
                    res.status(500).json({message: 'Usuário não existe!'});
                }
                
            })
        }

    });
       
})

//EFETUA LOGOUT DO USUÁRIO
app.post('/logout', function(req, res) {
    res.json({ auth: false, token: null });
})

//CRIA UM USUÁRIO NOVO CASO O USUÁRIO LOGADO (com o token correto) SEJA ADMIN
//SE O USUÁRIO JÁ EXISTE ELE RETORNA UM ERRO
app.post('/user/new', verifyJWT, (req, res) => {

    User.find( {_id:req.userId}, function(err,user) {
        user = user[0]

        if (user.admin)
        {
            User.find( {email:req.body.email}, function (err,checkuser) {

                if (checkuser.length > 0)
                {
                    res.status(500).json({message: 'Usuário já existe!'});
                }
                else
                {
                    const newuser = new User({name:req.body.name, email: req.body.email, password: req.body.password, admin: req.body.admin, active: req.body.active})
        
                    newuser.save().then(() => {
                        res.status(201).send(newuser)
                    }).catch((e) => {
                        res.status(400).send(e)
                    })
        
                    if (req.body.admin)
                    {
                        User.findByIdAndUpdate( {_id:req.userId},{admin:false}, function (err,result) {
                            
                            if(err){
                                res.send(err)
                            }
                            else{
                                res.send(result)
                            }

                        })
                    }

                }
        
            })
            
        }
        else
        {
            res.status(500).json({message: 'Somente Admin pode cadastrar!'});
        }
    })

})

//DESATIVA UM USUÁRIO USANDO SEU NOME
//CASO O USUÁRIO A SER DESATIVADO SEJA ADMIN E ELE SEJA O ÚNICO, A FUNÇÃO RETORNA UM ERRO
app.post('/user/delete/:name',verifyJWT,(req,res) => {

    User.find({admin:true}, function(err,adminuser)
    {
        if ( (adminuser.length == 1) && (adminuser.name == req.params.name) )
        {
            res.status(500).json({message: 'Não pode desativar o único Admin!'});
        }
        else
        {
            User.updateOne({ name:req.params.name }, { $set: { active: false } }, function(err,result) {

                if (!err)
                {
                    res.status(500).json({message: 'Usuário desativado!'});
                }
                
            })

        }
    })

})

//ATUALIZA INFORMAÇÕES DE UM USUÁRIO EXISTENTE
//CASO O USUÁRIO NÃO EXISTA A FUNÇÃO RETORNA UM ERRO
app.post('/user/update/:name', verifyJWT,(req,res) => {

    User.find({admin:true}, function(err,user)
    {

        if (user.length > 0)
        {
            User.updateOne({name:req.params.name},{email:req.body.email, password: req.body.password, admin: req.body.admin, active: req.body.active}, function(err, resultl) {

                if (!err)
                {
                    res.status(500).json({message: 'Usuário atualizado!'});
                }
            })

            
        }
        else
        {
            res.status(500).json({message: 'Usuário não existe!'});
        }

    })
    

})

//CRIA UM FILME NOVO
//EXEMPLO DO BODY DO REQUEST:
// { "name": "Vingador", "director": "Steven", "genre": "action", "actor": ["Bob", "Alice"] }
//SOMENTE ADMIN PODE FAZER O CADASTRO
app.post('/movie/new', verifyJWT, (req, res) => {

    User.find( {_id:req.userId} ,function (err,user) {
        user = user[0]

        if (user.admin)
        {
            const newmovie = new Movie({name:req.body.name, genre: req.body.genre, director: req.body.director})
        
            newmovie.save().then(() => {
                res.status(201).send(newmovie)
                }).catch((e) => {
                   res.status(400).send(e)
            })

            const actors = req.body.actor;

            for(let i = 0; i < actors.length; i++)
            { 

                const newactor = new Actor({name: actors[i], movieID: newmovie._id})

                newactor.save();
    
            }
        }
        else
        {
            res.status(500).json({message: 'Somente Admin pode cadastrar!'});
        }
    })

})

//REGISTRA UM VOTO PARA UM FILME
//EXEMPLO DO BODY DO REQUEST:
// { "vote": 4 }
//CADA USUÁRIO SÓ PODE VOTAR UMA VEZ POR FILME
app.post('/movie/vote/:movieName', verifyJWT, (req, res) => {


    Movie.find({name:req.params.movieName}, function (err,result) {

        const movie = result[0]
        const movieID = movie._id
    

        Vote.find({userID:req.userId,movieID:movieID}, function (err,user)  {

            if (user.length > 0)
            {
                Vote.findByIdAndUpdate({userID:req.userId,movieID:movieID},{vote:req.body.vote}, function (err, voteresult) {
                            
                    if(err){
                        res.send(err)
                    }
                    else{
                        res.send(voteresult)
                    }

                })
            }
            else
            {
                const newvote = new Vote({movieID:movieID, userID: req.userId, vote: req.body.vote})
        
                newvote.save().then(() => {
                    res.status(201).send(newvote)
                        }).catch((e) => {
                            res.status(400).send(e)
                        })
            }
        })

    })

})

//RETORNA UMA LISTA DE FILMES POR DIRETOR
app.get('/movie/director/:director', verifyJWT, (req, res) => {

    const director = req.params.director

    Movie.find( {director:director}, function (err,result) {

        if (!err)
        {
            res.send(result)
        }
        
    })

})

//RETORNA UMA LISTA DE FILMES POR NOME
app.get('/movie/name/:name', verifyJWT, (req, res) => {

    const name = req.params.name

    Movie.find( {name:name}, function (err,result) {

        if (!err)
        {
            res.send(result)
        }

    })

})

//RETORNA UMA LISTA DE FILMES POR GÊNERO
app.get('/movie/genre/:genre', verifyJWT, (req, res) => {

    const genre = req.params.genre

    Movie.find( {genre:genre}, function (err,result) {

        if (!err)
        {
            res.send(result)
        }

    })

})


//RETORNA UMA LISTA DE FILMES POR ATOR
app.get('/movie/actor/:actor', verifyJWT, (req, res) => {

    const actor = req.params.actor

    Actor.find( {name:actor}, function (err,result) {

        if (!err)
        {
            res.send(result)
        }

    })

})

//RETORNA TODAS AS INFORMAÇÕES DE UM FILME INCLUINDO A MÉDIA DOS VOTOS
app.get('/movie/details/:name', verifyJWT, (req, res) => {

    const name = req.params.name

    Movie.find( {name:name}, function (err,result) {

        var movie = result[0]

       Vote.find( {movieID:movie._id}, function (err,voteresult) {

            let count = 0
            let sum = 0

            voteresult.forEach(function(element) { 
                count = count + 1
                sum = sum + element.vote
            })

            const mean_vote = sum/count

            movieInfo = movie.toObject()

            movieInfo.mean_vote = mean_vote

            console.log(movieInfo)

            if (!err)
            {
                res.send(movieInfo)
            }

        })

    })

})

app.listen(3000)
