const http = require("http");
const WebSocketServer = require("websocket").server;

const server = http.createServer();
const wsServer = new WebSocketServer({
  httpServer: server,
});

const connections = {}; 

wsServer.on("request", (request) => {
  const connection = request.accept(null, request.origin);
  console.log("New connection accepted.");

  connection.on("message", (message) => {
    if (message.type === "utf8") {
      try {
        const data = JSON.parse(message.utf8Data);
        handleMessage(connection, data);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }
  });

  connection.on("close", (reasonCode, description) => {
    console.log(
      "Connection closed:",
      connection.remoteAddress,
      reasonCode,
      description
    );
    for (const streamId in connections) {
      if (connections[streamId] === connection) {
        delete connections[streamId];
        break;
      }
    }
  });
});

function handleMessage(connection, data) {
  switch (data.type) {
    case "SignIn": {
      const { streamId } = data;
      console.log(
        `Client ${connection.remoteAddress} signed in with StreamID: ${streamId}`
      );
      connections[streamId] = connection;
      break;
    }
    case "Offer":
    case "Answer":
    case "IceCandidates": {
      const { streamId, target, data: payload } = data;
      const targetConnection = connections[target];
      if (targetConnection) {
        sendMessage(targetConnection, { ...data, data: payload });
      } else {
        console.log(`Target ${target} not found.`);
      }
      break;
    }
    case "WatchStream": {
    console.log("WatchStream:", data);
      const { streamId,clientId } = data;
      const targetConnection = connections[streamId];
      console.log(`Client ${connection.remoteAddress} watching stream ${streamId}, ${clientId}`);
      if (targetConnection) {
        sendMessage(targetConnection, {
          type: "ViewerJoined",
          streamId: streamId,
        target: "viewer-1"
        });
      } else {
        sendMessage(connection, { type: "Error", message: "Stream not found" });
      }
      break;
    }
    case "StartStreaming": {
        const { streamId } = data;
        console.log(`Client ${connection.remoteAddress} started streaming with StreamID: ${streamId}`);
        for (const clientId in connections) {
            if (clientId !== streamId) {
            sendMessage(connections[clientId], {
                type: "StreamStarted",
                streamId: streamId,
            });
            }
        }
        break;
        }
    default:
      console.log("Unknown message type:", data.type);
      break;
  }
}

function sendMessage(connection, message) {
  if (connection.connected) {
    connection.sendUTF(JSON.stringify(message));
  }
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
