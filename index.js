const express = require('express');
const app = express();

const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json())

// -----------------MongoDB Connections Starts here--------------------------------------------------------------------------------------------

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c1krwnm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const mainCollection = client.db("reactTailwindTemplate")

    const usersCollection = mainCollection.collection("user")
    const resultCollection = mainCollection.collection("answer")
    
    // Get Mathod ------------------------------------------

    app.get("/", async(req,res) =>{
      const result = await mainCollection.find().toArray();
      res.send(result)
    })
    
    // Get Mathod ------------------------------------------

    // users related API -----------------------------------

    app.post('/users', async(req, res)=>{
      const user = req.body;
      console.log(user)
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      // console.log("app.post user",existingUser)
      if(existingUser){
        return res.send({message: 'User exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users', async(req,res)=>{
      const result = await usersCollection.find().toArray();
      // console.log("app.get users", result)
      res.send(result)
    })

    // users related API -----------------------------------

    // MCQ Answer related application--------------------------

    app.post('/result', async(req, res)=>{
      const mcqResult = req.body;
      // console.log("mcq result",mcqResult)
      const result = await resultCollection.insertOne(mcqResult);
      // console.log("submitting result",result)
      res.send(result)
    })

    app.get('/result', async(req,res)=>{
      const result = await resultCollection.find().toArray();
      // console.log("app.get users", result)
      res.send(result)
    })


    // MCQ Answer related application--------------------------


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// -----------------MongoDB Connections Ends here---------------------------------------------------------------------------------------------


app.get('/', (req, res)=>{
    res.send('Template surver is running')
})

app.listen(port, ()=>{
    console.log(`Server is Running at ${port}`)
})