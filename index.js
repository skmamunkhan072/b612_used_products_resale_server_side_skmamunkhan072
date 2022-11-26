const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// mongodb url
const uri = process.env.DATABAS_URL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt token function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    //Collection create
    const usersCollection = client
      .db("laptops_second_hand_products")
      .collection("users");
    const allProductsCategoryNameCollection = client
      .db("laptops_second_hand_products")
      .collection("all_products_category_name");
    const allProductsCategoryCollection = client
      .db("laptops_second_hand_products")
      .collection("all_products");

    //  user create database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Jwt token crate function
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // products category create
    app.get("/all-products-category/", async (req, res) => {
      const authHeader = req?.headers?.authorization;
      const id = req?.query?.categoryId;
      var query = {};
      //jwt token verify
      if (id && authHeader) {
        var query = { _id: ObjectId(id) };
        if (!authHeader) {
          return res.status(401).send("unauthorized access");
        }
        const token = authHeader.split(" ")[1];
        let error = false;
        if (!token) {
          return res.status(403).send({ message: "forbidden access" });
        }
        jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
          if (err) {
            return (error = true);
          }
        });
        if (error) {
          return res.status(403).send({ message: "forbidden access" });
        }
      }
      const result = await allProductsCategoryNameCollection
        .find(query)
        .toArray();
      res.send(result);
    });

    // products add database
    app.post("/add-product", verifyJWT, async (req, res) => {
      const product = req.body;
      // console.log(product, "hit korcea");
      const result = await allProductsCategoryCollection.insertOne(product);
      console.log(result);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("laptops second hand products server  is running");
});

app.listen(port, () =>
  console.log(`laptops second hand products server running on ${port}`)
);
