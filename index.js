const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k4mfqh2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // client.connect();

    const servicesCollections = client.db("talenthubDB").collection("services");

    //Get jobs by category
    app.get("/api/jobs", async (req, res) => {
      try {
        const category = req.query.category;
        const email = req.query.email;
        const query = {};
        if (category) {
          query.category = category;
        }
        if (email) {
          query["clientInfo.email"] = email;
        }
        const result = await servicesCollections.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error:", error);
        res
          .status(500)
          .send("An error occurred while processing your request.");
      }
    });

    //Get job by _id
    app.get("/api/job/:_id", async (req, res) => {
      const id = req.params._id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollections.findOne(query);
      res.send(result);
    });

    app.post("/api/job", async (req, res) => {
      try {
        const job = req.body;
        const result = await servicesCollections.insertOne(job);
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
