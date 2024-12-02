import express from 'express';
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Server } from 'socket.io';
import { createClient } from 'redis'

const app = express();
const server = createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });
const client = await new createClient()
    .on('error', err => console.log("redis error", err))
    .connect();


const rooms = ["a", "b", "c"];
let counter = 0;
let msgOffset = 0;
const __dirname = dirname(fileURLToPath(import.meta.url))

io.on("connection", (socket) => {
    socket.emit("chat message", "Connected: " + socket.recovered)
    if (!socket.recovered)
        if (socket.handshake.auth.roomName) {
            socket.join(socket.handshake.auth.roomName)
            console.log("Recovering room", socket.id, socket.handshake.auth.roomName, socket.handshake.auth.msgOffset, (msgOffset))
            for (let i = socket.handshake.auth.msgOffset + 1; i <= msgOffset; i++) {
                client.get(i + "").then(msg => {
                    console.log("Sending buffered msg", i)
                    socket.emit("chat message", JSON.stringify(msg))
                })

            }
        } else {
            let assignedRoom = counter % 3
            console.log("A user connected!", socket.id, socket.recovered, " in room ", rooms[assignedRoom]);
            socket.join(rooms[assignedRoom])
            socket.emit("set_room", rooms[assignedRoom])
            counter++
            socket.emit("rooms", rooms);
        }
    socket.on("chat message", (msg, room) => {
        io.to(room).emit("chat message", msg, ++msgOffset)
        client.set(msgOffset + "", msg).then().catch(err => {
            console.log("error while storing in redis", err, msg, room);
        });
    });
    socket.onAny((eventName, ...args) => {
        console.log("New message on ", eventName, " with args: ", args);
    });
    socket.onAnyOutgoing((eventName, ...args) => {
        console.log("Sent message on ", eventName, " with args: ", args);
    });
});
io.on("disconnect", () => {
    console.log("Disconnect socket io");
    client.disconnect();
});
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'))
});

server.listen(3000, () => {
    console.log("Server is running!");
});