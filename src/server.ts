import server from './app';

// ℹ️ Sets the PORT for our app to have access to it. If no env has been set, we hard code it to 5005
const PORT = process.env.PORT || 5005;

// ℹ️ If connection was successful, start listening for requests
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
