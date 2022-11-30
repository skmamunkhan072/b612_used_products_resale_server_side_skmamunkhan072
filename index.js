const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

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
    const bookingProductsCollection = client
      .db("laptops_second_hand_products")
      .collection("all_booking_products");

    //  user create database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // all user get function
    app.get("/users", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = {};
      const admin = await usersCollection.findOne({ email });
      const result = await usersCollection.find(query).toArray();
      const data = result?.filter((user) => user.email !== email);
      if (admin?.selectedRole === "admin") {
        return res.send(data);
      }
      res.status(403).send({ message: "forbidden access" });
    });

    // one user
    app.get("/user", async (req, res) => {
      const loginUserEmail = req.query.email;
      const loginUserQuery = { email: loginUserEmail };
      const result = await usersCollection.findOne(loginUserQuery);
      res.send(result);
    });
    // user verify
    app.put("/user/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          sellersVerify: true,
        },
      };
      const userverify = await usersCollection.updateOne(
        query,
        updateDoc,
        options
      );
      const user = await usersCollection.findOne(query);
      const emailQuery = user?.email;
      const result = await allProductsCategoryCollection.updateMany(
        { email: emailQuery },
        updateDoc,
        options
      );

      // for (const product of result) {
      // }
      console.log(result);
      res.send(result);
    });

    // user delete function
    app.delete("/user/:id", async (req, res) => {
      const userId = req.params.id;
      const result = await usersCollection.deleteOne({ _id: ObjectId(userId) });
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
      const query = {};
      const result = await allProductsCategoryNameCollection
        .find(query)
        .toArray();
      res.send(result);
    });
    //category products
    app.get("/category-products/:id", async (req, res) => {
      const id = req.params.id;
      const categoryQuery = { _id: ObjectId(id) };
      const category = await allProductsCategoryNameCollection.findOne(
        categoryQuery
      );
      const query = { Category: category?.categoryName };
      const result = await allProductsCategoryCollection.find(query).toArray();
      const resultData = result.filter((data) => data?.product !== "paid");
      res.send(resultData);
    });
    // 41bb
    // products add database
    app.post("/add-product", verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await allProductsCategoryCollection.insertOne(product);
      res.send(result);
    });

    // sealer products get database function
    app.get("/my-products", verifyJWT, async (req, res) => {
      const email = req?.query?.email;

      let query = {};
      if (email) {
        query = { email };
      }
      const result = await allProductsCategoryCollection.find(query).toArray();
      res.send(result);
    });

    // my product advertised
    app.put("/my-products/:id", verifyJWT, async (req, res) => {
      const itemsId = req.params.id;
      const query = { _id: ObjectId(itemsId) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          advertised: true,
        },
      };
      const result = await allProductsCategoryCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // my product delete
    app.delete("/my-products/:id", verifyJWT, async (req, res) => {
      const itemsId = req.params.id;
      const query = { _id: ObjectId(itemsId) };
      const result = await allProductsCategoryCollection.deleteOne(query);
      const booingProductDelet = await bookingProductsCollection.deleteMany({
        bookingProductId: itemsId,
      });
      console.log(booingProductDelet, result);
      res.send(result);
    });
    //book products
    app.get("/book-now/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allProductsCategoryCollection.findOne(query);
      res.send(result);
    });
    // Delete booking product items
    app.delete("/book-now/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingProductsCollection.deleteOne(query);
      res.send(result);
    });

    // booking product function
    app.post("/book-now", verifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingProductsCollection.insertOne(booking);
      res.send(result);
    });

    // booking products
    app.get("/my-booking-products", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const role = await usersCollection.findOne({ email });
      if (!role?.selectedRole === "user") {
        return res.status("043").send({ message: "forbidden access" });
      }
      const query = { email };
      const result = await bookingProductsCollection.find(query).toArray();

      const finelResult = result.filter(
        (product) => product?.payment !== "paid"
      );
      res.send(finelResult);
    });

    // AdvertisedItems function
    app.get("/advertised-items", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email, advertised: true };
      const result = await allProductsCategoryCollection.find(query).toArray();
      res.send(result);
    });

    //payment function products
    app.get("/dashboard/payment/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allProductsCategoryCollection.findOne(query);
      res.send(result);
    });
    // 6386ee4f5048a5da521892a1
    app.put("/dashboard/payments", verifyJWT, async (req, res) => {
      const bookingData = req?.body;
      console.log(bookingData);
      const bookingId = bookingData?.bookingId;
      const query = { _id: ObjectId(bookingId) };
      const bookingQuery = { bookingProductId: bookingId };
      const options = { upsert: true };
      const bookingDoc = {
        $set: {
          transactionId: bookingData?.transactionId,
          payment: "paid",
        },
      };
      const updateDoc = {
        $set: {
          payment: "paid",
          bookingId: bookingId,
        },
      };
      const booking = await bookingProductsCollection.updateOne(
        bookingQuery,
        bookingDoc,
        options
      );
      const result = await allProductsCategoryCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });
    //payment function
    app.post("/dashboard/payment", verifyJWT, async (req, res) => {
      const booking = req.body;
      const price = booking.resalePrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // my orders
    app.get("/my-orders", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email };
      const resultData = await bookingProductsCollection.find(query).toArray();
      const result = resultData.filter(
        (product) => product?.payment === "paid"
      );
      res.send(result);
    });

    // repot items function
    app.put("/repot-item", verifyJWT, async (req, res) => {
      const id = req?.body;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const repotItem = {
        $set: {
          productRepot: true,
        },
      };
      // allProductsCategoryCollection
      const result = await allProductsCategoryCollection.updateOne(
        query,
        repotItem,
        options
      );
      res.send(result);
    });

    // Repot items alll
    app.get("/repot-items", verifyJWT, async (req, res) => {
      const allRepotItems = await allProductsCategoryCollection
        .find({ productRepot: true })
        .toArray();

      res.send(allRepotItems);
    });
    // repoted item deleted
    app.delete("/repot-items/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const allRepotItems = await allProductsCategoryCollection.deleteOne({
        _id: ObjectId(id),
      });
      const result = await bookingProductsCollection.deleteMany({
        bookingProductId: id,
      });
      res.send(allRepotItems);
    });

    // My All Buyers
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
