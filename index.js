const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require('stripe')(process.env.SECRET_PAYMENT_KEY);
// Middleware
app.use(
  cors({
      origin: ['http://localhost:5173', 'https://asset-management-a12.web.app'],
      credentials: true,
  }),
)
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is Runing................')
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w7mc7t5.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();

    const AssetCollection = client.db("Asset-Management").collection("Asset");
    const EmployeeCollection = client.db("Asset-Management").collection("Users");
    const RequestCollection = client.db("Asset-Management").collection("Requests");
    const PkgCollection = client.db("Asset-Management").collection("pkg");
    const PaymentCollection = client.db("Asset-Management").collection("Payment");
    const ProjectCollection = client.db("Asset-Management").collection("Project");
    const ReportCollection = client.db("Asset-Management").collection("Report");

     // jwt related api
     app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    
    // JWT Midleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await EmployeeCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };



    
    // pkg
    app.get("/pkgs", async (req, res) => {
      const result = await PkgCollection.find().toArray();
      res.send(result);
    });
    app.get('/pkgs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await PkgCollection.findOne(query);
      res.send(result);
    })
// Asset Informations
    app.get("/Asset", async (req, res) => {
      const result = await AssetCollection.find().toArray();
      res.send(result);
    });
    app.get('/Asset/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await AssetCollection.findOne(query);
      res.send(result);
    })
    app.patch('/Asset/:id', verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const asset  = req.body;
      const update = {
        $set: {
          name: asset.name,
          type: asset.type,
          price: asset.price,
          quantity: asset.quantity,
      }
      }
      const result = await AssetCollection.updateOne(filter, update,);
      res.send(result)
           });
    
    app.post("/Asset",verifyToken,verifyAdmin, async (req, res) => {
      const asset = req.body;
      const result = await AssetCollection.insertOne(asset);
      res.send(result);
    });
    app.delete('/Asset/:id',verifyToken,verifyAdmin, async(req , res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AssetCollection.deleteOne(query);
      res.send(result);
    })


    // Request
    app.get("/Request", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { useremail: req.query.email }
      }
      const result = await RequestCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/Request/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const status = req.body.Status;
      const AppDate = req.body.AppDate;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { Status: status, AppDate:AppDate } };
      const result = await RequestCollection.updateOne(query, update);
      res.send(result);
    });
    
    app.post("/Request", verifyToken, async (req, res) => {
      const asset = req.body;
      const result = await RequestCollection.insertOne(asset);
      res.send(result);
    });
    app.delete('/Request/:id',verifyToken, async(req , res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await RequestCollection.deleteOne(query);
      res.send(result);
    })
    

    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query?.logo) {
        query = { logo: req.query.logo }
      }
      const result = await EmployeeCollection.find(query).toArray();
      res.send(result);
    });
    app.patch('/user/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      console.log(id)
      const filter = { _id: new ObjectId(id) }
      const user  = req.body;
      const update = {
        $set: {
          name: user.fullName,
      }
      }
      const result = await EmployeeCollection.updateOne(filter, update,);
      res.send(result)
           });
    
    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }

      const query = { email: email };
      const user = await EmployeeCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post("/users", async (req, res) => {
      const user = req.body;
      // verefy User Email Adress
      const query = { email: user.email };
      const existingUser = await EmployeeCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await EmployeeCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/:id", verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          CompanyName: req.body.CompanyName,
          logo: req.body.logo,
        },
      };
      const result = await EmployeeCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

     // payment intent
     app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
    

    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await PaymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await PaymentCollection.insertOne(payment);

      console.log('payment info', payment);
      // const query = {
      //   _id: {
      //     $in: payment.cartIds.map(id => new ObjectId(id))
      //   }
      // };

      // const deleteResult = await cartCollection.deleteMany(query);

      // res.send({ paymentResult, deleteResult });
      res.send({ paymentResult});
    })

    app.get("/Project", async (req, res) => {
      const result = await ProjectCollection.find().toArray();
      res.send(result);
    });
    app.post("/Project", async (req, res) => {
      const asset = req.body;
      const result = await ProjectCollection.insertOne(asset);
      res.send(result);
    });

    app.get("/Reports", async (req, res) => {
      const result = await ReportCollection.find().toArray();
      res.send(result);
    });
    app.post("/Reports",  async (req, res) => {
      const asset = req.body;
      const result = await ReportCollection.insertOne(asset);
      res.send(result);
    });
    app.delete('/Reports/:id', async(req , res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ReportCollection.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run()
.catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})