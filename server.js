import express from 'express';
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);
const rooms = ["a", "b", "c"]
let counter = 0
const __dirname = dirname(fileURLToPath(import.meta.url))

io.on("connection", (socket) => {
    console.log("A user connected!", socket.id, " in room ", rooms[counter % 3]);
    socket.join(rooms[counter++ % 3])
    socket.emit("rooms", rooms);
    socket.on("chat message", (msg, room) => {
        console.log("recieved:", msg);
        io.to(room).emit("chat message", msg)
    });
    // socket.on("join", (room) => {

    // })
    socket.onAny((eventName, ...args) => {
        console.log("New message on ", eventName, " with args: ", args);
    });
    socket.onAnyOutgoing((eventName, ...args) => {
        console.log("Sent message on ", eventName, " with args: ", args);
    });
});
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'))
});

server.listen(3000, () => {
    console.log("Server is running!");
});