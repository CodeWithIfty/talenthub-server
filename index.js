const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://talenthub-c77ac.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
    client.connect();

    const jobsCollections = client.db("talenthubDB").collection("services");
    const bidsCollections = client.db("talenthubDB").collection("bids");

    // MiddleWare
    const verifyUser = (req, res, next) => {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).send({ message: "You are not Authorized" });
      }
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "You are not Authorized" });
        }
        req.user = decoded;
        next();
      });
    };
    // Auth Related Api

    app.post("/api/auth/access-token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign({ user }, process.env.SECRET_KEY, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    //Get jobs by category
    app.get("/api/jobs", async (req, res) => {
      try {
        const category = req.query.category;
        const email = req.query.email;
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const pageSize = parseInt(req.query.pageSize) || 10;

        const skip = (page - 1) * pageSize;

        const query = {};
        if (category) {
          query.category = category;
        }
        if (email) {
          query["clientInfo.email"] = email;
        }

        const totalCount = await jobsCollections.countDocuments(query);

        const result = await jobsCollections
          .find(query)
          .skip(skip)
          .limit(pageSize)
          .toArray();
        res.send({ totalCount, result });
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
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollections.findOne(query);
      res.send(result);
    });

    //Post a job
    app.post("/api/job", verifyUser, async (req, res) => {
      try {
        const job = req.body;
        const result = await jobsCollections.insertOne(job);
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });

    //Delete a job
    app.delete("/api/job/:_id", verifyUser, async (req, res) => {
      try {
        const id = req.params._id;
        const query = { _id: new ObjectId(id) }; // Convert the id to ObjectId
        const result = await jobsCollections.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send("Job deleted successfully");
        } else {
          res.status(404).send("Job not found");
        }
      } catch (error) {
        console.error("Error:", error);
        res
          .status(500)
          .send("An error occurred while processing your request.");
      }
    });

    // Update job by id
    app.put("/api/job/:_id", verifyUser, async (req, res) => {
      const id = req.params._id;
      const updatedJobData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateProduct = {
        $set: {
          jobTitle: updatedJobData.jobTitle,
          deadline: updatedJobData.deadline,
          jobDescription: updatedJobData.jobDescription,
          category: updatedJobData.category,
          maxPrice: updatedJobData.maxPrice,
          maxPrice: updatedJobData.maxPrice,
        },
      };
      const result = await jobsCollections.updateOne(
        filter,
        updateProduct,
        options
      );
      res.send(result);
    });

    // Post bid
    app.post("/api/bid", verifyUser, async (req, res) => {
      try {
        const job = req.body;
        const result = await bidsCollections.insertOne(job);
        res.send(result);
      } catch (err) {
        res.send(err);
      }
    });

    // get bid by email
    app.get("/api/bids", verifyUser, async (req, res) => {
      try {
        const userEmail = req.query.userEmail;
        const clientEmail = req.query.clientEmail;

        if (userEmail) {
          const query = { "userInfo.email": userEmail };
          const result = await bidsCollections.find(query).toArray();
          res.send(result);
          return;
        }
        if (clientEmail) {
          const query = { "clientInfo.email": clientEmail };
          const result = await bidsCollections.find(query).toArray();
          res.send(result);
          return;
        }
      } catch (error) {
        console.error("Error:", error);
        res
          .status(500)
          .send("An error occurred while processing your request.");
      }
    });

    //update status
    app.put("/api/bid/:_id", verifyUser, async (req, res) => {
      const id = req.params._id;
      const updatedStatus = req.body;
      const filter = { _id: new ObjectId(id) };

      const updateProduct = {
        $set: {
          status: updatedStatus.status,
        },
      };
      const result = await bidsCollections.updateOne(filter, updateProduct);
      res.send(result);
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
