// Imports
import { MongoClient } from 'mongodb'
import * as fs from'fs';

// Cofinguration File
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
let dbName = config.db.match(/\/[^\/]*?$/)[0];
dbName = dbName.substring(1, dbName.lenght);

// Start Function
export async function startConnectionDB() {
	// Get URI
	const uri = config.db;
	
	// Start mongo client
	const client = new MongoClient(uri);

	// Start connection
	await client.connect().catch(console.error);

	// Get DB
	const db = client.db(dbName);

	// Get Collection
	const collection = db.collection('links');

	// Start Index the texts
	collection.createIndex( { "$**": "text" } )

	// Return collection
	return collection;
}