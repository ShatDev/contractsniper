const Id = (id) => { return document.getElementById(id) }
const socket = io();
function snipe() {
    socket.emit('snipe-wallet', {
        address: Id('tokenAddress').value,
        wallet: Id('walletAddress').value,
        fun: Id('function').value,
        amount: Id('amount').value,
        private: Id('wallets').value,
        gasAmount: Id('gasAmount').value
    })
}


socket.on('log', (data) => {
    Id('logs').innerHTML += data
})