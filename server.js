const http = require('http');
const app = require('./app')

// port which the code will run
// Can be gotten thru environment variable or can write it
const port = process.env.PORT || 4000;

const server = http.createServer(app);

server.listen(port);
/**
 * Server listens from the port and execute what is in t
 * the createServer()
 */
