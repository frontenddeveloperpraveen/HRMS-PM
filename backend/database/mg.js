async function main() {
  try {
    // Insert the document into the collection
    const result = await collection.insertOne(employeeDocument);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
