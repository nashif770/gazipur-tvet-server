const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// -----------------MongoDB Connections Starts here --------------------------------------------------------------------------------------------
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c1krwnm.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const mainCollection = client.db("ucepComputerTrade");

    const usersCollection = mainCollection.collection("users");
    const resultCollection = mainCollection.collection("answer");
    const questionCollection = mainCollection.collection("questionCollection"); // New collection for questions
    const answerCollection = mainCollection.collection("answerSheet"); // New collection for questions

    // Users related API -----------------------------------
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.status(400).send({ message: 'User exists' });
      }
      const result = await usersCollection.insertOne(user);
      res.status(201).send(result);
    });

    app.get('/users', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: 'Error fetching users' });
      }
    });

    // MCQ Answer related application--------------------------
    app.post('/result', async (req, res) => {
      const mcqResult = req.body;
      try {
        const result = await resultCollection.insertOne(mcqResult);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error saving result:", error);
        res.status(500).send({ message: 'Error saving result' });
      }
    });

    app.get('/result', async (req, res) => {
      try {
        const result = await resultCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).send({ message: 'Error fetching results' });
      }
    });

    // Written Question related API--------------------------
    // POST: Add a new question
    app.post('/questions', async (req, res) => {
      const { title, selectedQuestions, date, time, day } = req.body; // Destructure all necessary fields
      console.log("Received question:", req.body); // Log the incoming question
    
      // Check for required fields
      if (!title || !Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
        return res.status(400).send({ message: 'Title and at least one question are required' });
      }
    
      try {
        const questionToInsert = {
          title,
          selectedQuestions,
          date, // Include date
          time, // Include time
          day,  // Include day
        };
    
        const result = await questionCollection.insertOne(questionToInsert);
        res.status(201).send(result);
        console.log("Question submitted successfully");
      } catch (error) {
        console.error("Error inserting question:", error);
        res.status(500).send({ message: 'Error saving question' });
      }
    });
    
    

    // GET: Retrieve all questions
    app.get('/questions', async (req, res) => {
      try {
        const result = await questionCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).send({ message: 'Error fetching questions' });
      }
    });

    //Submit answer sheet
    app.post('/submitAnswers', async (req, res) => {
      const { title, answers, username, date, time, day } = req.body;
    
      // Log the received data
      console.log("Received answers:", { title, answers, username, date, time, day });
    
      try {
        // Insert the data into the database
        const result = await answerCollection.insertOne({ title, answers, username, date, time, day });
    
        // Respond with success
        res.status(201).send({ message: "Answers submitted successfully", result });
      } catch (error) {
        console.error("Error saving answers:", error);
        res.status(500).send({ message: "Error saving answers" });
      }
    });
    

    // ------------Rating---------------------

    // GET: Retrieve submitted answers
app.get('/submittedAnswers', async (req, res) => {
  try {
    const result = await answerCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching submitted answers:", error);
    res.status(500).send({ message: 'Error fetching submitted answers' });
  }
});
    
    // POST: Submit ratings for each answer
    app.post('/submitRatings', async (req, res) => {
      const { answerSheetId, ratings } = req.body; // Expect answerSheetId and ratings to be sent
    
      try {
        // Validate the answerSheetId
        if (!ObjectId.isValid(answerSheetId)) {
          return res.status(400).send({ message: `Invalid ObjectId: ${answerSheetId}` });
        }
    
        // Fetch the answer sheet document by ID
        const answerSheet = await answerCollection.findOne({ _id: new ObjectId(answerSheetId) });
    
        if (!answerSheet) {
          return res.status(404).send({ message: 'Answer sheet not found' });
        }
    
        // Update the ratings for each answer based on their index
        answerSheet.answers.forEach((answer, index) => {
          if (ratings[index] !== undefined) {
            answer.rating = ratings[index]; // Update the rating
          }
        });
    
        // Save the updated answer sheet back to the database
        await answerCollection.updateOne(
          { _id: new ObjectId(answerSheetId) },
          { $set: { answers: answerSheet.answers } }
        );
    
        res.status(201).send({ message: 'Ratings submitted successfully' });
      } catch (error) {
        console.error("Error submitting ratings:", error);
        res.status(500).send({ message: "Error submitting ratings" });
      }
    });


    // ------------Rating---------------------

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// -----------------MongoDB Connections Ends here ---------------------------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('Template server is running');
});

app.listen(port, () => {
  console.log(`Server is Running at ${port}`);
});
