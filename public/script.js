Number.prototype.realValue = function () {
    return this.toString().replace(/^([+-])?(\d+).?(\d*)[eE]([-+]?\d+)$/, function (x, s, n, f, c) {
        var l = +c < 0, i = n.length + +c, x = (l ? n : f).length,
            c = ((c = Math.abs(c)) >= x ? c - x + l : 0),
            z = (new Array(c + 1)).join("0"), r = n + f;
        return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
    });
};

const Id = (id) => { return document.getElementById(id) };
const socket = io();
function snipe() {
    connectWallet()
    Id('snipe-btn').innerHTML = 'Wait';
    Id('snipe-btn').setAttribute('onclick', '');
    socket.emit('snipe', { token: Id('tokenAddress').value, amount: Id('amount').value, wallets: Id('wallets').value, numberOfTransaction: Id('numberOfTransaction').value, slippage: Id('slippage').value, afterSnipe: Id('afterSnipeFundsOut').checked })
}

socket.on('action', (data) => {
    if (data.type == 'waiting-liquidity') {
        Id('logs').innerHTML += `<p style='color:yellow'>Waiting For Liquidity<p>`
    } else if (data.type == 'start') {
        snipeNow(data);
    }
})

async function snipeNow(data) {
    connectWallet();
    currentData = data.data;
    account = _web3.eth.accounts.privateKeyToAccount(getCookie('account-p'));
    var sniperContract = new _web3.eth.Contract(sniperABI, sniperAddress);
    var s = await sniperContract.methods.snipePancakeSwap(data.data.token, _web3.utils.toWei(data.data.amount, 'ether'), data.data.wallets.trim().split(','), data.data.numberOfTransaction + "", data.data.slippage, data.data.afterSnipe);
    params = {
        from: account.address,
        to: sniperAddress,
        data: s.encodeABI(),
        gas: '2100000',
        value: '0',
    }
    var signedTxn = await account.signTransaction(params)
    _web3.eth.sendSignedTransaction(signedTxn.rawTransaction, (err, hash) => {
        Id('logs').innerHTML += `<p style='color:yellow'>Pending transaction !</p><p class='copy' onclick='cp(this)'>${hash}</p>`
    }).once('receipt', (r) => {
        socket.emit('decode', { type: 'logs', abi: sniperABI, logs: r.logs })
        afterDecode = (data) => {
            if (data[0].name == 'TokenBuyed') {
                buyedToken = data[0].events[0].value
                Id('selling').style.display = ''
                Id('token-info').style.display = ''
                Id('buying').style.display = 'none'
                Id('current-tokens').innerHTML = (buyedToken / 10 ** 18).toFixed(5)
                invested = Number(currentData.amount) * Number(currentData.numberOfTransaction) * currentData.wallets.split(',').length
                refreshPrices();
            }
        }
        Id('logs').innerHTML += `<p style='color:green'>Done Sniping !</p><p class='copy' onclick='cp(this)'>${r.transactionHash}</p>`
    }).on('error', (er) => {
        Id('logs').innerHTML += `<p style='color:red'>Transaction Failed !</p><p class='copy' onclick='cp(this)'>${er.receipt.transactionHash}</p>`
    })
}



async function sellNow() {
    account = _web3.eth.accounts.privateKeyToAccount(getCookie('account-p'));
    var sniperContract = new _web3.eth.Contract(sniperABI, sniperAddress);
    var s = await sniperContract.methods.sellTokens(currentData.token, sellParams.slippage, sellParams.transferTo);
    params = {
        from: account.address,
        to: sniperAddress,
        data: s.encodeABI(),
        gas: '2100000',
        value: '0',
    }
    var signedTxn = await account.signTransaction(params)
    _web3.eth.sendSignedTransaction(signedTxn.rawTransaction, (err, hash) => {
        Id('logs').innerHTML += `<p style='color:yellow'>Pending transaction !</p><p class='copy' onclick='cp(this)'>${hash}</p>`
    }).once('receipt', (r) => {
        Id('logs').innerHTML += `<p style='color:green'>Sold !</p><p class='copy' onclick='cp(this)'>${r.transactionHash}</p>`
    }).on('error', (er) => {
        Id('logs').innerHTML += `<p style='color:red'>Transaction Failed !</p><p class='copy' onclick='cp(this)'>${er.receipt.transactionHash}</p>`
    })
}




var ee;
var PancakeSwapRouter = undefined;
var currentData;
var buyedToken;
var invested;



async function refreshPrices() {
    if (!PancakeSwapRouter)
        PancakeSwapRouter = new _web3.eth.Contract(PancakeSwapRouterABI, router);
    var iInvested = _web3.utils.toWei(invested + "", 'ether');
    var amountOut = (await PancakeSwapRouter.methods.getAmountsOut(_web3.utils.toHex(buyedToken), [currentData.token, WBNB]).call())[1];
    Id('token-price').innerHTML = (((await PancakeSwapRouter.methods.getAmountsOut(_web3.utils.toHex(_web3.utils.toWei('1', 'ether')), [WBNB, currentData.token]).call())[1]) / 10 ** 18).toFixed(7)
    Id('getamountout').innerHTML = ((amountOut) / (10 ** 18)).toFixed(7)
    var profit = ((Number(amountOut) - Number(iInvested)) / Number(iInvested)) * 100
    Id('profit').innerHTML = profit.toFixed(3) + '%'
    if (sellParams) {
        if (sellParams.at <= profit) {
            sellNow();
        }
    }
    setTimeout(refreshfund, 1000)
}


var afterDecode = undefined;
socket.on('decoded', (data) => {
    if (afterDecode)
        afterDecode(data)
})
var _web3;
Id('connect-wallet').onclick = () => {
    connectWallet();
}




function cp(e) {

    var copyText = document.createElement("input");
    copyText.value = e.innerHTML
    copyText.type = 'text'
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);

    alert('Copied!')
}

async function connectWallet() {
    if (!window.ethereum) {
        alert('You need metamask wallet extension to connect !');
    } else {

        try {
            await window.ethereum.send('eth_requestAccounts')
            Id('connect-wallet').innerHTML = 'Connected'
            Id('connect-wallet').setAttribute('onclick', 'paynow()')
            _web3 = new Web3(window.ethereum);
            refreshfund();
        } catch (er) {
            if (er.code == 4001) {
                alert('Not Connected!')
            }
        }

    }
}
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
Id('add-funds').onclick = () => { addFunds() }
var account;
async function addFunds() {
    if (getCookie('account') == '') {
        account = _web3.eth.accounts.create();
        setCookie('account', account.address)
        setCookie('account-p', account.privateKey)
    } else {
        account = { address: getCookie('account'), privateKey: getCookie('account-p') }
    }
    console.log('here')
    account = _web3.eth.accounts.privateKeyToAccount(account.privateKey);
    var sniperContract = new _web3.eth.Contract(sniperABI, sniperAddress);
    sniperContract.methods.addFunds(account.address).send(
        {
            from: window.web3.currentProvider.selectedAddress,
            to: sniperAddress,
            value: _web3.utils.toWei(Id('amount-for-funds').value, 'ether'),
            gasPrice: '20000000000'
        }).then(s => {
            refreshfund();
            Id('logs').innerHTML += `<p style="color: green;">Funds Added !</p>`
        }).catch(er => {
            refreshfund();
            Id('logs').innerHTML += `<p style="color: red;">Transaction Failed !</p><p onclick='cp(this)' class='copy'>${er.receipt.transactionHash}</p>`
        }
        )
}



async function refreshfund() {

    Id('current-fund').innerHTML = `<p>Current Fund In Contract Sniper: ${((await _web3.eth.getBalance(sniperAddress)) / 10 ** 18).toFixed(5)}</p><p>Current Fund In Account Caller: ${((await _web3.eth.getBalance(getCookie('account'))) / 10 ** 18).toFixed(5)}</p>`;
    if (getCookie('account')) {
        Id('wallet-cokkie').value = getCookie('account')
    }
}

var sellParams = {};
async function sellAt() {
    sellParams.privateKeys = Id('private').value.split(',')
    sellParams.transferTo = Id('transferETHtoAddress').value
    sellParams.slippage = Id('slippage').value
    sellParams.at = Id('sellAt').value
    Id('sell-btn').disabled = true

    var tokenContract = new _web3.eth.Contract(STANDARD_TOKEN_ABI, currentData.token);
    for (var i of sellParams.privateKeys) {
        var _account = _web3.eth.accounts.privateKeyToAccount(i);

        var s = await tokenContract.methods.transfer(sniperAddress, (await tokenContract.methods.balanceOf(_account.address).call()));
        params = {
            from: _account.address,
            to: currentData.token,
            data: s.encodeABI(),
            gas: '2100000',
            value: '0',
        }
        var signedTxn = await _account.signTransaction(params)
        _web3.eth.sendSignedTransaction(signedTxn.rawTransaction, (err, hash) => {
            Id('logs').innerHTML += `<p style="color: yellow;">Pending Transaction</p><p onclick='cp(this)' class='copy'>${hash}</p>`
        }).once('receipt', (r) => {
            Id('logs').innerHTML += `<p style="color: green;">Token Transfered to Contract</p><p onclick='cp(this)' class='copy'>${r.transactionHash}</p>`
        }).on('error', (er) => {
            Id('logs').innerHTML += `<p style="color: red;">Failed Transfer</p><p onclick='cp(this)' class='copy'>${er.receipt.transactionHash}</p>`
        })
    }
}



