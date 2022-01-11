const express = require('express');
const app = express()
const Web3 = require('web3')
const path = require('path')
const web3 = new Web3('wss://speedy-nodes-nyc.moralis.io/93e71caa8ab187deaacaf849/bsc/testnet/ws')
const { ABIS } = require('./abis')
const socketIO = require("socket.io");
var abiDecoder = require('abi-decoder');


abiDecoder.addABI(ABIS.test.PancakeSwapRouterABI);

app.use(express.static(path.join(__dirname, "public")));

const http = require("http");
const server = http.createServer(app);

const io = socketIO(server);
const PancakeSwapRouter = '0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3'
const WBNB = '0xae13d989dac2f0debff460ac112a837c89baa7cd'
const PancakeSwapFactory = '0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc'

const pancakeswapContract = new web3.eth.Contract(ABIS.test.PancakeSwapRouterABI, PancakeSwapRouter);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var datas = {};
var subs = undefined;

var subsNewPair;
function startNewPairCreated() {
    const factoryContract = new web3.eth.Contract(ABIS.test.PancakeSwapFactoryABI, PancakeSwapFactory)
    subsNewPair = factoryContract.events.PairCreated({}).on('data', _event => {
        if (io.sockets.adapter.rooms.get('newpair'))
            io.to('newpair').emit('newpair', { token1: _event.returnValues.token0, token2: _event.returnValues.token1 })
        else
            subsNewPair.unsubscribe(() => {
                subsNewPair = undefined;
            });
        //console.log(, _event.returnValues.pair)
    })
}

//io.sockets.adapter.rooms.get('newpair')
io.on("connection", (socket) => {
    console.log('new');
    socket.on('disconnect', () => {
        if (!io.sockets.adapter.rooms.get('newpair'))
            if (subsNewPair)
                subsNewPair.unsubscribe(() => {
                    subsNewPair = undefined;
                });
    })


    socket.on('newpair', async (data) => {
        if (data == 'stop') {
            await socket.leave('newpair')
            if (!io.sockets.adapter.rooms.get('newpair'))
                subsNewPair.unsubscribe(() => {
                    subsNewPair = undefined;
                });
        } else {
            socket.join('newpair')
            if (!subsNewPair)
                startNewPairCreated()
        }
    })


    socket.on('decode', data => {
        if (data.type == 'logs') {
            abiDecoder.addABI(data.abi);
            socket.emit('decoded', abiDecoder.decodeLogs(data.logs))
        } else if (data.type == 'methods') {
            abiDecoder.addABI(data.abi);
            socket.emit('decoded', abiDecoder.decodeMethod(data.methods))
        }
    })
    socket.on('snipe', async (data) => {
        datas[socket.id] = data
        var wait = false;
        try {
            await pancakeswapContract.methods.getAmountsOut(web3.utils.toWei('1', 'ether'), [data.token, WBNB]).call()
        } catch (er) {
            if (er.message.includes('INSUFFICIENT_LIQUIDITY')) {
                wait = true;
            }
        }

        if (wait) {
            socket.emit('action', { type: 'waiting-liquidity' })
            pendingTransactionsCallbacks.push(async (transaction) => {
                if (!transaction) return;
                if (!transaction.to) return;

                if (transaction.to.toLowerCase() == PancakeSwapRouter.toLowerCase()) {
                    var params = abiDecoder.decodeMethod(transaction.input)
                    if (params.name == 'addLiquidityETH' && params.params[0].value.toLowerCase() == datas[socket.id].token.toLowerCase()) {
                        while (true) {
                            var r = await web3.eth.getTransaction(transaction.hash);
                            if (r.blockNumber != null) {
                                socket.emit('action', { type: 'start', data: datas[socket.id] })
                                pendingTransactionsCallbacks = [];
                                break;
                            } else {
                                await sleep(100);
                            }
                        }
                    }
                }
            })
            if (!subscription)
                startSubscription()
        } else {
            socket.emit('action', { type: 'start', data: datas[socket.id] })
        }

    })
});


var pendingTransactionsCallbacks = []
var subscription = undefined;




function startSubscription() {
    subscription = web3.eth.subscribe('pendingTransactions', function (error, result) { })
        .on("data", async function (transactionHash) {
            web3.eth.getTransaction(transactionHash)
                .then(async function (transaction) {
                    if (!transaction) return;
                    if (pendingTransactionsCallbacks.length)
                        for (var i of pendingTransactionsCallbacks) i(transaction)
                    else {
                        if (subscription)
                            subscription.unsubscribe(function (error, success) {
                                if (success)
                                    subscription = undefined
                            });
                    }
                });
        })
}

app.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'index-main.html'))
})

app.get('/detectNew', (req, res) => {
    res.status(200).sendFile(path.join(__dirname, 'public', 'detectNew.html'))
})


server.listen(80)