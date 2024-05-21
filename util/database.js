const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let _db;
const mongoConnect = (callback) =>{ 
    MongoClient.connect(
        'mongodb+srv://avivmor:iW4nXcV9ACvw25TR@cluster0.0zemssv.mongodb.net/shop?retryWrites=true&w=majority&appName=Cluster0')
        .then(client=>{
            console.log('Connected !');
            _db = client.db();
            callback();
        })
        .catch(err=>{
            console.log(err);
            throw err;
        });
}

const getDb = () =>{ 
    if(_db){
        return _db;
    }
    throw 'No Databe Found';
}
module.exports = {
 mongoConnect: mongoConnect,
 getDb: getDb
}