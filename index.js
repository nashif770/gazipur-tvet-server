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
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const mainCollection = client.db("ucepComputerTrade");

    const usersCollection = mainCollection.collection("users");
    const resultCollection = mainCollection.collection("answer");
    const questionCollection = mainCollection.collection("questionCollection");
    const answerCollection = mainCollection.collection("answerSheet");
    const motdCollection = mainCollection.collection("motd"); // New collection for Message of the Day

    // ----------------- Message of the Day API -----------------

    // POST: Save or update the Message of the Day
    app.post('/motd', async (req, res) => {
      const { message } = req.body;

      if (!message) {
        return res.status(400).send({ message: 'Message of the Day is required' });
      }

      try {
        // Upsert the message (update if exists, otherwise insert)
        const result = await motdCollection.updateOne(
          {},
          { $set: { message } },
          { upsert: true }
        );

        res.status(200).send({ message: 'Message of the Day saved successfully', result });
      } catch (error) {
        console.error("Error saving Message of the Day:", error);
        res.status(500).send({ message: 'Error saving Message of the Day' });
      }
    });

    // GET: Retrieve the Message of the Day
    app.get('/motd', async (req, res) => {
      try {
        const motd = await motdCollection.findOne({});
        if (!motd) {
          return res.status(404).send({ message: 'No Message of the Day found' });
        }
        res.status(200).send({ message: motd.message });
      } catch (error) {
        console.error("Error fetching Message of the Day:", error);
        res.status(500).send({ message: 'Error fetching Message of the Day' });
      }
    });

    // ----------------- Other APIs -----------------

    // Users related API
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

    // MCQ Answer related API
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

    // Written Question related API
    app.post('/questions', async (req, res) => {
      const { title, selectedQuestions, date, time, day } = req.body;
      if (!title || !Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
        return res.status(400).send({ message: 'Title and at least one question are required' });
      }
      try {
        const questionToInsert = { title, selectedQuestions, date, time, day };
        const result = await questionCollection.insertOne(questionToInsert);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting question:", error);
        res.status(500).send({ message: 'Error saving question' });
      }
    });

    app.get('/questions', async (req, res) => {
      try {
        const result = await questionCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).send({ message: 'Error fetching questions' });
      }
    });

    // Submit answer sheet
    app.post('/submitAnswers', async (req, res) => {
      const { title, answers, username, date, time, day } = req.body;
      try {
        const result = await answerCollection.insertOne({ title, answers, username, date, time, day });
        res.status(201).send({ message: "Answers submitted successfully", result });
      } catch (error) {
        console.error("Error saving answers:", error);
        res.status(500).send({ message: "Error saving answers" });
      }
    });

    app.get('/submittedAnswers', async (req, res) => {
      try {
        const result = await answerCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching submitted answers:", error);
        res.status(500).send({ message: 'Error fetching submitted answers' });
      }
    });

    // ------------ Ratings -----------------
    app.post('/submitRatings', async (req, res) => {
      const { answerSheetId, ratings } = req.body;
      try {
        if (!ObjectId.isValid(answerSheetId)) {
          return res.status(400).send({ message: `Invalid ObjectId: ${answerSheetId}` });
        }
        const answerSheet = await answerCollection.findOne({ _id: new ObjectId(answerSheetId) });
        if (!answerSheet) {
          return res.status(404).send({ message: 'Answer sheet not found' });
        }
        answerSheet.answers.forEach((answer, index) => {
          if (ratings[index] !== undefined) {
            answer.rating = ratings[index];
          }
        });
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

    // Ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
run().catch(console.dir);

// -----------------MongoDB Connections Ends here ---------------------------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('Template server is running');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
