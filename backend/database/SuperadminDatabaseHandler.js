const { MongoClient } = require("mongodb");

// Use environment variables for sensitive information
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://praveenkr:Praveen2006@cluster0.iooxltd.mongodb.net/AmasQIS";
const client = new MongoClient(uri);

let stats;
let companies;

const connectDB = async () => {
  try {
    await client.connect();
    console.log("Connected with AmasQIS DB -> Done");
    stats = client.db("AmasQIS").collection("stats"); // Corrected to get the collection from the database
    companies = client.db("AmasQIS").collection("companies");
  } catch (error) {
    console.error("Database Error Occurred ->", error);
  }
};

const Package_stats = async (userID) => {
  if (!stats) {
    console.log("Database Stats not connected");
    return;
  }

  try {
    const data = await stats.findOne({ stats_id: "AmasQis011" });
    console.log(data);
    return data.packages;
  } catch (error) {
    console.error("Error retrieving stats data ->", error);
  }
};

const Company_add = async (userID) => {
  if (!companies) {
    console.log("Database Stats not connected");
    return;
  }
};

// Ensure the database connection is established before using Package_stats
connectDB().then(() => {
  // Example usage
  Package_stats("someUserID");
});

// Close the connection when done (e.g., when the application exits)
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

module.exports = { Package_stats, connectDB, Company_add };
