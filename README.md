# URL Shortener

A simple link shortener for small management

## Prerequisites

* [Node.js](https://nodejs.org/download/release/v14.17.3/) (version 14.17.3)
* [MongoDB](https://www.mongodb.com/download-center/community) (version 4.2) and [installation instructions](https://docs.mongodb.com/manual/administration/install-community/)

## Installation

Once you have the project cloned, open your terminal of choice (Command Prompt, bash, etc), navigate to the directory you cloned the project in, and run:

```bash
npm install
```

## Setting up Database

- Install MongoDB
- Start `mongo` from command line (you may need to go to `C:\Program Files\MongoDB\Server\4.0\bin` path on windows to run the command)
- Type `use your_database_name` to create database
- Type `db.new_collection.insert({ some_key: "some_value" })` to initialize database
- Type
  ```javascript
  db.createUser(
    {
      user: "your_username",
      pwd: "your_password",
      roles: [ { role: "readWrite", db: "your_database_name" } ]
    }
  )
  ```
  to create database user.
- Type `quit()` to exit mongo

## Configuration

Add `config.json` file in root directory with following content. You can use `config-template.json` as a starting point for your own config. (do not include comments in your `config.json` file)

```javascript
{
	"port": 3000, //server working port
	"db": "mongodb://<username>:<password>@localhost:27017/<database_name>", // use values you used when setting up database
	"shortlinkdomain": "http://you.site.short.com/" //final domain that the server will run
}
```

## Running

### Run

to run the server just run the following command in the main project folder:

```bash
node server.js
```

## Customization

- `package.json` - settings for title and description of the website
- `public/css` - styles
- `public/images` - images